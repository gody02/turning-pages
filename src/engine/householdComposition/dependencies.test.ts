import {describe,expect,it} from 'vitest';

describe('Household Composition dependency boundary',()=>{
  it('allows only inward facts/validation, calendar, JSON and keyed RNG imports',()=>{
    const sources=import.meta.glob<string>(['./*.ts','!./*.test.ts','!./fixtures.ts'],{eager:true,query:'?raw',import:'default'});
    for(const [path,source] of Object.entries(sources)){
      for(const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g))expect(match[1],path).toMatch(/^(?:\.\/|\.\.\/core\/(?:json|rng|clock|model)$|\.\.\/human\/person$|\.\.\/household\/(?:types|validation)$)/);
      expect(source,path).not.toMatch(/Math\.random|Date\.now|new Date|crypto\.getRandomValues|localeCompare|\b(?:allocatePerson|createPerson|createPeople|createHousehold|addHouseholdMember|instantiateFromCohort|applyHouseholdCompositionPlan)\s*\(|\bGameV[45]\b|\bWorker\b|localStorage|indexedDB|from\s+['"][^'"]*(?:residencePlacement|population|geography|countryStart|persistence|ui)/);
      expect(source,path).not.toMatch(/\buk\b|ONS|NRS|NISRA|familyRole|guardianRole|careRole|relationshipType/);
    }
  });
  it('adds no reverse imports to frozen domains or production paths',()=>{
    const sources=import.meta.glob<string>(['../household/*.ts','../human/**/*.ts','../core/**/*.ts','../residence/**/*.ts','../residencePlacement/**/*.ts','../../data/**/*.ts','../../ui/**/*.ts','../../ui/**/*.tsx','../../persistence/*.ts','!../**/*.test.ts','!../../**/*.test.ts'],{eager:true,query:'?raw',import:'default'});
    for(const [path,source] of Object.entries(sources))expect(source,path).not.toMatch(/(?:from\s+|import\s*\(?\s*)['"][^'"]*householdComposition/);
  });
});
