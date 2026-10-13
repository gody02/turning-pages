import {ageOn,compareDates} from '../core/clock';
import {validPeople} from '../human/person';
import {validPartnershipWithPeople} from '../partnership/validation';
import type {PartnershipRecordV1} from '../partnership/types';
import {validFormalUnionWithPeople} from '../formalUnion/validation';
import type {FormalUnionKindRegistryV1} from '../formalUnion/types';
import {assessRelationshipUnionKindResolution} from './kinds';
import {canonicalStringify,compare,contractKey,dense,fields,fingerprintShape,immutable,intentKey,personId,reasons,snapshot,subjectKey,unionId} from './data';
import {validateRelationshipUnionCompositionPlan} from './runtime';
import shapes from './validation';
import type {RelationshipOriginalPlanV1,RelationshipPartnershipContextV1,RelationshipFormalUnionContextV1,RelationshipUnionCurrentContextV1,RelationshipCompatibilityV1,RelationshipContractBindingV1,RelationshipUnionCompositionReadinessV1,RelationshipSubjectResolutionV1,RelationshipSubjectRefV1,PlannedFormalUnionV1,ResolvedFormalUnionIntentV1,ResolvedRelationshipUnionPlanV1,RelationshipSatisfiedUnionV1} from './types';

type Pair=readonly [string,string];
const pair=(a:string,b:string):Pair=>compare(a,b)<0?[a,b]:[b,a];
const pairCompare=(a:Pair,b:Pair)=>compare(a[0],b[0])||compare(a[1],b[1]);
const pairKey=(ids:Pair)=>JSON.stringify(ids);
function own(original:RelationshipOriginalPlanV1){
  try{const o=snapshot(original);if(!fields(o,['plan','policy','context'])||!validateRelationshipUnionCompositionPlan(o.plan,o.policy,o.context))throw Error();return o;}
  catch{throw Error('Invalid original Relationship/Union plan.');}
}
function currentPartnership(current:RelationshipPartnershipContextV1){
  try{const c=snapshot(current);if(!fields(c,['people','partnership','referenceDate'])||!shapes.date(c.referenceDate)||!validPartnershipWithPeople(c.partnership,c.people,c.referenceDate))throw Error();return c;}
  catch{throw Error('Invalid Partnership compatibility context.');}
}
function currentUnion(current:RelationshipFormalUnionContextV1){
  try{const c=snapshot(current);if(!fields(c,['people','formalUnion','referenceDate'])||!shapes.date(c.referenceDate)||!validFormalUnionWithPeople(c.formalUnion,c.people,c.referenceDate))throw Error();return c;}
  catch{throw Error('Invalid FormalUnion compatibility context.');}
}
function changed(o:RelationshipOriginalPlanV1,c:Pick<RelationshipUnionCurrentContextV1,'people'|'referenceDate'>):string[]{
  const failures:string[]=[];
  if(compareDates(o.plan.request.referenceDate,c.referenceDate)!==0)failures.push('Reference date changed; reevaluation is required.');
  for(const b of o.plan.request.bindings)if(b.subject.kind==='existing'){
    const id=b.subject.personId,before=o.context.people.people[Number(id.slice(7))-1],after=c.people.people[Number(id.slice(7))-1];
    if(!after||after.id!==id)failures.push(`Existing subject ${id} does not resolve.`);
    else if(before.lifeStatus!==after.lifeStatus||compareDates(before.dateOfBirth,after.dateOfBirth)!==0)failures.push(`Existing facts changed for ${id}; reevaluation is required.`);
  }return failures;
}
const result=(failures:readonly string[],unresolved:readonly string[]):RelationshipCompatibilityV1=>immutable({status:failures.length?'INCOMPATIBLE':unresolved.length?'UNRESOLVED':'COMPATIBLE',reasons:reasons(failures.length?failures:unresolved)});
const resolvedIds=(subjects:readonly [RelationshipSubjectRefV1,RelationshipSubjectRefV1],mapping:ReadonlyMap<string,string>):Pair|null=>{
  const ids=subjects.map(s=>s.kind==='existing'?s.personId:mapping.get(subjectKey(s)));
  return ids[0]&&ids[1]?pair(ids[0],ids[1]):null;
};
function partnershipAssessment(o:RelationshipOriginalPlanV1,c:RelationshipPartnershipContextV1,mapping:ReadonlyMap<string,string>){
  const failures=changed(o,c),unresolved:string[]=[],desired:PartnershipRecordV1[]=[];
  for(const p of o.plan.partnerships){
    for(const s of p.subjects){const id=s.kind==='existing'?s.personId:mapping.get(subjectKey(s));if(id){const person=c.people.people[Number(id.slice(7))-1];if(!person||person.id!==id||person.lifeStatus!=='living'||compareDates(person.dateOfBirth,c.referenceDate)>0)failures.push(`Partnership subject ${id} is not a living supported Person.`);}}
    const ids=resolvedIds(p.subjects,mapping);if(ids){if(ids[0]===ids[1])failures.push('Resolved Partnership is a self pair.');desired.push({personIds:ids});}else unresolved.push(`Partnership subjects are unresolved for ${canonicalStringify(p.subjects)}.`);
  }
  desired.sort((a,b)=>pairCompare(a.personIds,b.personIds));
  if(new Set(desired.map(p=>pairKey(p.personIds))).size!==desired.length)failures.push('Resolved Partnerships have duplicate pairs.');
  const union=new Map(c.partnership.partnerships.map(p=>[pairKey(p.personIds),p]));
  const missing=desired.filter(p=>!union.has(pairKey(p.personIds)));for(const p of desired)union.set(pairKey(p.personIds),p);
  if(!validPartnershipWithPeople({version:1,partnerships:[...union.values()].sort((a,b)=>pairCompare(a.personIds,b.personIds))},c.people,c.referenceDate))failures.push('Desired Partnership union fails frozen validation.');
  return {compatibility:result(failures,unresolved),desired,missing};
}
function bindingsView(o:RelationshipOriginalPlanV1,bindings?:readonly RelationshipContractBindingV1[]){
  const rows=bindings===undefined?[]:snapshot(bindings);if(!dense(rows))throw Error('Invalid contract identity bindings.');
  const creates=new Set(o.plan.formalUnions.flatMap(u=>u.kind==='create-contract'?[contractKey(u.contract)]:[])),mapping=new Map<string,string>(),targets=new Set<string>();
  for(const b of rows){
    if(!fields(b,['contract','planFingerprint','unionId'])||!fields(b.contract,['scopeId','contractSlotId'])||!fingerprintShape(b.planFingerprint)||b.planFingerprint!==o.plan.planFingerprint||!unionId(b.unionId))throw Error('Invalid contract identity binding.');
    const key=contractKey(b.contract);if(!creates.has(key)||mapping.has(key)||targets.has(b.unionId))throw Error('Duplicate or unrelated contract identity binding.');
    mapping.set(key,b.unionId);targets.add(b.unionId);
  }return mapping;
}
function unionAssessment(o:RelationshipOriginalPlanV1,c:RelationshipFormalUnionContextV1,mapping:ReadonlyMap<string,string>,bindings?:readonly RelationshipContractBindingV1[]){
  const failures=changed(o,c),unresolved:string[]=[],bound=bindingsView(o,bindings),records=new Map(c.formalUnion.unions.map(u=>[u.id,u])),active=new Map(c.formalUnion.unions.filter(u=>u.standing.kind==='in-force').map(u=>[JSON.stringify([u.personIds,u.kindId]),u.id]));
  const desired:ResolvedFormalUnionIntentV1[]=[],missing:Extract<ResolvedFormalUnionIntentV1,{kind:'create-contract'}>[]=[],satisfied:RelationshipSatisfiedUnionV1[]=[],cells=new Set<string>(),claimed=new Set<string>();let pending=0;
  for(const u of o.plan.formalUnions){
    const ids=resolvedIds(u.subjects,mapping),target=u.kind==='assert-existing'?u.unionId:bound.get(contractKey(u.contract));
    if(ids){
      if(ids[0]===ids[1])failures.push(`Resolved FormalUnion is a self pair for ${intentKey(u)}.`);
      const cell=JSON.stringify([ids,u.unionKind.kindId]);if(cells.has(cell))failures.push('Resolved FormalUnion intentions duplicate an active pair/kind cell.');cells.add(cell);
      const intent:ResolvedFormalUnionIntentV1=u.kind==='create-contract'?{kind:u.kind,contract:u.contract,personIds:ids,unionKind:u.unionKind,formedOn:u.formedOn,separation:u.separation}:{kind:u.kind,unionId:u.unionId,personIds:ids,unionKind:u.unionKind,separation:u.separation};desired.push(intent);
      for(const id of ids){const p=c.people.people[Number(id.slice(7))-1];if(!p||p.id!==id||compareDates(p.dateOfBirth,c.referenceDate)>0||p.diedAt&&compareDates(p.diedAt,c.referenceDate)>0)failures.push(`FormalUnion participant ${id} does not resolve at reference date.`);else if(u.kind==='create-contract'&&u.formedOn!==null&&compareDates(u.formedOn,p.dateOfBirth)<0)failures.push(`Formation precedes participant birth for ${intentKey(u)}.`);}
      if(u.kind==='create-contract'&&u.formedOn!==null&&compareDates(u.formedOn,c.referenceDate)>0)failures.push(`Formation is after reference date for ${intentKey(u)}.`);
      if(!target&&intent.kind==='create-contract'){if(active.has(cell))failures.push(`Independent new contract conflicts with occupied active cell for ${intentKey(u)}.`);missing.push(intent);}
    }else unresolved.push(`FormalUnion subjects are unresolved for ${intentKey(u)}.`);
    if(target){
      if(claimed.has(target))failures.push('Different Union intentions claim the same durable contract.');claimed.add(target);
      const record=records.get(target);
      if(!record)failures.push(`Explicit FormalUnion ${target} does not resolve.`);
      else{
        if(record.kindId!==u.unionKind.kindId||record.standing.kind!=='in-force'||record.standing.separation!==u.separation||ids&&pairKey(record.personIds)!==pairKey(ids)||u.kind==='create-contract'&&canonicalStringify(record.formedOn)!==canonicalStringify(u.formedOn))failures.push(`Explicit FormalUnion ${target} conflicts with intended contract truth.`);
        for(const s of u.subjects)if(s.kind==='existing'&&!record.personIds.includes(s.personId))failures.push(`Explicit FormalUnion ${target} has different participants.`);
        if(ids)satisfied.push({target:u.kind==='create-contract'?{kind:u.kind,contract:u.contract}:{kind:u.kind,unionId:u.unionId},unionId:target});
      }
    }else pending++;
  }
  if(BigInt(c.formalUnion.nextSequence)+BigInt(pending)>BigInt(Number.MAX_SAFE_INTEGER))failures.push('FormalUnion allocator capacity cannot satisfy pending contracts.');
  return {compatibility:result(failures,unresolved),desired,missing,satisfied};
}
export function assessRelationshipUnionPlanAgainstPartnership(original:RelationshipOriginalPlanV1,current:RelationshipPartnershipContextV1):RelationshipCompatibilityV1{return partnershipAssessment(own(original),currentPartnership(current),new Map()).compatibility;}
export function assessRelationshipUnionPlanAgainstFormalUnion(original:RelationshipOriginalPlanV1,current:RelationshipFormalUnionContextV1,bindings?:readonly RelationshipContractBindingV1[]):RelationshipCompatibilityV1{return unionAssessment(own(original),currentUnion(current),new Map(),bindings).compatibility;}
export function assessRelationshipUnionCompositionReadiness(original:RelationshipOriginalPlanV1,current:RelationshipUnionCurrentContextV1,kinds?:FormalUnionKindRegistryV1,bindings?:readonly RelationshipContractBindingV1[]):RelationshipUnionCompositionReadinessV1{
  const o=own(original),c=snapshot(current);if(!fields(c,['people','partnership','formalUnion','referenceDate']))throw Error('Invalid readiness context.');
  const p={people:c.people,partnership:c.partnership,referenceDate:c.referenceDate},u={people:c.people,formalUnion:c.formalUnion,referenceDate:c.referenceDate};
  return immutable({materialization:{status:o.plan.materializationRequirements.length?'NOT_READY':'READY',requirements:o.plan.materializationRequirements.map(r=>({subject:r.subject,status:'unproven' as const})),reasons:o.plan.materializationRequirements.map(r=>`Materialization is unproven for ${subjectKey(r.subject)}; no capability proof is approved in v1.`).sort(compare)},compatibility:{partnership:partnershipAssessment(o,currentPartnership(p),new Map()).compatibility,formalUnion:unionAssessment(o,currentUnion(u),new Map(),bindings).compatibility},kinds:assessRelationshipUnionKindResolution(o,u,kinds)});
}
export function resolveRelationshipUnionCompositionPlan(original:RelationshipOriginalPlanV1,resolutions:readonly RelationshipSubjectResolutionV1[],current:RelationshipUnionCurrentContextV1,kinds?:FormalUnionKindRegistryV1,bindings?:readonly RelationshipContractBindingV1[]):ResolvedRelationshipUnionPlanV1{
  try{
    const o=own(original),c=snapshot(current),rows=snapshot(resolutions);
    if(!fields(c,['people','partnership','formalUnion','referenceDate'])||!validPeople(c.people)||!dense(rows)||rows.length!==o.plan.materializationRequirements.length||changed(o,c).length)throw Error();
    const requirements=new Map(o.plan.materializationRequirements.map(r=>[subjectKey(r.subject),r])),mapping=new Map<string,string>(),targets=new Set<string>(),originalIds=new Set(o.context.people.people.map(p=>p.id));
    for(const row of rows){
      if(!fields(row,['subject','personId'])||!shapes.subjectShape(row.subject)||row.subject.kind!=='future'||!personId(row.personId))throw Error();
      const key=subjectKey(row.subject),requirement=requirements.get(key),person=c.people.people[Number(row.personId.slice(7))-1];
      if(!requirement||mapping.has(key)||targets.has(row.personId)||originalIds.has(row.personId)||!person||person.id!==row.personId||person.lifeStatus!=='living'||compareDates(person.dateOfBirth,c.referenceDate)>0)throw Error();
      const birth=requirement.birth,age=ageOn(person.dateOfBirth,c.referenceDate);
      if(birth.kind==='birth-year-range'&&(person.dateOfBirth.year<birth.minimumYear||person.dateOfBirth.year>birth.maximumYear)||birth.kind==='completed-age-range'&&(age<birth.minimumAge||age>birth.maximumAge))throw Error();
      mapping.set(key,row.personId);targets.add(row.personId);
    }
    const p=currentPartnership({people:c.people,partnership:c.partnership,referenceDate:c.referenceDate}),u=currentUnion({people:c.people,formalUnion:c.formalUnion,referenceDate:c.referenceDate});
    const pa=partnershipAssessment(o,p,mapping),ua=unionAssessment(o,u,mapping,bindings),kr=assessRelationshipUnionKindResolution(o,u,kinds);
    if(pa.compatibility.status!=='COMPATIBLE'||ua.compatibility.status!=='COMPATIBLE'||kr.status!=='RESOLVED')throw Error();
    return immutable({version:1,policyId:o.plan.request.policyId,policyFingerprint:o.plan.policyFingerprint,evaluationFingerprint:o.plan.evaluationFingerprint,planFingerprint:o.plan.planFingerprint,referenceDate:o.plan.request.referenceDate,desiredPartnerships:pa.desired,missingPartnerships:pa.missing,desiredFormalUnions:ua.desired,missingFormalUnions:ua.missing,satisfiedFormalUnions:ua.satisfied});
  }catch{throw Error('Invalid or incompatible resolved Relationship/Union plan.');}
}
export function validateResolvedRelationshipUnionCompositionPlan(value:unknown,original:RelationshipOriginalPlanV1,resolutions:readonly RelationshipSubjectResolutionV1[],current:RelationshipUnionCurrentContextV1,kinds?:FormalUnionKindRegistryV1,bindings?:readonly RelationshipContractBindingV1[]):value is ResolvedRelationshipUnionPlanV1{
  try{return canonicalStringify(snapshot(value))===canonicalStringify(resolveRelationshipUnionCompositionPlan(original,resolutions,current,kinds,bindings));}catch{return false;}
}
