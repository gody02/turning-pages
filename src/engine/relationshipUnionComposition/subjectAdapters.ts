import {adaptHouseholdCompositionSubjects,validateFamilyPlanHouseholdReferences} from '../familyComposition/householdAdapter';
import {validateFamilyCompositionPlan} from '../familyComposition/runtime';
import type {FamilyCompositionPlanV1,FamilyCompositionPolicyV1,FamilyCompositionContextV1} from '../familyComposition/types';
import type {HouseholdCompositionPlanV1,HouseholdCompositionPolicyV1,HouseholdCompositionContextV1} from '../householdComposition/types';
import {canonicalStringify,compare,fields,fnv1a64,immutable,snapshot,subjectKey} from './data';
import {validateRelationshipUnionCompositionPlan} from './runtime';
import type {RelationshipBorrowedInventoryV1,RelationshipOriginalPlanV1,RelationshipUnionBorrowedSourceV1} from './types';

export function adaptHouseholdSubjectsForRelationshipUnionComposition(plan:HouseholdCompositionPlanV1,scopeId:string,policy:HouseholdCompositionPolicyV1,context:HouseholdCompositionContextV1):RelationshipBorrowedInventoryV1{
  return adaptHouseholdCompositionSubjects(plan,policy,context,scopeId);
}
export function adaptFamilySubjectsForRelationshipUnionComposition(plan:FamilyCompositionPlanV1,policy:FamilyCompositionPolicyV1,context:FamilyCompositionContextV1):RelationshipBorrowedInventoryV1{
  try{
    const p=snapshot(plan),c=snapshot(context),pol=snapshot(policy);if(!validateFamilyCompositionPlan(p,pol,c))throw Error();
    const subjects=p.materializationRequirements.filter(x=>x.origin.kind==='family').map(x=>{
      if(x.subject.scopeId!==p.request.familyScopeId)throw Error();return {slotId:x.subject.slotId,birth:x.birth};
    }).sort((a,b)=>compare(a.slotId,b.slotId));
    return immutable({scopeId:p.request.familyScopeId,producerId:'family-composition.v1',planFingerprint:fnv1a64(canonicalStringify(p)),subjects});
  }catch{throw Error('Invalid Family composition subject adapter input.');}
}
export function validateRelationshipUnionBorrowedReferences(original:RelationshipOriginalPlanV1,sources:readonly RelationshipUnionBorrowedSourceV1[]):boolean{
  try{
    const o=snapshot(original),rows=snapshot(sources);
    if(!fields(o,['plan','policy','context'])||!validateRelationshipUnionCompositionPlan(o.plan,o.policy,o.context)||!Array.isArray(rows))return false;
    const actual=new Map<string,{inventory:RelationshipBorrowedInventoryV1;source:RelationshipUnionBorrowedSourceV1}>(),owners=new Set<string>();
    for(const candidate of rows){
      if(!fields(candidate,['kind','scopeId','plan','policy','context'])&&!fields(candidate,['kind','plan','policy','context']))return false;
      const row=candidate as unknown as RelationshipUnionBorrowedSourceV1;
      let inventory:RelationshipBorrowedInventoryV1;
      if(row.kind==='household'&&fields(candidate,['kind','scopeId','plan','policy','context']))inventory=adaptHouseholdSubjectsForRelationshipUnionComposition(row.plan,row.scopeId,row.policy,row.context);
      else if(row.kind==='family'&&fields(candidate,['kind','plan','policy','context']))inventory=adaptFamilySubjectsForRelationshipUnionComposition(row.plan,row.policy,row.context);
      else return false;
      const owner=JSON.stringify([inventory.producerId,inventory.planFingerprint]);
      if(actual.has(inventory.scopeId)||owners.has(owner)||inventory.scopeId===o.plan.request.relationshipScopeId||canonicalStringify(row.context.people)!==canonicalStringify(o.context.people)||canonicalStringify(row.plan.request.referenceDate)!==canonicalStringify(o.plan.request.referenceDate))return false;
      owners.add(owner);actual.set(inventory.scopeId,{inventory,source:row});
    }
    const visited=new Set<string>();
    const verify=(inventory:RelationshipBorrowedInventoryV1):boolean=>{
      const frame=actual.get(inventory.scopeId);
      if(!frame||canonicalStringify(frame.inventory)!==canonicalStringify(inventory))return false;
      if(visited.has(inventory.scopeId))return true;
      visited.add(inventory.scopeId);
      if(frame.source.kind==='family')for(const borrowed of frame.source.context.borrowedSubjects){
        // Frozen Family's borrowed Household subjects stay owned by their original source.
        const parent=actual.get(borrowed.scopeId);
        if(!parent||parent.source.kind!=='household'||!verify(borrowed)||!validateFamilyPlanHouseholdReferences(frame.source.plan,borrowed,parent.source.plan,parent.source.policy,parent.source.context))return false;
      }
      return true;
    };
    // Require source proofs for every future binding used as an input, not invented inventories.
    const needed=new Set(o.plan.request.bindings.flatMap(b=>b.subject.kind==='future'?[b.subject.scopeId]:[]));
    for(const requirement of o.plan.materializationRequirements)if(requirement.origin.kind==='borrowed')needed.add(requirement.subject.scopeId);
    for(const scope of needed){const inventory=o.context.borrowedSubjects.find(x=>x.scopeId===scope);if(!inventory||!verify(inventory))return false;}
    if(visited.size!==rows.length)return false;
    for(const requirement of o.plan.materializationRequirements)if(requirement.origin.kind==='borrowed'){
      const inventory=actual.get(requirement.subject.scopeId)!.inventory,slot=inventory.subjects.find(s=>s.slotId===requirement.subject.slotId);
      if(!slot||requirement.origin.producerId!==inventory.producerId||requirement.origin.planFingerprint!==inventory.planFingerprint||canonicalStringify(requirement.birth)!==canonicalStringify(slot.birth))return false;
    }
    return new Set(o.plan.materializationRequirements.map(x=>subjectKey(x.subject))).size===o.plan.materializationRequirements.length;
  }catch{return false;}
}
