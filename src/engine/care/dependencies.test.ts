import {describe,it,expect} from 'vitest';
const modules=import.meta.glob<string>(['./*.ts','!./*.test.ts','!./fixtures.ts'],{eager:true,query:'?raw',import:'default'});
describe('care standalone ownership',()=>{
  it('exposes exactly the approved public functions/types, keeping internal helpers private',()=>{
    const publicModules=Object.entries(modules).filter(([p])=>p!=='./internal.ts').map(([,s])=>s);
    expect(publicModules.flatMap(s=>[...s.matchAll(/export function (\w+)/g)].map(m=>m[1])).sort()).toEqual(["createEmptyCareState","endCare","establishCare","getCareProviders","getCareRecipients","getCareResponsibility","removePersonFromCare","setCareRole","validCareState","validCareWithPeople"]);
    expect(publicModules.flatMap(s=>[...s.matchAll(/export type (\w+)/g)].map(m=>m[1])).sort()).toEqual(["CarePersonId","CareRecordV1","CareRoleV1","CareStateV1","CareValidationContext"]);
  });
  it('imports only local modules and frozen read-only People/Calendar/JSON',()=>{
    for(const [path,source] of Object.entries(modules)){
      for(const m of source.matchAll(/from\s+['"]([^'"]+)['"]/g))expect(m[1],path).toMatch(/^(?:\.\/|\.\.\/human\/person$|\.\.\/core\/(?:clock|model|json)$)/);
      expect(source,path).not.toMatch(/Math\.random|Date\.now|new Date|getRandomValues|randomUUID|localeCompare|localStorage|indexedDB|\bWorker\b|\bfetch\s*\(/);
      expect(source,path).not.toMatch(/\b(?:createPerson|allocatePerson|createPeople|generatePerson|instantiateFromCohort|recordHistory|dispatchDomain|advanceClock)\s*\(/);
    }
  });
  it('introduces no reverse root, application, persistence or frozen-domain imports',()=>{
    const others=import.meta.glob<string>(['../**/*.ts','../../data/**/*.ts','../../ui/**/*.ts','../../ui/**/*.tsx','../../persistence/**/*.ts','!../care/**','!../**/*.test.ts','!../../**/*.test.ts'],{eager:true,query:'?raw',import:'default'});
    for(const [path,source] of Object.entries(others))if(!['../types.ts','../save.ts','../gameContent.ts','../testing/guardianshipCareRootFixture.ts'].includes(path))expect(source,path).not.toMatch(/(?:from\s+|import\s*\(?\s*)['"][^'"]*\/care(?:\/|['"])/);
  });
});
