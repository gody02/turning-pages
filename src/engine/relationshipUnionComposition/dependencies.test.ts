import {describe,expect,it} from 'vitest';
import shapes from './validation';

const modules=import.meta.glob<string>(['./*.ts','!./*.test.ts','!./fixtures.ts'],{eager:true,query:'?raw',import:'default'});
describe('Relationship/Union Composition exact public and inward dependency contract',()=>{
  it('exports exactly seventeen approved operations; private utilities remain internal',()=>{
    const publicFiles=new Set(['./package.ts','./validation.ts','./runtime.ts','./subjectAdapters.ts','./kinds.ts','./compatibility.ts']);
    const names=Object.entries(modules).filter(([p])=>publicFiles.has(p)).flatMap(([,s])=>[...s.matchAll(/export function (\w+)/g)].map(m=>m[1])).sort();
    expect(names).toEqual(['withRelationshipUnionCompositionPolicyFingerprint','validateRelationshipUnionCompositionPolicy','createRelationshipUnionCompositionRegistry','resolveRelationshipUnionCompositionPolicy','validateRelationshipUnionCompositionRequest','diagnoseRelationshipUnionComposition','evaluateRelationshipUnionComposition','validateRelationshipUnionCompositionPlan','adaptHouseholdSubjectsForRelationshipUnionComposition','adaptFamilySubjectsForRelationshipUnionComposition','validateRelationshipUnionBorrowedReferences','assessRelationshipUnionPlanAgainstPartnership','assessRelationshipUnionPlanAgainstFormalUnion','assessRelationshipUnionKindResolution','assessRelationshipUnionCompositionReadiness','resolveRelationshipUnionCompositionPlan','validateResolvedRelationshipUnionCompositionPlan'].sort());
    expect(Object.isFrozen(shapes)).toBe(true);
  });
  it('reuses exact frozen subject, inventory and birth types rather than creating a new wire grammar',()=>{const source=modules['./types.ts'];for(const alias of ['RelationshipSubjectRefV1 = FamilySubjectRefV1','RelationshipFutureSubjectV1 = TransientPersonSubjectV1','RelationshipBirthConstraintV1 = CompositionBirthConstraintV1','RelationshipBorrowedInventoryV1 = FamilyBorrowedSubjectInventoryV1','RelationshipUnionKindRefV1 = FormalUnionKindManifestEntryV1'])expect(source).toContain(alias);});
  it('has only specifically approved read-only public imports and no hidden authority/entropy',()=>{
    for(const [path,source] of Object.entries(modules)){
      for(const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)){
        const dependency=match[1];
        if(dependency.startsWith('./'))continue;
        const common=/^\.\.\/(?:core\/(?:clock|json|model|rng)|human\/person)$/;
        const types=/^\.\.\/(?:familyComposition|householdComposition|partnership|formalUnion)\/types$/;
        const adapters=/^\.\.\/(?:familyComposition\/(?:types|runtime|householdAdapter)|householdComposition\/types)$/;
        const compatibility=/^\.\.\/(?:partnership|formalUnion)\/(?:types|validation)$/;
        const kinds=/^\.\.\/formalUnion\/(?:types|validation|kinds)$/;
        expect(common.test(dependency)||path==='./types.ts'&&types.test(dependency)||path==='./subjectAdapters.ts'&&adapters.test(dependency)||path==='./compatibility.ts'&&compatibility.test(dependency)||path==='./kinds.ts'&&kinds.test(dependency),path+':'+dependency).toBe(true);
      }
      expect(source,path).not.toMatch(/Math\.random|Date\.now|new Date|getRandomValues|randomUUID|localeCompare|localStorage|indexedDB|\bWorker\b|\bGameV\d+\b|\bfetch\s*\(/);
      expect(source,path).not.toMatch(/\b(?:createPerson|allocatePerson|createPeople|generatePerson|instantiateFromCohort|createFormalUnion|setFormalUnionSeparation|endFormalUnion|establishPartnership|endPartnership|advanceClock|recordHistory|dispatchDomain)\s*\(/);
      expect(source,path).not.toMatch(/from\s+['"][^'"]*(?:\/uk\/|\/ui\/|\/persistence\/|\/population\/|\/residence\/|\/kinship\/|\/household\/|\/care\/)/);
    }
  });
  it('has no reverse production/root/domain dependency on the planner',()=>{
    const sources=import.meta.glob<string>(['../**/*.ts','../../data/**/*.ts','../../ui/**/*.ts','../../ui/**/*.tsx','../../persistence/**/*.ts','!../relationshipUnionComposition/**','!../**/*.test.ts','!../../**/*.test.ts'],{eager:true,query:'?raw',import:'default'});
    for(const [path,source] of Object.entries(sources))expect(source,path).not.toMatch(/(?:from\s+|import\s*\(?\s*)['"][^'"]*relationshipUnionComposition/);
  });
});
