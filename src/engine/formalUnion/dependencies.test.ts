import {describe,expect,it} from 'vitest';
const modules=import.meta.glob<string>(['./*.ts','!./*.test.ts','!./fixtures.ts'],{eager:true,query:'?raw',import:'default'});
describe('formalUnion standalone public and inward dependency contract',()=>{
  it('exports exactly the architecture-approved public functions and types',()=>{
    const publicModules=Object.entries(modules).filter(([path])=>path!=='./internal.ts').map(([,source])=>source);
    expect(publicModules.flatMap(source=>[...source.matchAll(/export function (\w+)/g)].map(match=>match[1])).sort()).toEqual(["withFormalUnionKindFingerprint","validFormalUnionKind","createFormalUnionKindRegistry","resolveFormalUnionKind","validFormalUnionState","validFormalUnionWithPeople","validFormalUnionWithContext","createEmptyFormalUnionState","createFormalUnion","setFormalUnionSeparation","endFormalUnion","removePersonFromFormalUnions","getFormalUnion","getFormalUnionsForPerson","getInForceFormalUnionsForPerson","getInForceFormalUnionsBetween","getSurvivingFormalUnionAssociations"].sort());
    expect(publicModules.flatMap(source=>[...source.matchAll(/export type (\w+)/g)].map(match=>match[1])).sort()).toEqual(["FormalUnionPersonId","FormalUnionId","FormalUnionKindId","FormalUnionKindFingerprint","FormalUnionKindDefinitionV1","FormalUnionKindInputV1","FormalUnionKindManifestEntryV1","FormalUnionKindRegistryV1","FormalUnionSeparationV1","FormalUnionEndV1","FormalUnionStandingV1","FormalUnionRecordV1","FormalUnionStateV1","FormalUnionInputV1","FormalUnionValidationContext","FormalUnionCreationResultV1"].sort());
  });
  it('has only local, read-only People, Calendar and JSON dependencies',()=>{
    for(const [path,source] of Object.entries(modules)){
      for(const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g))expect(match[1],path).toMatch(/^(?:\.\/|\.\.\/human\/person$|\.\.\/core\/(?:json|clock|model)$)/);
      expect(source,path).not.toMatch(/Math\.random|Date\.now|new Date|getRandomValues|randomUUID|localeCompare|localStorage|indexedDB|\bWorker\b/);
      expect(source,path).not.toMatch(/\b(?:createPerson|createPeople|allocatePerson|generatePerson|instantiateFromCohort|advanceClock|recordHistory|dispatchDomain)\s*\(/);
    }
  });
  it('introduces no reverse application or frozen domain dependency',()=>{
    const others=import.meta.glob<string>(['../**/*.ts','../../data/**/*.ts','../../ui/**/*.ts','../../ui/**/*.tsx','../../persistence/**/*.ts','!../formalUnion/**'],{eager:true,query:'?raw',import:'default'});
    const approved=new Set(['../types.ts','../save.ts','../gameContent.ts','../relationshipUnionRoot.test.ts','../testing/relationshipUnionRootFixture.ts','../../persistence/relationshipUnionIntegration.test.ts','../../ui/gameContent.test.ts']);
    for(const [path,source] of Object.entries(others))if(!approved.has(path))expect(source,path).not.toMatch(/(?:from\s+|import\s*\(?\s*)['"][^'"]*\/formalUnion(?:\/|['"])/);
  });
});
