import {describe,expect,it} from 'vitest';

describe('Residence placement dependency boundary',()=>{
 it('permits only inward generic imports and no state mutations or platform randomness',()=>{
  const sources=import.meta.glob<string>(['./*.ts','!./*.test.ts','!./fixtures.ts'],{eager:true,query:'?raw',import:'default'});
  for(const [path,source] of Object.entries(sources)){
   const imports=[...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(match=>match[1]);
   for(const dependency of imports)expect(dependency,path).toMatch(/^(?:\.\/|\.\.\/core\/(?:json|rng)$|\.\.\/geography\/(?:types|runtime|settlements\/runtime)$|\.\.\/residence\/types$)/);
   expect(source,path).not.toMatch(/Math\.random|Date\.now|new Date|crypto\.getRandomValues|localeCompare|\bestablishResidence\s*\(|:\s*Game\b|\bPopulationState\b|\bPopulationMembership\b/);
  }
 });
 it('keeps the frozen Residence Foundation independent of placement',()=>{
  const sources=import.meta.glob<string>(['../residence/*.ts','!../residence/*.test.ts'],{eager:true,query:'?raw',import:'default'});
  for(const source of Object.values(sources))expect(source).not.toMatch(/from\s+['"][^'"]*residencePlacement/);
 });
 it('keeps frozen Geography, Settlement, Human and core foundations free of reverse imports',()=>{
  const sources=import.meta.glob<string>(['../geography/**/*.ts','../human/**/*.ts','../core/**/*.ts','!../**/*.test.ts'],{eager:true,query:'?raw',import:'default'});
  for(const [path,source] of Object.entries(sources))expect(source,path).not.toMatch(/(?:from\s+|import\s*\(?\s*)['"][^'"]*residencePlacement/);
 });
});
