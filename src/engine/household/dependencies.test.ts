import {describe,expect,it} from 'vitest';

const modules=import.meta.glob<string>(['./*.ts','!./*.test.ts'],{eager:true,query:'?raw',import:'default'});

describe('Household standalone ownership',()=>{
  it('imports only local Household modules, frozen People and generic JSON validation',()=>{
    for(const [path,source] of Object.entries(modules)){
      const imports=[...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(match=>match[1]);
      expect(imports.every(value=>value.startsWith('./')||value==='../human/person'||value==='../core/json'),path).toBe(true);
      expect(source,path).not.toMatch(/Math\.random|Date\.now|getRandomValues|randomUUID|new Date|localeCompare|Worker|localStorage|indexedDB/);
    }
  });
  it('exposes only the approved public function/type contracts',()=>{
    const functions=Object.values(modules).flatMap(source=>[...source.matchAll(/export function (\w+)/g)].map(match=>match[1])).sort();
    expect(functions).toEqual(['addHouseholdMember','createEmptyHouseholdState','createHousehold','getHousehold','getHouseholdMembers','getPersonHouseholds','removeHouseholdMember','removePersonFromHouseholds','transferHouseholdMembership','validHouseholdState','validHouseholdWithPeople'].sort());
    const types=Object.values(modules).flatMap(source=>[...source.matchAll(/export type (\w+)/g)].map(match=>match[1])).sort();
    expect(types).toEqual(['HouseholdId','HouseholdPersonId','HouseholdRecordV1','HouseholdMembershipV1','HouseholdStateV1','HouseholdValidationContext','HouseholdCreationResultV1'].sort());
  });
  it('permits Household imports only in the approved Game root composition files, never generic domains or persistence',()=>{
    const frozen=import.meta.glob<string>(['../core/**/*.ts','../human/**/*.ts','../residence/**/*.ts','../geography/**/*.ts','../residencePlacement/**/*.ts','../types.ts','../save.ts','../../persistence/**/*.ts','../../data/countryStart/**/*.ts','../../ui/**/*.ts','../../ui/**/*.tsx'],{eager:true,query:'?raw',import:'default'});
    for(const [path,source] of Object.entries(frozen))if(path!=='../types.ts'&&path!=='../save.ts')expect(source,path).not.toMatch(/(?:from\s+|import\s*\(?\s*)['"][^'"]*\/household(?:\/|['"])/i);
  });
});
