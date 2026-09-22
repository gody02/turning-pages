/** Independent hypothetical paths. Never consume or mutate the real timeline's seed. */
export function projectPaths<S extends {seed:number},R>(source:S,options:{horizon:number;samples:number;prepare:(s:S)=>void;advance:(s:S)=>S;observe:(s:S)=>R}):R[][]{
 const paths:R[][]=[];
 for(let sample=0;sample<options.samples;sample++){
  let state=structuredClone(source);state.seed=(source.seed^Math.imul(sample+101,2654435761)^0xa511e9b3)>>>0;options.prepare(state);
  const path:R[]=[];for(let month=0;month<options.horizon;month++){state=options.advance(state);path.push(options.observe(state));}paths.push(path);
 }
 return paths;
}
export function percentileBand(values:number[]){const sorted=[...values].sort((a,b)=>a-b);return [.1,.5,.9].map(q=>sorted[Math.floor((sorted.length-1)*q)]);}
