import {validateHouseholdCompositionPlan} from '../householdComposition/runtime';
import type {HouseholdCompositionPlanV1,HouseholdCompositionPolicyV1,HouseholdCompositionContextV1} from '../householdComposition/types';
import {canonicalStringify,dense,fields,fnv1a64,immutable,snapshot,stableId,subjectKey} from './data';
import shapes from './validation';
import type {FamilyBorrowedSubjectInventoryV1,FamilyCompositionPlanV1,FamilySubjectScopeId} from './types';

export function adaptHouseholdCompositionSubjects(plan:HouseholdCompositionPlanV1,policy:HouseholdCompositionPolicyV1,context:HouseholdCompositionContextV1,scopeId:FamilySubjectScopeId):FamilyBorrowedSubjectInventoryV1{
  try{
    const p=snapshot(plan),ownedPolicy=snapshot(policy),c=snapshot(context);
    if(!stableId(scopeId)||!validateHouseholdCompositionPlan(p,ownedPolicy,c))throw Error();
    return immutable({scopeId,producerId:'household-composition.v1',planFingerprint:fnv1a64(canonicalStringify(p)),subjects:p.additionalMembers.map(slot=>({slotId:slot.slotId,birth:slot.birth}))});
  }catch{throw Error('Invalid Household composition subject adapter input.');}
}
/** Cross-plan proof only; complete Family acceptance separately needs its exact policy/context. */
export function validateFamilyPlanHouseholdReferences(plan:FamilyCompositionPlanV1,inventory:FamilyBorrowedSubjectInventoryV1,householdPlan:HouseholdCompositionPlanV1,householdPolicy:HouseholdCompositionPolicyV1,householdContext:HouseholdCompositionContextV1):boolean{
  try{
    const p=snapshot(plan),i=snapshot(inventory),expected=adaptHouseholdCompositionSubjects(householdPlan,householdPolicy,householdContext,i.scopeId);
    if(canonicalStringify(i)!==canonicalStringify(expected)||!fields(p,['version','request','policyFingerprint','evaluationFingerprint','templateId','materializationRequirements','parentages'])||p.version!==1||!fields(p.request,['version','policyId','requestKey','rootSeed','referenceDate','countryId','familyScopeId','bindings'])||!dense(p.parentages)||!dense(p.materializationRequirements)||!dense(p.request.bindings))return false;
    const slots=new Map(expected.subjects.map(slot=>[slot.slotId,slot])),used=new Set<string>(),requirements=new Set<string>();
    const check=(ref:unknown)=>{
      if(!shapes.subjectShape(ref))return false;
      if(ref.kind==='future'&&ref.scopeId===expected.scopeId){if(!slots.has(ref.slotId))return false;}
      return true;
    };
    for(const binding of p.request.bindings)if(!fields(binding,['bindingId','subject'])||!check(binding.subject))return false;
    for(const edge of p.parentages){
      if(!fields(edge,['parent','child','bases'])||!check(edge.parent)||!check(edge.child)||!shapes.basesShape(edge.bases))return false;
      for(const ref of [edge.parent,edge.child])if(shapes.subjectShape(ref)&&ref.kind==='future'&&ref.scopeId===expected.scopeId)used.add(subjectKey(ref));
    }
    for(const requirement of p.materializationRequirements){
      if(!fields(requirement,['subject','birth','origin'])||!check(requirement.subject)||!shapes.subjectShape(requirement.subject)||requirement.subject.kind!=='future'||!shapes.birthShape(requirement.birth))return false;
      const ref=requirement.subject;if(ref.scopeId!==expected.scopeId)continue;
      const key=subjectKey(ref);if(requirements.has(key)||!used.has(key)||!fields(requirement.origin,['kind','producerId','planFingerprint'])||requirement.origin.kind!=='borrowed'||requirement.origin.producerId!==expected.producerId||requirement.origin.planFingerprint!==expected.planFingerprint||canonicalStringify(requirement.birth)!==canonicalStringify(slots.get(ref.slotId)!.birth))return false;
      requirements.add(key);
    }
    return requirements.size===used.size;
  }catch{return false;}
}
