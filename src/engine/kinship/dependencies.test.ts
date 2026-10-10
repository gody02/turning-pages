import {describe,expect,it} from 'vitest';

const modules=import.meta.glob<string>(['./*.ts','!./*.test.ts','!./fixtures.ts'],{eager:true,query:'?raw',import:'default'});
describe('Standalone Kinship ownership',()=>{
  it('imports only local graph modules, frozen People and plain JSON validation',()=>{
    for(const [path,source] of Object.entries(modules)){
      const imports=[...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(match=>match[1]);
      expect(imports.every(value=>value.startsWith('./')||value==='../human/person'||value==='../core/json'),path).toBe(true);
      expect(source,path).not.toMatch(/Math\.random|Date\.now|getRandomValues|randomUUID|new Date|localeCompare|Worker|localStorage|indexedDB/);
      expect(source,path).not.toMatch(/createPerson|allocatePerson|generatePerson|recordHistory|dispatchDomain|advanceClock/);
    }
  });
  it('exports exactly the approved functions and types without private helper/index exports',()=>{
    const functions=Object.values(modules).flatMap(source=>[...source.matchAll(/export function (\w+)/g)].map(match=>match[1])).sort();
    expect(functions).toEqual(['createEmptyKinshipState','addParentageBasis','removeParentageBasis','removePersonFromKinship','validKinshipState','validKinshipWithPeople','getParentage','getParents','getChildren','getSiblingRelationship','getGrandparents','getGrandchildren','getAncestors','getDescendants'].sort());
    const types=Object.values(modules).flatMap(source=>[...source.matchAll(/export type (\w+)/g)].map(match=>match[1])).sort();
    expect(types).toEqual(['KinshipPersonId','ParentageBasis','ParentageIdentityV1','ParentageRecordV1','KinshipStateV1','KinshipValidationContext','SiblingParentageOverlapV1','KinshipReachablePersonV1','KinshipTraversalResultV1'].sort());
  });
  it('permits reverse imports only in explicitly approved Game-root composition and integration tests',()=>{
    const frozen=import.meta.glob<string>(['../**/*.ts','../../data/**/*.ts','../../ui/**/*.ts','../../ui/**/*.tsx','../../persistence/**/*.ts','!./*.ts'],{eager:true,query:'?raw',import:'default'});
    const composition=new Set(['../types.ts','../save.ts','../kinshipRoot.test.ts','../testing/kinshipRootFixture.ts','../../persistence/kinshipIntegration.test.ts',
      // Approved read-only Family Composition dependencies and synthetic test setup only.
      '../familyComposition/types.ts','../familyComposition/validation.ts','../familyComposition/compatibility.ts',
      '../familyComposition/fixtures.ts','../familyComposition/compatibility.test.ts']);
    for(const [path,source] of Object.entries(frozen))if(!path.includes('/kinship/')&&!composition.has(path))expect(source,path).not.toMatch(/(?:from\s+|import\s*\(?\s*)['"][^'"]*\/kinship(?:\/|['"])/i);
  });
});
