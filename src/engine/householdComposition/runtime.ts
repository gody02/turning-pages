import {ageOn} from '../core/clock';
import {canonicalStringify, compare, derivationKey, fnv1a64, immutable, snapshot} from './data';
import {validateHouseholdCompositionPolicy} from './package';
import {keyedCompositionTicket} from './selection';
import {contextShape, requestShape} from './validation';
import type {HouseholdCompositionContextV1, HouseholdCompositionDiagnosticsV1, HouseholdCompositionPlanV1, HouseholdCompositionPolicyV1, HouseholdCompositionReadinessV1, HouseholdCompositionRequestV1} from './types';

export function diagnoseHouseholdComposition(policy:HouseholdCompositionPolicyV1,input:HouseholdCompositionRequestV1,context:HouseholdCompositionContextV1):HouseholdCompositionDiagnosticsV1{
  let ownedPolicy:HouseholdCompositionPolicyV1,request:HouseholdCompositionRequestV1,ownedContext:HouseholdCompositionContextV1;
  try{
    const p=snapshot(policy),r=snapshot(input),c=snapshot(context);
    if(!validateHouseholdCompositionPolicy(p) || !contextShape(c) || !requestShape(r,p,c))throw Error();
    ownedPolicy=p;request={...r,anchors:[...r.anchors].sort((a,b)=>compare(a.bindingId,b.bindingId))};ownedContext=c;
  }catch{throw Error('Invalid Household composition policy, request or context.');}
  // These are per-evaluation derivatives; canonical data never owns indexes or lazy state.
  const people=new Map(request.anchors.map(anchor=>[anchor.bindingId,ownedContext.people.people[Number(anchor.personId.slice(7))-1]]));
  const relevant=request.anchors.map(anchor=>({bindingId:anchor.bindingId,personId:anchor.personId,dateOfBirth:people.get(anchor.bindingId)!.dateOfBirth,lifeStatus:people.get(anchor.bindingId)!.lifeStatus}));
  const requestFingerprint=fnv1a64(canonicalStringify({request,anchors:relevant}));
  const eligible=ownedPolicy.templates.filter(template=>template.when.every(predicate=>{
    const age=ageOn(people.get(predicate.bindingId)!.dateOfBirth,request.referenceDate);
    return age>=predicate.completedAge.minimumAge && age<=predicate.completedAge.maximumAge;
  }));
  if(!eligible.length)throw Error('No eligible Household composition template.');
  let mass=0n;const bounds=eligible.map(template=>{mass+=BigInt(template.weight);return mass;});
  const key=derivationKey('household-composition','v1',ownedPolicy.algorithmId,ownedPolicy.fingerprint,request.requestKey,requestFingerprint);
  const draw=eligible.length===1?null:keyedCompositionTicket(request.rootSeed,key,Number(mass));
  const selected=eligible[draw===null?0:bounds.findIndex(bound=>draw.ticket<bound)];
  const plan:HouseholdCompositionPlanV1={version:1,request,policyFingerprint:ownedPolicy.fingerprint,requestFingerprint,templateId:selected.id,additionalMembers:selected.additionalMembers,households:selected.households.map(unit=>({householdSlotId:unit.householdSlotId,members:unit.members.map(ref=>ref.kind==='anchor'?{kind:'existing' as const,personId:people.get(ref.bindingId)!.id}:{kind:'materialize' as const,slotId:ref.slotId}).sort((a,b)=>compare(canonicalStringify(a),canonicalStringify(b)))}))};
  return immutable({version:1,plan,eligibleTemplateIds:eligible.map(template=>template.id),eligibleMass:Number(mass),ticket:draw?.ticket.toString()??null,attempts:draw?.attempts??0});
}
export function evaluateHouseholdComposition(policy:HouseholdCompositionPolicyV1,request:HouseholdCompositionRequestV1,context:HouseholdCompositionContextV1):HouseholdCompositionPlanV1{
  return diagnoseHouseholdComposition(policy,request,context).plan;
}
/** Independent acceptance: exact deterministic expansion, context digest and current preconditions. */
export function validateHouseholdCompositionPlan(value:unknown,policy:HouseholdCompositionPolicyV1,context:HouseholdCompositionContextV1):value is HouseholdCompositionPlanV1{
  try{
    const copy=snapshot(value) as HouseholdCompositionPlanV1;
    const expected=evaluateHouseholdComposition(policy,copy.request,context);
    return canonicalStringify(copy)===canonicalStringify(expected);
  }catch{return false;}
}
/** No materialization proof format is approved in v1. Empty requirements are vacuously ready;
 * every additional slot remains unproven, even if its logical constraint is valid. */
export function assessHouseholdCompositionReadiness(plan:HouseholdCompositionPlanV1,policy:HouseholdCompositionPolicyV1,context:HouseholdCompositionContextV1):HouseholdCompositionReadinessV1{
  if(!validateHouseholdCompositionPlan(plan,policy,context))throw Error('Invalid Household composition plan.');
  return immutable({status:plan.additionalMembers.length?'NOT_READY':'READY',requirements:plan.additionalMembers.map(slot=>({slotId:slot.slotId,status:'unproven' as const})),reasons:plan.additionalMembers.map(slot=>`Materialization is unproven for ${slot.slotId}; a separately approved coordinator must prove inventory, content and birth constraints.`)});
}
