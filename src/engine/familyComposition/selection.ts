import {deriveFloat} from '../core/rng';
import {derivationKey} from './data';

const RANGE=1n<<64n;
const MAX_COMPOSITION_DRAW_ATTEMPTS=1024;
/** Private exact-word range reduction; no caller-controlled policy callback. */
function boundedCompositionTicket(total:number,word:(attempt:number,lane:0|1)=>number):Readonly<{ticket:bigint;attempts:number}>{
  if(!Number.isSafeInteger(total) || total<=0)throw Error('Invalid Family composition mass.');
  const mass=BigInt(total),limit=RANGE/mass*mass;
  for(let attempt=0;attempt<MAX_COMPOSITION_DRAW_ATTEMPTS;attempt++){
    const high=word(attempt,0),low=word(attempt,1);
    if(![high,low].every(value=>Number.isInteger(value) && value>=0 && value<=0xffffffff))throw Error('Invalid Family composition derivation word.');
    const value=BigInt(high)<<32n|BigInt(low);
    if(value<limit)return {ticket:value%mass,attempts:attempt+1};
  }
  throw Error('Family composition derivation exhausted its rejection guard.');
}
export default function keyedFamilyTicket(rootSeed:number,key:string,total:number){
  return boundedCompositionTicket(total,(attempt,lane)=>{
    const word=(part:0|1)=>BigInt(deriveFloat(rootSeed,derivationKey(key,'attempt',String(attempt),'lane',String(part)))*4294967296);
    // Same frozen word-mixing method as Residence Placement, without a domain dependency.
    // SplitMix64 bijective finalizer, public-domain constants: prng.di.unimi.it/splitmix64.c.
    let value=word(0)<<32n|word(1);
    value=BigInt.asUintN(64,(value^(value>>30n))*0xbf58476d1ce4e5b9n);
    value=BigInt.asUintN(64,(value^(value>>27n))*0x94d049bb133111ebn);
    value^=value>>31n;
    return Number(lane===0?value>>32n:value&0xffffffffn);
  });
}
