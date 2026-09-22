export function random(state:{seed:number}){state.seed=(Math.imul(state.seed,1664525)+1013904223)>>>0;return state.seed/4294967296;}
export const clamp=(n:number,min=0,max=100)=>Math.max(min,Math.min(max,n));
