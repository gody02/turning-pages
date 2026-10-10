import {describe,expect,it} from 'vitest';
import {birthConstraintAtDate,birthConstraintShape} from '../householdComposition/validation';
import {createRandomness,float} from '../core/rng';
import {acyclic,canonicalStringify,snapshot} from './data';
import {createFamilyCompositionRegistry,resolveFamilyCompositionPolicy,validateFamilyCompositionPolicy,withFamilyCompositionPolicyFingerprint} from './package';
import {diagnoseFamilyComposition,evaluateFamilyComposition,validateFamilyCompositionPlan} from './runtime';
import {validateFamilyCompositionRequest} from './validation';
import shapes from './validation';
import {assessFamilyCompositionReadiness} from './compatibility';
import {currentView,additional,binding,fixtureContext,fixtureDate,fixtureInput,fixturePolicy,fixtureRequest,fixtureTemplate,futureFixture} from './fixtures';
import type {FamilyCompositionPolicyInputV1,FamilyCompositionRequestV1} from './types';

describe('pure Family Composition planning',()=>{
  it('plans exact existing-Person positive truth without authoritative effects',()=>{
    const context=fixtureContext(),policy=fixturePolicy(),request=fixtureRequest(),before=structuredClone({context,policy,request});
    const plan=evaluateFamilyComposition(policy,request,context);
    expect(plan.parentages).toEqual([{parent:{kind:'existing',personId:'person:2'},child:{kind:'existing',personId:'person:1'},bases:['genetic','legal']}]);
    expect(plan.materializationRequirements).toEqual([]);
    expect(validateFamilyCompositionPlan(plan,policy,context)).toBe(true);
    expect(assessFamilyCompositionReadiness(plan,policy,context,currentView(context))).toEqual({materialization:{status:'READY',requirements:[],reasons:[]},application:{status:'COMPATIBLE',reasons:[]}});
    expect({context,policy,request}).toEqual(before);
  });
  it('owns Family-only non-resident future requirements, not Person IDs or domestic roles',()=>{
    const {policy,request,context}=futureFixture(),plan=evaluateFamilyComposition(policy,request,context);
    expect(plan.materializationRequirements).toEqual([{subject:{kind:'future',scopeId:request.familyScopeId,slotId:'relative.parent'},birth:{kind:'completed-age-range',minimumAge:40,maximumAge:60},origin:{kind:'family',templateId:'structure.parentage'}}]);
    const readiness=assessFamilyCompositionReadiness(plan,policy,context,currentView(context));
    expect(readiness.materialization.status).toBe('NOT_READY');expect(readiness.materialization.requirements[0].status).toBe('unproven');expect(readiness.application.status).toBe('UNRESOLVED');
    expect(Object.keys(plan)).toEqual(['version','request','policyFingerprint','evaluationFingerprint','templateId','parentages','materializationRequirements']);
    expect(context.people.nextSequence).toBe(3);expect(context.kinship.parentages).toEqual([]);
  });
  it('supports two future subjects and zero existing anchors without inventing IDs',()=>{
    const template={...fixtureTemplate(),additionalSubjects:[{slotId:'relative.parent',birth:{kind:'any-living' as const}},{slotId:'relative.child',birth:{kind:'any-living' as const}}],parentages:[{parent:additional('relative.parent'),child:additional('relative.child'),bases:['genetic' as const]}]};
    const policy=withFamilyCompositionPolicyFingerprint({...fixtureInput([template]),bindings:[]}),context=fixtureContext(),request={...fixtureRequest(),bindings:[]};
    const plan=evaluateFamilyComposition(policy,request,context);
    expect(plan.materializationRequirements).toHaveLength(2);expect(plan.parentages.every(edge=>edge.parent.kind==='future'&&edge.child.kind==='future')).toBe(true);
    expect(assessFamilyCompositionReadiness(plan,policy,context,currentView(context)).materialization.requirements.every(item=>item.status==='unproven')).toBe(true);
  });
  it('supports unknown parentage through a zero-edge plan without placeholders',()=>{
    const policy=fixturePolicy([{...fixtureTemplate(),parentages:[]}]),context=fixtureContext(),plan=evaluateFamilyComposition(policy,fixtureRequest(),context);
    expect(plan.parentages).toEqual([]);expect(plan.materializationRequirements).toEqual([]);expect(context.people.people).toHaveLength(2);
  });
  it('uses only explicit existing fact predicates and Gregorian age',()=>{
    const template={...fixtureTemplate(),when:[{kind:'completed-age-range' as const,bindingId:'anchor.parent',minimumAge:52,maximumAge:52},{kind:'life-status' as const,bindingId:'anchor.parent',lifeStatus:'living' as const}]};
    const policy=fixturePolicy([template]),context=fixtureContext();
    expect(evaluateFamilyComposition(policy,fixtureRequest(),context).templateId).toBe(template.id);
    expect(()=>evaluateFamilyComposition(policy,{...fixtureRequest(),referenceDate:{year:2032,month:6,day:29}},context)).toThrow('No eligible');
  });
  it('reports excluded options before weighted choice, without template retries',()=>{
    const context=fixtureContext(),template=fixtureTemplate(),policy=fixturePolicy([{...template,id:'structure.ineligible',weight:99,when:[{kind:'completed-age-range',bindingId:'anchor.child',minimumAge:0,maximumAge:1}]},{...template,id:'structure.eligible',weight:1}]);
    const result=diagnoseFamilyComposition(policy,fixtureRequest(),context);
    expect(result.eligibleTemplateIds).toEqual(['structure.eligible']);expect(result.eligibleMass).toBe(1);expect(result.ticket).toBeNull();expect(result.attempts).toBe(0);expect(result.excludedTemplates).toHaveLength(1);
  });
  it('is deterministic and witnesses alternatives over explicit fixed keys',()=>{
    const policy=fixturePolicy([fixtureTemplate('structure.a'),fixtureTemplate('structure.b')]),context=fixtureContext(),request=fixtureRequest();
    const outputs=Array.from({length:32},(_,index)=>evaluateFamilyComposition(policy,{...request,requestKey:`family.fixed-key-${index}`},context).templateId);
    expect(new Set(outputs)).toEqual(new Set(['structure.a','structure.b']));
    expect(outputs.slice(0,8)).toEqual(['structure.b','structure.a','structure.a','structure.a','structure.a','structure.b','structure.b','structure.a']);
    expect(evaluateFamilyComposition(policy,request,context)).toEqual(evaluateFamilyComposition(structuredClone(policy),structuredClone(request),structuredClone(context)));
    expect(diagnoseFamilyComposition(policy,request,context).ticket).toMatch(/^\d+$/);
  });
  it('does not consume any externally owned sequential random stream or time/effect container',()=>{
    const randomness=createRandomness(73);float(randomness,'synthetic.stream');
    const authority={randomness,clock:{date:fixtureDate},scheduler:[],history:[],events:[],causality:[]},before=structuredClone(authority),context=fixtureContext();
    evaluateFamilyComposition(fixturePolicy([fixtureTemplate('structure.a'),fixtureTemplate('structure.b')]),fixtureRequest(),context);
    expect(authority).toEqual(before);expect(float(randomness,'synthetic.stream')).toBe(float(before.randomness,'synthetic.stream'));
  });
  it('normalizes nonsemantic authoring and request order while rejecting registered disorder',()=>{
    const input=fixtureInput([fixtureTemplate('structure.b'),fixtureTemplate('structure.a')]),shuffled={...input,bindings:[...input.bindings].reverse(),templates:[...input.templates].reverse()};
    const first=withFamilyCompositionPolicyFingerprint(input),second=withFamilyCompositionPolicyFingerprint(shuffled),context=fixtureContext(),request=fixtureRequest();
    expect(first).toEqual(second);expect(evaluateFamilyComposition(first,request,context)).toEqual(evaluateFamilyComposition(second,{...request,bindings:[...request.bindings].reverse()},context));
    expect(validateFamilyCompositionPolicy({...first,templates:[...first.templates].reverse()})).toBe(false);
  });
  it('orders supplementary Unicode metadata by code point, independent of input order',()=>{
    const input={...fixtureInput(),limitations:['\u{10000}','\ue000']};
    const policy=withFamilyCompositionPolicyFingerprint(input);
    expect(policy.limitations).toEqual(['\ue000','\u{10000}']);
    expect(withFamilyCompositionPolicyFingerprint({...input,limitations:[...input.limitations].reverse()})).toEqual(policy);
  });
  it('accepts maximum-safe exact policy mass and rejects total overflow',()=>{
    const input=fixtureInput([{...fixtureTemplate('structure.a'),weight:Number.MAX_SAFE_INTEGER-1},fixtureTemplate('structure.b')]),policy=withFamilyCompositionPolicyFingerprint(input);
    expect(diagnoseFamilyComposition(policy,fixtureRequest(),fixtureContext()).eligibleMass).toBe(Number.MAX_SAFE_INTEGER);
    expect(()=>withFamilyCompositionPolicyFingerprint({...input,templates:[{...input.templates[0],weight:Number.MAX_SAFE_INTEGER},input.templates[1]]})).toThrow();
  });
  it('pins immutable registry semantics and refuses identity reuse/mismatched manifests',()=>{
    const policy=fixturePolicy(),manifest=[{policyId:policy.policyId,fingerprint:policy.fingerprint}],registry=createFamilyCompositionRegistry([policy],manifest);
    expect(resolveFamilyCompositionPolicy(registry,policy.policyId)).toEqual(policy);
    const changed=withFamilyCompositionPolicyFingerprint({...fixtureInput(),limitations:['Material changed semantics.']});expect(changed.fingerprint).not.toBe(policy.fingerprint);
    expect(()=>createFamilyCompositionRegistry([changed],manifest)).toThrow();expect(()=>createFamilyCompositionRegistry([policy,policy],[...manifest,...manifest])).toThrow();
    expect(()=>resolveFamilyCompositionPolicy(registry,'family.unknown-v1')).toThrow();
  });
  it('deeply owns policies and results, leaving input unfrozen and alias-safe',()=>{
    const input=fixtureInput(),context=fixtureContext(),request=fixtureRequest(),policy=withFamilyCompositionPolicyFingerprint(input),plan=evaluateFamilyComposition(policy,request,context);
    expect(Object.isFrozen(input)).toBe(false);expect(Object.isFrozen(plan.parentages[0].bases)).toBe(true);expect(Object.isFrozen(plan.request.referenceDate)).toBe(true);
    expect(()=>{(plan.parentages[0].bases as string[]).push('legal');}).toThrow();
    (input.templates[0].parentages[0].bases as string[]).push('gestational');
    expect(policy.templates[0].parentages[0].bases).toEqual(['genetic','legal']);
    const original=structuredClone(plan);(request.bindings as unknown as {subject:{personId:string}}[])[0].subject.personId='person:1';expect(plan).toEqual(original);
  });
  it.each(['synthetic-other',null])('supports explicit neutral policy scope %s',countryId=>{
    const policy=withFamilyCompositionPolicyFingerprint({...fixtureInput(),scope:{...fixtureInput().scope,countryId}}),context=fixtureContext();
    expect(evaluateFamilyComposition(policy,{...fixtureRequest(),countryId},context).parentages).toHaveLength(1);
  });
  it.each([0,-1,0.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])('rejects invalid weight %s',weight=>expect(()=>withFamilyCompositionPolicyFingerprint(fixtureInput([{...fixtureTemplate(),weight}]))).toThrow());

  const invalidPolicies:readonly [string,(input:FamilyCompositionPolicyInputV1)=>unknown][]=[
    ['duplicate template',input=>({...input,templates:[...input.templates,...input.templates]})],
    ['duplicate binding',input=>({...input,bindings:[...input.bindings,input.bindings[0]]})],
    ['bad basis',input=>({...input,templates:[{...input.templates[0],parentages:[{...input.templates[0].parentages[0],bases:['biological']}]}]})],
    ['empty bases',input=>({...input,templates:[{...input.templates[0],parentages:[{...input.templates[0].parentages[0],bases:[]}]}]})],
    ['duplicate basis',input=>({...input,templates:[{...input.templates[0],parentages:[{...input.templates[0].parentages[0],bases:['legal','legal']}]}]})],
    ['duplicate pair',input=>({...input,templates:[{...input.templates[0],parentages:[...input.templates[0].parentages,...input.templates[0].parentages]}]})],
    ['self parent',input=>({...input,templates:[{...input.templates[0],parentages:[{parent:binding('anchor.child'),child:binding('anchor.child'),bases:['legal']}]}]})],
    ['mixed cycle',input=>({...input,templates:[{...input.templates[0],parentages:[...input.templates[0].parentages,{parent:binding('anchor.child'),child:binding('anchor.parent'),bases:['gestational']}]}]})],
    ['missing reference',input=>({...input,templates:[{...input.templates[0],parentages:[{...input.templates[0].parentages[0],parent:binding('anchor.missing')}]}]})],
    ['unused future',input=>({...input,templates:[{...input.templates[0],additionalSubjects:[{slotId:'future.unused',birth:{kind:'any-living'}}]}]})],
    ['bad algorithm',input=>({...input,algorithmId:'family.latest'})],
    ['bad eligibility',input=>({...input,eligibility:'select-and-retry'})],
    ['bad version',input=>({...input,version:2})],
    ['invalid date',input=>({...input,scope:{...input.scope,effectiveFrom:{year:2032,month:2,day:30}}})],
    ['dangling provenance',input=>({...input,templates:[{...input.templates[0],provenanceIds:['decision.missing']}]})],
    ['unknown classification',input=>({...input,provenance:[{...input.provenance[0],classification:'official-authoring'}]})],
    ['future fact predicate',input=>({...input,bindings:input.bindings.map(item=>({...item,accepts:'subject'})),templates:[{...input.templates[0],when:[{kind:'life-status',bindingId:'anchor.parent',lifeStatus:'living'}]}]})],
    ['extra role',input=>({...input,guardian:true})],
  ];
  it.each(invalidPolicies)('rejects policy %s',(_name,change)=>expect(()=>withFamilyCompositionPolicyFingerprint(change(fixtureInput()) as FamilyCompositionPolicyInputV1)).toThrow());
  const invalidRequests:readonly [string,(request:FamilyCompositionRequestV1)=>unknown][]=[
    ['unknown Person',r=>({...r,bindings:[{bindingId:'anchor.parent',subject:{kind:'existing',personId:'person:999'}},r.bindings[1]]})],
    ['duplicate subject',r=>({...r,bindings:[r.bindings[0],{...r.bindings[1],subject:r.bindings[0].subject}]})],
    ['missing binding',r=>({...r,bindings:r.bindings.slice(1)})],
    ['missing external slot',r=>({...r,bindings:[{...r.bindings[0],subject:{kind:'future',scopeId:'borrowed.missing',slotId:'member.one'}},r.bindings[1]]})],
    ['bad seed',r=>({...r,rootSeed:-1})],
    ['unsafe seed',r=>({...r,rootSeed:4294967296})],
    ['invalid key',r=>({...r,requestKey:'person:3'})],
    ['wrong country',r=>({...r,countryId:'other'})],
    ['wrong policy',r=>({...r,policyId:'family.other-v1'})],
    ['bad date',r=>({...r,referenceDate:{year:2032,month:2,day:30}})],
    ['date outside scope',r=>({...r,referenceDate:{year:2033,month:1,day:1}})],
    ['fake age field',r=>({...r,age:18})],
    ['fake slot ID',r=>({...r,familyScopeId:'person:3'})],
  ];
  it.each(invalidRequests)('rejects request %s without output',(_name,change)=>{
    const policy=fixturePolicy(),context=fixtureContext(),request=change(fixtureRequest());expect(validateFamilyCompositionRequest(request,policy,context)).toBe(false);expect(()=>evaluateFamilyComposition(policy,request as FamilyCompositionRequestV1,context)).toThrow();
  });
  it.each(['template','seed','fingerprint','bases','requirement','order','extra'])('rejects corrupted plan %s',change=>{
    const policy=fixturePolicy(),context=fixtureContext(),plan=evaluateFamilyComposition(policy,fixtureRequest(),context);
    const bad=change==='template'?{...plan,templateId:'structure.other'}:change==='seed'?{...plan,request:{...plan.request,rootSeed:74}}:change==='fingerprint'?{...plan,evaluationFingerprint:'fnv1a64-v1:0000000000000000'}:change==='bases'?{...plan,parentages:[{...plan.parentages[0],bases:['legal']}]}:change==='requirement'?{...plan,materializationRequirements:[{}]}:change==='order'?{...plan,parentages:[{...plan.parentages[0],bases:['legal','genetic']}]}:{...plan,applied:true};
    expect(validateFamilyCompositionPlan(bad,policy,context)).toBe(false);
  });
  it.each(['getter','hidden','symbol','prototype','sparse','proxy','revoked'])('rejects hostile %s without invoking getters',kind=>{
    let hits=0;const raw=structuredClone(fixtureInput()) as unknown as Record<string,unknown>;let input:unknown=raw;
    if(kind==='getter')Object.defineProperty(raw,'templates',{enumerable:true,get(){hits++;return [];}});
    if(kind==='hidden')Object.defineProperty(raw,'hidden',{value:1});
    if(kind==='symbol')Object.defineProperty(raw,Symbol('hidden'),{value:1,enumerable:true});
    if(kind==='prototype')Object.setPrototypeOf(raw,{custom:true});
    if(kind==='sparse')raw.templates=new Array(1);
    if(kind==='proxy')input=new Proxy(raw,{});
    if(kind==='revoked'){const proxy=Proxy.revocable(raw,{});proxy.revoke();input=proxy.proxy;}
    expect(validateFamilyCompositionPolicy(input)).toBe(false);expect(()=>snapshot(input)).toThrow();expect(hits).toBe(0);
  });
  const constraints=[{kind:'any-living'},{kind:'birth-year-range',minimumYear:1,maximumYear:2032},{kind:'birth-year-range',minimumYear:1900,maximumYear:2033},{kind:'birth-year-range',minimumYear:0,maximumYear:2},{kind:'birth-year-range',minimumYear:9999,maximumYear:9999},{kind:'completed-age-range',minimumAge:0,maximumAge:1},{kind:'completed-age-range',minimumAge:0,maximumAge:9998},{kind:'completed-age-range',minimumAge:0,maximumAge:9999},{kind:'completed-age-range',minimumAge:2,maximumAge:1},{kind:'completed-age-range',minimumAge:1.5,maximumAge:2}];
  it.each(constraints)('reuses exact frozen birth vocabulary %j',value=>{
    expect(shapes.birthShape(value)).toBe(birthConstraintShape(value));
    if(shapes.birthShape(value))for(const date of [fixtureDate,{year:1,month:1,day:1},{year:2024,month:2,day:29},{year:9999,month:12,day:31}])expect(shapes.birthAtDate(value,date)).toBe(birthConstraintAtDate(value,date));
  });
  it('checks long graph structure iteratively and non-JSON resource protection',()=>{
    expect(acyclic(Array.from({length:5000},(_,index)=>({parent:`node:${index}`,child:`node:${index+1}`})))).toBe(true);
    expect(acyclic([{parent:'a',child:'b'},{parent:'b',child:'a'}])).toBe(false);
    const deep:Record<string,unknown>={};let nested=deep;for(let i=0;i<45;i++){nested.next={};nested=nested.next as Record<string,unknown>;}expect(()=>snapshot(deep)).toThrow();
    expect(canonicalStringify({z:1,a:2})).toBe('{"a":2,"z":1}');
  });
});
