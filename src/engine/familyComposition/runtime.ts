import {ageOn} from '../core/clock';
import {acyclic,canonicalStringify,compare,derivationKey,fnv1a64,immutable,snapshot,subjectKey} from './data';
import {validateFamilyCompositionPolicy} from './package';
import shapes from './validation';
import keyedFamilyTicket from './selection';
import type {FamilyCompositionContextV1,FamilyCompositionDiagnosticsV1,FamilyCompositionPlanV1,FamilyCompositionPolicyV1,FamilyCompositionRequestV1,FamilyCompositionTemplateV1,FamilyMaterializationRequirementV1,FamilySubjectRefV1,FamilyTemplateSubjectV1,PlannedParentageV1} from './types';

function expand(template:FamilyCompositionTemplateV1,request:FamilyCompositionRequestV1,context:FamilyCompositionContextV1){
  const bindings=new Map(request.bindings.map(binding=>[binding.bindingId,binding.subject]));
  const ref=(value:FamilyTemplateSubjectV1):FamilySubjectRefV1=>value.kind==='binding'?bindings.get(value.bindingId)!:{kind:'future',scopeId:request.familyScopeId,slotId:value.slotId};
  const parentages:PlannedParentageV1[]=template.parentages.map(edge=>({parent:ref(edge.parent),child:ref(edge.child),bases:edge.bases})).sort((a,b)=>compare(subjectKey(a.parent),subjectKey(b.parent))||compare(subjectKey(a.child),subjectKey(b.child)));
  const requirements=new Map<string,FamilyMaterializationRequirementV1>();
  for(const edge of parentages)for(const subject of [edge.parent,edge.child])if(subject.kind==='future'){
    if(subject.scopeId===request.familyScopeId){
      const slot=template.additionalSubjects.find(slot=>slot.slotId===subject.slotId)!;
      requirements.set(subjectKey(subject),{subject,birth:slot.birth,origin:{kind:'family',templateId:template.id}});
    }else{
      const owner=context.borrowedSubjects.find(item=>item.scopeId===subject.scopeId)!,slot=owner.subjects.find(item=>item.slotId===subject.slotId)!;
      requirements.set(subjectKey(subject),{subject,birth:slot.birth,origin:{kind:'borrowed',producerId:owner.producerId,planFingerprint:owner.planFingerprint}});
    }
  }
  return {parentages,materializationRequirements:[...requirements.values()].sort((a,b)=>compare(subjectKey(a.subject),subjectKey(b.subject)))};
}
function unionCompatible(parentages:readonly PlannedParentageV1[],context:FamilyCompositionContextV1){
  return acyclic([...context.kinship.parentages.map(edge=>({parent:subjectKey({kind:'existing',personId:edge.parentId}),child:subjectKey({kind:'existing',personId:edge.childId})})),...parentages.map(edge=>({parent:subjectKey(edge.parent),child:subjectKey(edge.child)}))]);
}
export function diagnoseFamilyComposition(policy:FamilyCompositionPolicyV1,input:FamilyCompositionRequestV1,context:FamilyCompositionContextV1):FamilyCompositionDiagnosticsV1{
  let p:FamilyCompositionPolicyV1,r:FamilyCompositionRequestV1,c:FamilyCompositionContextV1;
  try{p=snapshot(policy);r=snapshot(input);c=snapshot(context);if(!validateFamilyCompositionPolicy(p)||!shapes.contextShape(c)||!shapes.requestShape(r,p,c))throw Error();}catch{throw Error('Invalid Family composition policy, request or context.');}
  r={...r,bindings:[...r.bindings].sort((a,b)=>compare(a.bindingId,b.bindingId))};
  const bound=new Map(r.bindings.map(binding=>[binding.bindingId,binding.subject]));
  const facts=r.bindings.map(binding=>{
    if(binding.subject.kind==='existing'){
      const person=c.people.people[Number(binding.subject.personId.slice(7))-1];
      return {bindingId:binding.bindingId,personId:person.id,dateOfBirth:person.dateOfBirth,lifeStatus:person.lifeStatus};
    }
    const subject=binding.subject,owner=c.borrowedSubjects.find(item=>item.scopeId===subject.scopeId)!,slot=owner.subjects.find(item=>item.slotId===subject.slotId)!;
    return {bindingId:binding.bindingId,subject,birth:slot.birth,producerId:owner.producerId,planFingerprint:owner.planFingerprint};
  });
  const evaluationFingerprint=fnv1a64(canonicalStringify({request:r,facts,kinshipFingerprint:fnv1a64(canonicalStringify(c.kinship))}));
  const eligible:Readonly<{template:FamilyCompositionTemplateV1;expanded:ReturnType<typeof expand>}>[]=[],excludedTemplates:{templateId:string;reasons:string[]}[]=[];
  for(const template of p.templates){
    const reasons:string[]=[];
    for(const predicate of template.when){
      const ref=bound.get(predicate.bindingId)!;if(ref.kind!=='existing')throw Error('Invalid existing Family fact binding.');
      const person=c.people.people[Number(ref.personId.slice(7))-1];
      if(predicate.kind==='life-status'){if(person.lifeStatus!==predicate.lifeStatus)reasons.push(`Life status predicate is not satisfied for ${predicate.bindingId}.`);}
      else{const age=ageOn(person.dateOfBirth,r.referenceDate);if(age<predicate.minimumAge||age>predicate.maximumAge)reasons.push(`Completed-age predicate is not satisfied for ${predicate.bindingId}.`);}
    }
    const expanded=expand(template,r,c);
    if(!unionCompatible(expanded.parentages,c))reasons.push('Desired parentage conflicts with the current Kinship union graph.');
    if(reasons.length)excludedTemplates.push({templateId:template.id,reasons:[...new Set(reasons)].sort(compare)});else eligible.push({template,expanded});
  }
  if(!eligible.length)throw Error('No eligible compatible Family composition template.');
  let mass=0n;const bounds=eligible.map(item=>{mass+=BigInt(item.template.weight);return mass;});
  const key=derivationKey('family-composition','v1',p.algorithmId,p.fingerprint,evaluationFingerprint);
  const draw=eligible.length===1?null:keyedFamilyTicket(r.rootSeed,key,Number(mass));
  const selected=eligible[draw===null?0:bounds.findIndex(bound=>draw.ticket<bound)];
  const plan:FamilyCompositionPlanV1={version:1,request:r,policyFingerprint:p.fingerprint,evaluationFingerprint,templateId:selected.template.id,...selected.expanded};
  return immutable({version:1,plan,eligibleTemplateIds:eligible.map(item=>item.template.id),excludedTemplates,eligibleMass:Number(mass),ticket:draw?.ticket.toString()??null,attempts:draw?.attempts??0});
}
export function evaluateFamilyComposition(policy:FamilyCompositionPolicyV1,request:FamilyCompositionRequestV1,context:FamilyCompositionContextV1):FamilyCompositionPlanV1{
  return diagnoseFamilyComposition(policy,request,context).plan;
}
/** Acceptance independently replays policy, original facts, eligibility and exact expansion. */
export function validateFamilyCompositionPlan(value:unknown,policy:FamilyCompositionPolicyV1,evaluationContext:FamilyCompositionContextV1):value is FamilyCompositionPlanV1{
  try{const copy=snapshot(value) as FamilyCompositionPlanV1;return canonicalStringify(copy)===canonicalStringify(evaluateFamilyComposition(policy,copy.request,evaluationContext));}catch{return false;}
}
