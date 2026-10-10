import {ageOn,compareDates} from '../core/clock';
import {validPeople,type PeopleState} from '../human/person';
import {validKinshipWithPeople} from '../kinship/validation';
import type {KinshipStateV1,ParentageRecordV1} from '../kinship/types';
import {acyclic,canonicalStringify,compare,dense,fields,immutable,personId,snapshot,subjectKey} from './data';
import {validateFamilyCompositionPlan} from './runtime';
import shapes from './validation';
import type {FamilyCompositionContextV1,FamilyCompositionPlanV1,FamilyCompositionPolicyV1,FamilyPlanReadinessV1,FamilySubjectRefV1,FamilySubjectResolutionV1,ResolvedFamilyPlanV1} from './types';

type Current=Readonly<{people:PeopleState;kinship:KinshipStateV1}>;
function own(plan:FamilyCompositionPlanV1,policy:FamilyCompositionPolicyV1,evaluationContext:FamilyCompositionContextV1,current:Current){
  try{
    const p=snapshot(plan),c=snapshot(current),source=snapshot(evaluationContext);
    if(!validateFamilyCompositionPlan(p,policy,source)||!fields(c,['people','kinship'])||!validPeople(c.people)||!validKinshipWithPeople(c.kinship,c.people))throw Error();
    return {plan:p,current:c,source};
  }catch{throw Error('Invalid Family plan or Kinship compatibility context.');}
}
function existingReasons(plan:FamilyCompositionPlanV1,source:FamilyCompositionContextV1,current:Current):string[]{
  const ids=new Set(plan.request.bindings.flatMap(binding=>binding.subject.kind==='existing'?[binding.subject.personId]:[]));
  for(const edge of plan.parentages)for(const ref of [edge.parent,edge.child])if(ref.kind==='existing')ids.add(ref.personId);
  const reasons:string[]=[];
  for(const id of ids){
    const before=source.people.people[Number(id.slice(7))-1],after=current.people.people[Number(id.slice(7))-1];
    if(!after||after.id!==id)reasons.push(`Existing Family subject ${id} does not resolve.`);
    else if(before.lifeStatus!==after.lifeStatus||compareDates(before.dateOfBirth,after.dateOfBirth)!==0)reasons.push(`Existing Family facts changed for ${id}; reevaluation is required.`);
  }
  return reasons;
}
export function assessFamilyPlanAgainstKinship(plan:FamilyCompositionPlanV1,policy:FamilyCompositionPolicyV1,evaluationContext:FamilyCompositionContextV1,current:Current):FamilyPlanReadinessV1['application']{
  const owned=own(plan,policy,evaluationContext,current),reasons=existingReasons(owned.plan,owned.source,owned.current);
  const edges=[...owned.current.kinship.parentages.map(edge=>({parent:subjectKey({kind:'existing',personId:edge.parentId}),child:subjectKey({kind:'existing',personId:edge.childId})})),...owned.plan.parentages.map(edge=>({parent:subjectKey(edge.parent),child:subjectKey(edge.child)}))];
  if(!acyclic(edges))reasons.push('Desired parentage conflicts with the current Kinship union graph.');
  if(reasons.length)return immutable({status:'INCOMPATIBLE',reasons:[...new Set(reasons)].sort(compare)});
  if(owned.plan.materializationRequirements.length)return immutable({status:'UNRESOLVED',reasons:owned.plan.materializationRequirements.map(item=>`Future Family subject ${subjectKey(item.subject)} has not been resolved.`).sort(compare)});
  return immutable({status:'COMPATIBLE',reasons:[]});
}
export function assessFamilyCompositionReadiness(plan:FamilyCompositionPlanV1,policy:FamilyCompositionPolicyV1,evaluationContext:FamilyCompositionContextV1,current:Current):FamilyPlanReadinessV1{
  const application=assessFamilyPlanAgainstKinship(plan,policy,evaluationContext,current),p=snapshot(plan);
  return immutable({materialization:{status:p.materializationRequirements.length?'NOT_READY':'READY',requirements:p.materializationRequirements.map(item=>({subject:item.subject,status:'unproven' as const})),reasons:p.materializationRequirements.map(item=>`Materialization is unproven for ${subjectKey(item.subject)}; no capability proof is approved in v1.`).sort(compare)},application});
}
export function resolveFamilyCompositionPlan(plan:FamilyCompositionPlanV1,policy:FamilyCompositionPolicyV1,evaluationContext:FamilyCompositionContextV1,resolutions:readonly FamilySubjectResolutionV1[],current:Current):ResolvedFamilyPlanV1{
  const owned=own(plan,policy,evaluationContext,current);
  try{
    if(existingReasons(owned.plan,owned.source,owned.current).length)throw Error();
    const rows=snapshot(resolutions);if(!dense(rows)||rows.length!==owned.plan.materializationRequirements.length)throw Error();
    const requirements=new Map(owned.plan.materializationRequirements.map(item=>[subjectKey(item.subject),item]));
    const mapping=new Map<string,string>(),targets=new Set<string>(),originalIds=new Set(owned.source.people.people.map(person=>person.id));
    for(const row of rows){
      if(!fields(row,['subject','personId'])||!shapes.subjectShape(row.subject)||row.subject.kind!=='future'||!personId(row.personId))throw Error();
      const key=subjectKey(row.subject),requirement=requirements.get(key);
      if(!requirement||mapping.has(key)||targets.has(row.personId)||originalIds.has(row.personId))throw Error();
      const person=owned.current.people.people[Number(row.personId.slice(7))-1];
      if(!person||person.id!==row.personId||person.lifeStatus!=='living'||compareDates(person.dateOfBirth,owned.plan.request.referenceDate)>0)throw Error();
      const birth=requirement.birth,age=ageOn(person.dateOfBirth,owned.plan.request.referenceDate);
      if(birth.kind==='birth-year-range'&&(person.dateOfBirth.year<birth.minimumYear||person.dateOfBirth.year>birth.maximumYear)||birth.kind==='completed-age-range'&&(age<birth.minimumAge||age>birth.maximumAge))throw Error();
      mapping.set(key,row.personId);targets.add(row.personId);
    }
    const resolve=(subject:FamilySubjectRefV1)=>subject.kind==='existing'?subject.personId:mapping.get(subjectKey(subject))!;
    const desiredParentages:ParentageRecordV1[]=owned.plan.parentages.map(edge=>({parentId:resolve(edge.parent),childId:resolve(edge.child),bases:edge.bases})).sort((a,b)=>compare(a.parentId,b.parentId)||compare(a.childId,b.childId));
    const union=new Map(owned.current.kinship.parentages.map(edge=>[JSON.stringify([edge.parentId,edge.childId]),edge]));
    const missingParentages:ParentageRecordV1[]=[];
    for(const edge of desiredParentages){
      const key=JSON.stringify([edge.parentId,edge.childId]),existing=union.get(key),missing=edge.bases.filter(basis=>!existing?.bases.includes(basis));
      if(missing.length)missingParentages.push({...edge,bases:missing});
      union.set(key,{...edge,bases:[...new Set([...(existing?.bases??[]),...edge.bases])].sort(compare)});
    }
    // This is a disposable validation candidate, not returned authoritative state.
    const candidate={version:1 as const,parentages:[...union.values()].sort((a,b)=>compare(a.parentId,b.parentId)||compare(a.childId,b.childId))};
    if(!validKinshipWithPeople(candidate,owned.current.people))throw Error();
    return immutable({version:1,policyId:owned.plan.request.policyId,policyFingerprint:owned.plan.policyFingerprint,evaluationFingerprint:owned.plan.evaluationFingerprint,referenceDate:owned.plan.request.referenceDate,desiredParentages,missingParentages});
  }catch{throw Error('Invalid or incompatible resolved Family plan.');}
}
export function validateResolvedFamilyPlan(value:unknown,plan:FamilyCompositionPlanV1,policy:FamilyCompositionPolicyV1,evaluationContext:FamilyCompositionContextV1,resolutions:readonly FamilySubjectResolutionV1[],current:Current):value is ResolvedFamilyPlanV1{
  try{return canonicalStringify(snapshot(value))===canonicalStringify(resolveFamilyCompositionPlan(plan,policy,evaluationContext,resolutions,current));}catch{return false;}
}
