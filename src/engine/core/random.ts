import type {RandomnessState} from './model';
import {COMPATIBILITY_LIFE_STREAM,float} from './rng';
export function random(state:{seed:number;randomness?:RandomnessState}){
 if(state.randomness){const value=float(state.randomness,COMPATIBILITY_LIFE_STREAM,state.seed);state.seed=state.randomness.streams[COMPATIBILITY_LIFE_STREAM].state;return value;}
 state.seed=(Math.imul(state.seed,1664525)+1013904223)>>>0;return state.seed/4294967296;
}
export const clamp=(n:number,min=0,max=100)=>Math.max(min,Math.min(max,n));
