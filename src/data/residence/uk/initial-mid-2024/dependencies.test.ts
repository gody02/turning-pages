import {describe,expect,it} from 'vitest';
describe('UK initial Residence content dependency boundary',()=>{
 it('contains only policy preparation, exact registration and pure evaluation',()=>{
  const sources=import.meta.glob<string>(['./adapter.ts','../placementRegistry.ts'],{eager:true,query:'?raw',import:'default'});
  for(const [file,source] of Object.entries(sources)){
   const imports=[...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m=>m[1]);
   for(const dependency of imports)expect(dependency,file).toMatch(/(?:engine\/residencePlacement\/(?:package|runtime|types)$|\.json$|\.\/initial-mid-2024\/adapter$)/);
   expect(source,file).not.toMatch(/from\s+['"][^'"]*(?:countryStart|newGame|persistence|residence\/state|population|migration|household|war|immigration|LifeApp)/);
   expect(source,file).not.toMatch(/\bestablishResidence\s*\(|\brelocateResidence\s*\(|Math\.random|Date\.now|crypto\.getRandomValues|localeCompare|setInterval|setTimeout/);
  }
 });
 it('does not wire the policy into current Country Start, New Game or frozen generic foundations',()=>{
  const sources=import.meta.glob<string>(['../../../uk/countryStart*.ts','../../../../ui/newGame.ts','../../../../ui/LifeApp.tsx','../../../../engine/residence/**/*.ts','../../../../engine/residencePlacement/**/*.ts','!../../../../**/*.test.ts'],{eager:true,query:'?raw',import:'default'});
  for(const [file,source] of Object.entries(sources))expect(source,file).not.toMatch(/(?:from\s+|import\s*\(?\s*)['"][^'"]*(?:data\/residence|placementRegistry|initial-mid-2024)/);
 });
});
