import {describe,expect,it} from 'vitest';
import shapes from './validation';

describe('Family Composition standalone public and dependency contract',()=>{
  it('keeps the private validator table immutable rather than exposing mutable validation authority',()=>{
    expect(Object.isFrozen(shapes)).toBe(true);
    expect(()=>{(shapes as unknown as {policyShape:unknown}).policyShape=()=>true;}).toThrow();
  });
  it('exports the exact approved pure APIs, keeping private utilities outside the public contract',()=>{
    const files=import.meta.glob<string>(['./package.ts','./runtime.ts','./compatibility.ts','./householdAdapter.ts','./validation.ts'],{eager:true,query:'?raw',import:'default'});
    const functions=Object.values(files).flatMap(source=>[...source.matchAll(/export function (\w+)/g)].map(match=>match[1])).sort();
    expect(functions).toEqual(['withFamilyCompositionPolicyFingerprint','validateFamilyCompositionPolicy','createFamilyCompositionRegistry','resolveFamilyCompositionPolicy','validateFamilyCompositionRequest','evaluateFamilyComposition','diagnoseFamilyComposition','validateFamilyCompositionPlan','assessFamilyPlanAgainstKinship','assessFamilyCompositionReadiness','resolveFamilyCompositionPlan','validateResolvedFamilyPlan','adaptHouseholdCompositionSubjects','validateFamilyPlanHouseholdReferences'].sort());
    const types=import.meta.glob<string>('./types.ts',{eager:true,query:'?raw',import:'default'});
    expect(Object.values(types)[0]).toContain('FamilyBirthConstraintV1 = CompositionBirthConstraintV1');
  });
  it('imports inward read-only facts and validation, never allocation or authority',()=>{
    const files=import.meta.glob<string>(['./*.ts','!./*.test.ts','!./fixtures.ts'],{eager:true,query:'?raw',import:'default'});
    for(const [path,source] of Object.entries(files)){
      for(const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)){
        if(path==='./householdAdapter.ts')expect(match[1],path).toMatch(/^(?:\.\/|\.\.\/householdComposition\/(?:types|runtime)$)/);
        else expect(match[1],path).toMatch(/^(?:\.\/|\.\.\/core\/(?:json|rng|clock|model)$|\.\.\/human\/person$|\.\.\/kinship\/(?:types|validation)$|\.\.\/householdComposition\/types$)/);
      }
      expect(source,path).not.toMatch(/Math\.random|Date\.now|new Date|getRandomValues|randomUUID|localeCompare|\b(?:createPerson|allocatePerson|createPeople|generatePerson|instantiateFromCohort|createHousehold|addParentageBasis|removeParentageBasis)\s*\(|localStorage|indexedDB|\bGameV[4567]\b|\bWorker\b|\buk\b|ONS|NRS|NISRA/);
    }
  });
  it('introduces no reverse production dependency',()=>{
    const files=import.meta.glob<string>(['../kinship/*.ts','../householdComposition/*.ts','../human/**/*.ts','../core/**/*.ts','../residence/**/*.ts','../../data/**/*.ts','../../ui/**/*.ts','../../ui/**/*.tsx','../../persistence/**/*.ts','!../**/*.test.ts','!../../**/*.test.ts'],{eager:true,query:'?raw',import:'default'});
    for(const [path,source] of Object.entries(files))expect(source,path).not.toMatch(/(?:from\s+|import\s*\(?\s*)['"][^'"]*familyComposition/);
  });
});
