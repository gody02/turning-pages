import {describe,expect,it} from 'vitest';

describe('startup worker import boundary',()=>{
 it('keeps the main entry/protocol/request free of constructor/content registry imports',()=>{
  const modules=import.meta.glob<string>(['./countryStartResidence.ts','./countryStartResidenceProtocol.ts','./countryStartResidenceRequest.ts','./countryStartResidenceStartup.ts'],{eager:true,query:'?raw',import:'default'});
  for(const source of Object.values(modules)){
   const imports=source.split('\n').filter(line=>line.startsWith('import ')&&!line.startsWith('import type '));
   expect(imports.join('\n')).not.toMatch(/countryStartGeographic|countryStartResidenceConstruction|countryStartRegistry|countryStartResidenceScenario|countryStartResidencePreparation|settlementRegistry|placementRegistry|demography/);
   expect(source).not.toMatch(/Math\.random|Date\.now|crypto\.getRandomValues/);
  }
 });
 it('does not expose ongoing simulation or persistence messages',()=>{
  const protocol=import.meta.glob<string>('./countryStartResidenceProtocol.ts',{eager:true,query:'?raw',import:'default'});
  for(const source of Object.values(protocol))expect(source).not.toMatch(/kind:\s*'(?:tick|command|save|load|update|advance)'/);
 });
 it('loads the heavy startup graph only after entering the worker realm',()=>{
  const worker=Object.values(import.meta.glob<string>('./countryStartResidence.worker.ts',{eager:true,query:'?raw',import:'default'}))[0];
  expect(worker).toContain("import('./countryStartResidenceWorkerHost')");
  expect(worker.split('\n').filter(line=>line.startsWith('import ')).join('\n')).not.toContain('countryStartResidenceWorkerHost');
 });
});
