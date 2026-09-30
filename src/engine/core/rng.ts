import type {RandomnessState,RandomStreamState} from './model';

export const RNG_VERSION=1 as const;
export const COMPATIBILITY_LIFE_STREAM='compatibility.life-politics';
export const COMPATIBILITY_NATIONAL_STREAM='compatibility.uk-national';
export const COMPATIBILITY_MEREFORD_STREAM='compatibility.mereford';
const validUint=(value:unknown):value is number=>typeof value==='number'&&Number.isInteger(value)&&value>=0&&value<=0xffffffff;
const step=(seed:number)=>(Math.imul(seed,1664525)+1013904223)>>>0;
const hash=(text:string,seed:number)=>{let value=(2166136261^seed)>>>0;for(let i=0;i<text.length;i++)value=Math.imul(value^text.charCodeAt(i),16777619)>>>0;return value>>>0;};

export type RandomSource={float:()=>number};
export function createRandomness(rootSeed:number):RandomnessState{return {version:RNG_VERSION,rootSeed:rootSeed>>>0,streams:Object.create(null) as Record<string,RandomStreamState>};}
export function validRandomness(value:unknown):value is RandomnessState{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const state=value as Partial<RandomnessState>;if(state.version!==RNG_VERSION||!validUint(state.rootSeed)||!state.streams||typeof state.streams!=='object'||Array.isArray(state.streams))return false;
 return Object.entries(state.streams).every(([name,stream])=>name.length>0&&name.length<=160&&!!stream&&typeof stream==='object'&&!Array.isArray(stream)&&((stream as RandomStreamState).algorithm==='lcg32-v1')&&validUint((stream as RandomStreamState).state)&&Number.isSafeInteger((stream as RandomStreamState).cursor)&&((stream as RandomStreamState).cursor)>=0);
}
export function stream(randomness:RandomnessState,name:string,initialSeed?:number):RandomStreamState{
 if(!name||name.length>160)throw Error('Invalid random stream name.');
 const existing=Object.prototype.hasOwnProperty.call(randomness.streams,name)?randomness.streams[name]:undefined;if(existing)return existing;
 const created:RandomStreamState={algorithm:'lcg32-v1',state:(initialSeed??hash(name,randomness.rootSeed))>>>0,cursor:0};Object.defineProperty(randomness.streams,name,{value:created,writable:true,enumerable:true,configurable:true});return created;
}
export function float(randomness:RandomnessState,name:string,initialSeed?:number){const current=stream(randomness,name,initialSeed);if(current.cursor===Number.MAX_SAFE_INTEGER)throw Error('Random stream cursor is exhausted.');current.state=step(current.state);current.cursor++;return current.state/4294967296;}
export function integer(randomness:RandomnessState,name:string,min:number,max:number,initialSeed?:number){if(!Number.isInteger(min)||!Number.isInteger(max)||max<min)throw Error('Invalid integer range.');return min+Math.floor(float(randomness,name,initialSeed)*(max-min+1));}
export function chance(randomness:RandomnessState,name:string,probability:number,initialSeed?:number){if(!Number.isFinite(probability)||probability<0||probability>1)throw Error('Invalid probability.');return float(randomness,name,initialSeed)<probability;}
export function source(randomness:RandomnessState,name:string,initialSeed?:number):RandomSource{return {float:()=>float(randomness,name,initialSeed)};}
export function choose<T>(random:RandomSource,items:readonly T[]):T|undefined{return items.length?items[Math.floor(random.float()*items.length)]:undefined;}
export function weightedChoice<T extends {id:string}>(random:RandomSource,items:readonly T[],weight:(item:T)=>number):T{
 if(!items.length)throw Error('Weighted choice requires items.');let total=0;const weights=items.map(item=>{const value=weight(item);if(!Number.isFinite(value)||value<0)throw Error('Invalid weighted choice weight.');total+=value;return value;});
 if(total<=0)throw Error('Weighted choice requires a positive weight.');let draw=random.float()*total,fallback=items[0];for(let index=0;index<items.length;index++){if(weights[index]<=0)continue;fallback=items[index];if(draw<weights[index])return items[index];draw-=weights[index];}return fallback;
}
export function shuffle<T>(random:RandomSource,items:readonly T[]):T[]{const result=[...items];for(let index=result.length-1;index>0;index--){const other=Math.floor(random.float()*(index+1));[result[index],result[other]]=[result[other],result[index]];}return result;}
/** A stable contextual draw: it never creates or consumes a mutable stream. */
export function deriveFloat(rootSeed:number,key:string){if(!key||key.length>500)throw Error('Invalid random derivation key.');return step(hash(key,rootSeed>>>0))/4294967296;}
export function compatibilitySeed(randomness:RandomnessState,name:string,seed:number){return stream(randomness,name,seed).state;}
export function synchronizeCompatibilitySeed(randomness:RandomnessState,name:string,seed:number){const current=stream(randomness,name,seed);current.state=seed>>>0;return current.state;}
export function hydrateCompatibilitySeed(owner:{randomness?:RandomnessState},name:string,seed:number){return owner.randomness?compatibilitySeed(owner.randomness,name,seed):seed>>>0;}
export function recordCompatibilitySeed(owner:{randomness?:RandomnessState},name:string,seed:number){return owner.randomness?synchronizeCompatibilitySeed(owner.randomness,name,seed):seed>>>0;}
