import {ageOn,compareDates} from '../core/clock';
import {canonicalStringify,compare,derivationKey,earliestBirth,fnv1a64,immutable,intentKey,normalizeSubjects,reasons,snapshot,subjectKey} from './data';
import {validateRelationshipUnionCompositionPolicy} from './package';
import shapes from './validation';
import keyedTicket from './selection';
import type {RelationshipUnionCompositionContextV1,RelationshipUnionCompositionDiagnosticsV1,RelationshipUnionCompositionPlanV1,RelationshipUnionCompositionPolicyV1,RelationshipUnionCompositionRequestV1,RelationshipUnionCompositionTemplateV1,RelationshipMaterializationRequirementV1,RelationshipSubjectRefV1,RelationshipTemplateSubjectV1,PlannedPartnershipV1,PlannedFormalUnionV1} from './types';

function expand(t:RelationshipUnionCompositionTemplateV1,r:RelationshipUnionCompositionRequestV1,c:RelationshipUnionCompositionContextV1){
  const bindings=new Map(r.bindings.map(b=>[b.bindingId,b.subject])),unions=new Map(r.unionBindings.map(b=>[b.unionBindingId,b.unionId]));
  const ref=(v:RelationshipTemplateSubjectV1):RelationshipSubjectRefV1=>v.kind==='binding'?bindings.get(v.bindingId)!:{kind:'future',scopeId:r.relationshipScopeId,slotId:v.slotId};
  const partnerships:PlannedPartnershipV1[]=t.partnerships.map(p=>({subjects:normalizeSubjects([ref(p.subjects[0]),ref(p.subjects[1])])})).sort((a,b)=>compare(subjectKey(a.subjects[0]),subjectKey(b.subjects[0]))||compare(subjectKey(a.subjects[1]),subjectKey(b.subjects[1])));
  const formalUnions:PlannedFormalUnionV1[]=t.formalUnions.map(u=>{
    const subjects=normalizeSubjects([ref(u.subjects[0]),ref(u.subjects[1])]);
    return u.kind==='create-contract'?{kind:u.kind,contract:{scopeId:r.relationshipScopeId,contractSlotId:u.contractSlotId},subjects,unionKind:u.unionKind,formedOn:u.formedOn,separation:u.separation}:{kind:u.kind,unionId:unions.get(u.unionBindingId)!,subjects,unionKind:u.unionKind,separation:u.separation};
  }).sort((a,b)=>compare(intentKey(a),intentKey(b)));
  const requirements=new Map<string,RelationshipMaterializationRequirementV1>();
  for(const intent of [...partnerships,...formalUnions])for(const subject of intent.subjects)if(subject.kind==='future'){
    if(subject.scopeId===r.relationshipScopeId){const slot=t.additionalSubjects.find(s=>s.slotId===subject.slotId)!;requirements.set(subjectKey(subject),{subject,birth:slot.birth,origin:{kind:'relationship',templateId:t.id}});}
    else{const owner=c.borrowedSubjects.find(i=>i.scopeId===subject.scopeId)!,slot=owner.subjects.find(s=>s.slotId===subject.slotId)!;requirements.set(subjectKey(subject),{subject,birth:slot.birth,origin:{kind:'borrowed',producerId:owner.producerId,planFingerprint:owner.planFingerprint}});}
  }
  return {partnerships,formalUnions,materializationRequirements:[...requirements.values()].sort((a,b)=>compare(subjectKey(a.subject),subjectKey(b.subject)))};
}
export function diagnoseRelationshipUnionComposition(input:RelationshipUnionCompositionRequestV1,policy:RelationshipUnionCompositionPolicyV1,context:RelationshipUnionCompositionContextV1):RelationshipUnionCompositionDiagnosticsV1{
  let p:RelationshipUnionCompositionPolicyV1,r:RelationshipUnionCompositionRequestV1,c:RelationshipUnionCompositionContextV1;
  try{p=snapshot(policy);r=snapshot(input);c=snapshot(context);if(!validateRelationshipUnionCompositionPolicy(p)||!shapes.contextShape(c)||!shapes.requestShape(r,p,c))throw Error();}catch{throw Error('Invalid Relationship/Union composition policy, request or context.');}
  r={...r,bindings:[...r.bindings].sort((a,b)=>compare(a.bindingId,b.bindingId)),unionBindings:[...r.unionBindings].sort((a,b)=>compare(a.unionBindingId,b.unionBindingId))};
  const bound=new Map(r.bindings.map(b=>[b.bindingId,b.subject]));
  const facts=r.bindings.map(b=>{
    const s=b.subject;if(s.kind==='existing'){const person=c.people.people[Number(s.personId.slice(7))-1];return {bindingId:b.bindingId,personId:person.id,dateOfBirth:person.dateOfBirth,lifeStatus:person.lifeStatus};}
    const owner=c.borrowedSubjects.find(i=>i.scopeId===s.scopeId)!,slot=owner.subjects.find(x=>x.slotId===s.slotId)!;
    return {bindingId:b.bindingId,subject:s,birth:slot.birth,producerId:owner.producerId,planFingerprint:owner.planFingerprint};
  });
  const evaluationFingerprint=fnv1a64(canonicalStringify({request:r,facts}));
  const eligible:{template:RelationshipUnionCompositionTemplateV1;expanded:ReturnType<typeof expand>}[]=[],excludedTemplates:{templateId:string;reasons:string[]}[]=[];
  for(const t of p.templates){
    const failures:string[]=[];
    for(const q of t.when){const s=bound.get(q.bindingId)!;if(s.kind!=='existing')throw Error('Invalid existing fact binding.');const person=c.people.people[Number(s.personId.slice(7))-1];
      if(q.kind==='life-status'){if(person.lifeStatus!==q.lifeStatus)failures.push(`Life status predicate is not satisfied for ${q.bindingId}.`);}
      else{const age=ageOn(person.dateOfBirth,r.referenceDate);if(age<q.minimumAge||age>q.maximumAge)failures.push(`Completed-age predicate is not satisfied for ${q.bindingId}.`);}
    }
    const expanded=expand(t,r,c),requirements=new Map(expanded.materializationRequirements.map(x=>[subjectKey(x.subject),x]));
    for(const u of expanded.formalUnions)if(u.kind==='create-contract'&&u.formedOn!==null){
      if(compareDates(u.formedOn,r.referenceDate)>0)failures.push(`Formation date is after reference date for ${intentKey(u)}.`);
      for(const s of u.subjects){const first=s.kind==='existing'?c.people.people[Number(s.personId.slice(7))-1].dateOfBirth:earliestBirth(requirements.get(subjectKey(s))!.birth,r.referenceDate);
        if(compareDates(first,u.formedOn)>0)failures.push(`Formation predates every supported birth for ${subjectKey(s)}.`);}
    }
    if(failures.length)excludedTemplates.push({templateId:t.id,reasons:reasons(failures)});else eligible.push({template:t,expanded});
  }
  if(!eligible.length)throw Error('No eligible Relationship/Union composition template.');
  let mass=0n;const bounds=eligible.map(x=>{mass+=BigInt(x.template.weight);if(mass>BigInt(Number.MAX_SAFE_INTEGER))throw Error('Unsafe eligible selection mass.');return mass;});
  const key=derivationKey('relationship-union-composition','v1',p.algorithmId,p.fingerprint,evaluationFingerprint),draw=eligible.length===1?null:keyedTicket(r.rootSeed,key,Number(mass));
  const selected=eligible[draw===null?0:bounds.findIndex(b=>draw.ticket<b)];
  const semantics={version:1 as const,request:r,policyFingerprint:p.fingerprint,evaluationFingerprint,templateId:selected.template.id,...selected.expanded};
  const plan:RelationshipUnionCompositionPlanV1={...semantics,planFingerprint:fnv1a64(canonicalStringify(semantics))};
  return immutable({version:1,plan,eligibleTemplateIds:eligible.map(x=>x.template.id),excludedTemplates,eligibleMass:Number(mass),ticket:draw?.ticket.toString()??null,attempts:draw?.attempts??0});
}
export function evaluateRelationshipUnionComposition(request:RelationshipUnionCompositionRequestV1,policy:RelationshipUnionCompositionPolicyV1,context:RelationshipUnionCompositionContextV1):RelationshipUnionCompositionPlanV1{return diagnoseRelationshipUnionComposition(request,policy,context).plan;}
export function validateRelationshipUnionCompositionPlan(value:unknown,policy:RelationshipUnionCompositionPolicyV1,context:RelationshipUnionCompositionContextV1):value is RelationshipUnionCompositionPlanV1{
  try{const copy=snapshot(value) as RelationshipUnionCompositionPlanV1;return canonicalStringify(copy)===canonicalStringify(evaluateRelationshipUnionComposition(copy.request,policy,context));}catch{return false;}
}
