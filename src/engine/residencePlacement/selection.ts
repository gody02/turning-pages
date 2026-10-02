import {deriveFloat} from '../core/rng';
import {derivationKey} from './data';

export const MAX_PLACEMENT_DRAW_ATTEMPTS=1024;
const RANGE=1n<<64n;
export type PlacementTicket=Readonly<{ticket:bigint;attempts:number}>;
/** Internal seam for exact boundary tests. Production evaluation supplies only keyed words. */
export function boundedPlacementTicket(total:number,word:(attempt:number,lane:0|1)=>number):PlacementTicket{
 if(!Number.isSafeInteger(total)||total<=0)throw Error('Invalid placement mass.');
 const mass=BigInt(total),limit=RANGE/mass*mass;
 for(let attempt=0;attempt<MAX_PLACEMENT_DRAW_ATTEMPTS;attempt++){
  const high=word(attempt,0),low=word(attempt,1);
  if(![high,low].every(value=>Number.isInteger(value)&&value>=0&&value<=0xffffffff))throw Error('Invalid placement derivation word.');
  const value=BigInt(high)<<32n|BigInt(low);
  if(value<limit)return {ticket:value%mass,attempts:attempt+1};
 }
 throw Error('Placement derivation exhausted its rejection guard.');
}
export function keyedPlacementTicket(rootSeed:number,requestKey:string,total:number):PlacementTicket{
 return boundedPlacementTicket(total,(attempt,lane)=>{
  const word=(part:0|1)=>BigInt(deriveFloat(rootSeed,derivationKey(requestKey,'attempt',String(attempt),'lane',String(part)))*4294967296);
  // Frozen keyed lanes have an affine correlation. Apply the bijective SplitMix64
  // output finalizer before bounded mapping; no new seed, stream or entropy.
  // Constants/operations: https://prng.di.unimi.it/splitmix64.c (public domain).
  let value=word(0)<<32n|word(1);
  value=BigInt.asUintN(64,(value^(value>>30n))*0xbf58476d1ce4e5b9n);
  value=BigInt.asUintN(64,(value^(value>>27n))*0x94d049bb133111ebn);
  value^=value>>31n;
  return Number(lane===0?value>>32n:value&0xffffffffn);
 });
}
export function candidateIndexForTicket(bounds:readonly bigint[],ticket:bigint):number{
 if(ticket<0n||!bounds.length||ticket>=bounds[bounds.length-1])throw Error('Invalid placement ticket.');
 let low=0,high=bounds.length-1;
 while(low<high){const middle=Math.floor((low+high)/2);if(ticket<bounds[middle])high=middle;else low=middle+1;}
 return low;
}
