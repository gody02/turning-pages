import {describe,expect,it} from 'vitest';
import {ageOn} from '../core/clock';
import {withHouseholdCompositionPolicyFingerprint} from '../householdComposition/package';
import {evaluateHouseholdComposition} from '../householdComposition/runtime';
import {withFamilyCompositionPolicyFingerprint} from '../familyComposition/package';
import {evaluateFamilyComposition} from '../familyComposition/runtime';
import {adaptHouseholdCompositionSubjects} from '../familyComposition/householdAdapter';
import {canonicalStringify,compare,subjectKey} from './data';
import {withRelationshipUnionCompositionPolicyFingerprint,validateRelationshipUnionCompositionPolicy,createRelationshipUnionCompositionRegistry,resolveRelationshipUnionCompositionPolicy} from './package';
import {evaluateRelationshipUnionComposition,diagnoseRelationshipUnionComposition,validateRelationshipUnionCompositionPlan} from './runtime';
import {validateRelationshipUnionCompositionRequest} from './validation';
import {assessRelationshipUnionCompositionReadiness,resolveRelationshipUnionCompositionPlan,validateResolvedRelationshipUnionCompositionPlan} from './compatibility';
import {adaptHouseholdSubjectsForRelationshipUnionComposition,adaptFamilySubjectsForRelationshipUnionComposition,validateRelationshipUnionBorrowedReferences} from './subjectAdapters';
import {fixtureContext,fixtureDate,fixtureInput,fixtureRequest,fixtureTemplate,fixtureOriginal,futureOriginal,currentView,appendPerson,binding,additional} from './fixtures';
import type {RelationshipUnionCompositionPolicyInputV1,RelationshipOriginalPlanV1,RelationshipUnionCompositionTemplateV1,RelationshipUnionBorrowedSourceV1} from './types';

type Mutable<T>=T extends object?{-readonly [K in keyof T]:Mutable<T[K]>}:T;
const copy=<T,>(x:T):Mutable<T>=>structuredClone(x) as Mutable<T>;
const planFor=(input:RelationshipUnionCompositionPolicyInputV1,request=fixtureRequest(),context=fixtureContext()):RelationshipOriginalPlanV1=>{const policy=withRelationshipUnionCompositionPolicyFingerprint(input);return {policy,context,plan:evaluateRelationshipUnionComposition(request,policy,context)};};
function householdSource(slots=2){
  const context={people:fixtureContext().people,household:{version:1 as const,nextSequence:1,households:[],memberships:[]}};
  const additionalMembers=Array.from({length:slots},(_,i)=>({slotId:`member.slot-${i+1}`,birth:{kind:'any-living' as const}}));
  const policy=withHouseholdCompositionPolicyFingerprint({version:1,policyId:'composition.synthetic.borrow-v1',algorithmId:'household-composition.weighted-integer-v1',scope:{countryId:'synthetic',effectiveFrom:fixtureDate,effectiveThrough:fixtureDate},anchorBindings:['anchor.one'],templates:[{id:'structure.household',weight:1,when:[],additionalMembers,households:[{householdSlotId:'unit.one',members:[{kind:'anchor',bindingId:'anchor.one'},...additionalMembers.map(s=>({kind:'materialize' as const,slotId:s.slotId}))]}]}]});
  const plan=evaluateHouseholdComposition(policy,{version:1,policyId:policy.policyId,requestKey:'household.synthetic.request',rootSeed:73,referenceDate:fixtureDate,countryId:'synthetic',anchors:[{bindingId:'anchor.one',personId:'person:1'}]},context);
  const scopeId='household.operation.synthetic';return {kind:'household' as const,scopeId,plan,policy,context};
}
function familySource(household?:ReturnType<typeof householdSource>){
  const borrowed=household?adaptHouseholdCompositionSubjects(household.plan,household.policy,household.context,household.scopeId):null;
  const context={people:fixtureContext().people,kinship:{version:1 as const,parentages:[]},borrowedSubjects:borrowed?[borrowed]:[]};
  const policy=withFamilyCompositionPolicyFingerprint({version:1,policyId:'family-composition.synthetic.borrow-v1',algorithmId:'family-composition.weighted-integer-v1',eligibility:'declared-facts-and-kinship-union-dag-v1',scope:{countryId:'synthetic',effectiveFrom:fixtureDate,effectiveThrough:fixtureDate},bindings:[{bindingId:'anchor.child',accepts:'existing'},...(borrowed?[{bindingId:'anchor.parent',accepts:'subject' as const}]:[])],templates:[{id:'structure.family',weight:1,when:[],additionalSubjects:borrowed?[]:[{slotId:'relative.parent',birth:{kind:'completed-age-range',minimumAge:50,maximumAge:60}}],parentages:[{parent:borrowed?binding('anchor.parent'):additional('relative.parent'),child:binding('anchor.child'),bases:['legal']}],provenanceIds:[]}],provenance:[],limitations:['Synthetic only.']});
  const request={version:1 as const,policyId:policy.policyId,requestKey:'family.synthetic.request',rootSeed:73,referenceDate:fixtureDate,countryId:'synthetic',familyScopeId:'family.operation.synthetic',bindings:[{bindingId:'anchor.child',subject:{kind:'existing' as const,personId:'person:1'}},...(borrowed?[{bindingId:'anchor.parent',subject:{kind:'future' as const,scopeId:borrowed.scopeId,slotId:borrowed.subjects[0].slotId}}]:[])]};
  const plan=evaluateFamilyComposition(policy,request,context);return {kind:'family' as const,plan,policy,context};
}
function borrowedOriginal(source:ReturnType<typeof householdSource>|ReturnType<typeof familySource>,both=false){
  const inventory=source.kind==='household'?adaptHouseholdSubjectsForRelationshipUnionComposition(source.plan,source.scopeId,source.policy,source.context):adaptFamilySubjectsForRelationshipUnionComposition(source.plan,source.policy,source.context);
  const context={people:source.context.people,borrowedSubjects:[inventory]},input=fixtureInput();
  const policy=withRelationshipUnionCompositionPolicyFingerprint({...input,bindings:input.bindings.map(b=>({...b,accepts:'subject'}))});
  const refs=inventory.subjects.map(s=>({kind:'future' as const,scopeId:inventory.scopeId,slotId:s.slotId}));
  const request={...fixtureRequest(),bindings:[{bindingId:'anchor.one',subject:both?refs[0]:fixtureRequest().bindings[0].subject},{bindingId:'anchor.two',subject:both?refs[1]:refs[0]}]};
  return {policy,context,plan:evaluateRelationshipUnionComposition(request,policy,context)};
}
const assertPure=(original:RelationshipOriginalPlanV1,expected:'READY'|'NOT_READY')=>{
  const current=currentView(original.context),before=canonicalStringify({original,current});
  expect(validateRelationshipUnionCompositionPlan(original.plan,original.policy,original.context)).toBe(true);
  const readiness=assessRelationshipUnionCompositionReadiness(original,current);
  expect(readiness.materialization.status).toBe(expected);expect(readiness.kinds.status).toBe('RESOLVED');
  expect(canonicalStringify({original,current})).toBe(before);return readiness;
};

describe('Relationship/Union pure policy and deterministic composition',()=>{
  it('uses the exact shared Family subject key and code-point ordering',()=>{
    expect(subjectKey({kind:'future',scopeId:'scope.one',slotId:'slot.one'})).toBe('["family-subject",1,"future","scope.one","slot.one"]');
    expect(compare('\u{10000}','\ue000')).toBe(1);
  });
  it('normalizes reversed template orientation without inventing durable identities',()=>{
    const t=fixtureTemplate(),a=planFor(fixtureInput([t])),b=planFor(fixtureInput([{...t,partnerships:[{subjects:[t.partnerships[0].subjects[1],t.partnerships[0].subjects[0]]}]}]));
    expect(b).toEqual(a);expect(a.plan).not.toHaveProperty('nextSequence');expect(a.plan).not.toHaveProperty('state');
  });
  it('records three distinct policy/evaluation/complete-plan fingerprints',()=>{
    const a=fixtureOriginal();expect(a.plan.policyFingerprint).toBe(a.policy.fingerprint);expect(a.plan.planFingerprint).toMatch(/^fnv1a64-v1:[0-9a-f]{16}$/);
    const altered=copy(a.plan);altered.partnerships=[];expect(validateRelationshipUnionCompositionPlan(altered,a.policy,a.context)).toBe(false);
  });
  it('ignores unrelated display/identity fields but binds actual DOB/life facts',()=>{
    const a=fixtureOriginal(),context=copy(a.context);context.people.people[0].name='Changed Display';context.people.people[0].genderLabel='Self description';
    expect(evaluateRelationshipUnionComposition(a.plan.request,a.policy,context)).toEqual(a.plan);
    context.people.people[0].dateOfBirth={year:1999,month:6,day:30};expect(evaluateRelationshipUnionComposition(a.plan.request,a.policy,context).evaluationFingerprint).not.toBe(a.plan.evaluationFingerprint);
  });
  it('source ordering leaves fingerprints, tickets and plans identical',()=>{
    const a=fixtureTemplate('structure.a'),b={...fixtureTemplate('structure.b'),weight:7,partnerships:[]},input=fixtureInput([a,b]),p=withRelationshipUnionCompositionPolicyFingerprint(input);
    const reversed=copy(input);reversed.templates=[...reversed.templates].reverse();reversed.bindings=[...reversed.bindings].reverse();
    const q=withRelationshipUnionCompositionPolicyFingerprint(reversed),request={...fixtureRequest(),bindings:[...fixtureRequest().bindings].reverse()};
    expect(q).toEqual(p);expect(diagnoseRelationshipUnionComposition(request,q,fixtureContext())).toEqual(diagnoseRelationshipUnionComposition(fixtureRequest(),p,fixtureContext()));
  });
  it('one eligible template makes no keyed draw',()=>{const a=fixtureOriginal();expect(diagnoseRelationshipUnionComposition(a.plan.request,a.policy,a.context)).toMatchObject({ticket:null,attempts:0,eligibleMass:1});});
  it('filters only declared predicates before exact selection; no compatible redraw',()=>{
    const a={...fixtureTemplate('structure.a'),when:[{kind:'completed-age-range' as const,bindingId:'anchor.one',minimumAge:40,maximumAge:80}]},b=fixtureTemplate('structure.b'),original=planFor(fixtureInput([a,b]));
    const diagnostics=diagnoseRelationshipUnionComposition(original.plan.request,original.policy,original.context);
    expect(diagnostics.eligibleTemplateIds).toEqual(['structure.b']);expect(diagnostics.excludedTemplates[0].reasons[0]).toContain('Completed-age');
  });
  it('fails deterministically with no eligible templates',()=>{
    const t={...fixtureTemplate(),when:[{kind:'life-status' as const,bindingId:'anchor.one',lifeStatus:'deceased' as const}]},policy=withRelationshipUnionCompositionPolicyFingerprint(fixtureInput([t]));
    expect(()=>evaluateRelationshipUnionComposition(fixtureRequest(),policy,fixtureContext())).toThrow('No eligible');
  });
  it.each([0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])('rejects invalid authored mass %s',weight=>expect(()=>withRelationshipUnionCompositionPolicyFingerprint(fixtureInput([{...fixtureTemplate(),weight}]))).toThrow());
  it('rejects global mass overflow and accepts exact largest safe single weight',()=>{
    expect(()=>withRelationshipUnionCompositionPolicyFingerprint(fixtureInput([{...fixtureTemplate('structure.a'),weight:Number.MAX_SAFE_INTEGER},fixtureTemplate('structure.b')]))).toThrow();
    expect(planFor(fixtureInput([{...fixtureTemplate(),weight:Number.MAX_SAFE_INTEGER}])).plan.templateId).toBe('structure.pair');
  });
  it('rejects no-template policies but accepts explicit positive empty outcomes',()=>{
    expect(()=>withRelationshipUnionCompositionPolicyFingerprint(fixtureInput([]))).toThrow();
    expect(planFor(fixtureInput([{...fixtureTemplate(),partnerships:[]}])).plan.materializationRequirements).toEqual([]);
  });
  it('registry requires exact immutable manifest and duplicate IDs cannot register',()=>{
    const p=fixtureOriginal().policy,r=createRelationshipUnionCompositionRegistry([p],[{policyId:p.policyId,fingerprint:p.fingerprint}]);expect(resolveRelationshipUnionCompositionPolicy(r,p.policyId)).toEqual(p);
    expect(()=>createRelationshipUnionCompositionRegistry([p,p],[{policyId:p.policyId,fingerprint:p.fingerprint},{policyId:p.policyId,fingerprint:p.fingerprint}])).toThrow();
    const changed=withRelationshipUnionCompositionPolicyFingerprint({...fixtureInput(),limitations:['Changed material semantics.']});expect(changed.fingerprint).not.toBe(p.fingerprint);
    expect(()=>createRelationshipUnionCompositionRegistry([changed],r.manifest)).toThrow();expect(()=>resolveRelationshipUnionCompositionPolicy(r,'unknown.policy-v1')).toThrow();
  });
  it('validates complete shared birth vocabulary against Gregorian capability',()=>{
    const o=futureOriginal();expect(o.plan.materializationRequirements[0].birth).toEqual({kind:'completed-age-range',minimumAge:25,maximumAge:40});
    const input=fixtureInput([{...fixtureTemplate(),additionalSubjects:[{slotId:'relative.old',birth:{kind:'birth-year-range',minimumYear:1,maximumYear:1899}}],partnerships:[{subjects:[binding('anchor.one'),additional('relative.old')]}]}]);expect(planFor(input).plan.materializationRequirements[0].birth.kind).toBe('birth-year-range');
  });
  it.each([
    ['version',2],['rootSeed',-1],['rootSeed',4294967296],['requestKey','bad'],['countryId','foreign'],['relationshipScopeId','invalid'],['referenceDate',{year:2032,month:2,day:30}]
  ])('rejects malformed request %s=%s', (key,value)=>{const o=fixtureOriginal(),r={...o.plan.request,[key]:value};expect(validateRelationshipUnionCompositionRequest(r,o.policy,o.context)).toBe(false);});
  it('rejects unknown fields, fabricated/missing Persons and duplicate subject aliases',()=>{
    const o=fixtureOriginal();for(const request of [{...o.plan.request,extra:true},{...o.plan.request,bindings:[{bindingId:'anchor.one',subject:{kind:'existing',personId:'person:999'}},o.plan.request.bindings[1]]},{...o.plan.request,bindings:o.plan.request.bindings.map(b=>({...b,subject:{kind:'existing',personId:'person:1'}}))}])expect(validateRelationshipUnionCompositionRequest(request,o.policy,o.context)).toBe(false);
  });
  it.each(['self','reversed-duplicate','duplicate-id','undeclared','unused-slot','bad-birth','bad-version','bad-provenance','bad-unicode'])('rejects malformed policy %s',kind=>{
    const input=copy(fixtureInput()),t=input.templates[0] as unknown as Record<string,unknown>;
    if(kind==='self')t.partnerships=[{subjects:[binding('anchor.one'),binding('anchor.one')]}];
    if(kind==='reversed-duplicate')t.partnerships=[...input.templates[0].partnerships,{subjects:[binding('anchor.two'),binding('anchor.one')]}];
    if(kind==='duplicate-id')input.templates=[...input.templates,input.templates[0]];
    if(kind==='undeclared')t.partnerships=[{subjects:[binding('anchor.one'),additional('unknown.slot')]}];
    if(kind==='unused-slot')t.additionalSubjects=[{slotId:'unused.slot',birth:{kind:'any-living'}}];
    if(kind==='bad-birth')t.additionalSubjects=[{slotId:'bad.slot',birth:{kind:'completed-age-range',minimumAge:-1,maximumAge:20}}];
    if(kind==='bad-version')input.version=2 as 1;
    if(kind==='bad-provenance')t.provenanceIds=['unknown.source'];
    if(kind==='bad-unicode')input.limitations=['Invalid\ud800'];
    expect(()=>withRelationshipUnionCompositionPolicyFingerprint(input)).toThrow();
  });
  it.each(['sparse','getter','hidden','symbol','prototype','proxy','revoked','cycle'])('rejects hostile policy %s predictably',kind=>{
    let input:unknown=copy(fixtureInput());let calls=0;
    if(kind==='sparse')(input as Mutable<RelationshipUnionCompositionPolicyInputV1>).templates=new Array(1);
    if(kind==='getter')Object.defineProperty(input,'templates',{enumerable:true,get:()=>{calls++;return [];}});
    if(kind==='hidden')Object.defineProperty(input,'hidden',{value:true,enumerable:false});
    if(kind==='symbol')Object.defineProperty(input,Symbol('hidden'),{value:true,enumerable:true});
    if(kind==='prototype')Object.setPrototypeOf(input,{other:true});
    if(kind==='proxy')input=new Proxy(input as object,{});
    if(kind==='revoked'){const p=Proxy.revocable(input as object,{});p.revoke();input=p.proxy;}
    if(kind==='cycle')(input as Record<string,unknown>).cycle=input;
    expect(()=>withRelationshipUnionCompositionPolicyFingerprint(input as RelationshipUnionCompositionPolicyInputV1)).toThrow('Invalid');expect(validateRelationshipUnionCompositionPolicy(input)).toBe(false);expect(calls).toBe(0);
  });
  it('owns output data and mutation after evaluation cannot change plan semantics',()=>{
    const original=fixtureOriginal(),before=canonicalStringify(original.plan),source=copy(original.context),request=copy(original.plan.request),plan=evaluateRelationshipUnionComposition(request,original.policy,source);
    source.people.people[0].name='Changed';request.bindings=[];expect(canonicalStringify(plan)).toBe(before);expect(Object.isFrozen(plan.partnerships[0].subjects)).toBe(true);expect(()=>{(plan.partnerships as unknown as unknown[]).push({});}).toThrow();
  });
});

describe('cross-plan adapters and explicit shared future ownership',()=>{
  it('Household adapter delegates byte-equivalent frozen subject mapping',()=>{const s=householdSource();expect(adaptHouseholdSubjectsForRelationshipUnionComposition(s.plan,s.scopeId,s.policy,s.context)).toEqual(adaptHouseholdCompositionSubjects(s.plan,s.policy,s.context,s.scopeId));});
  it('Family-only future subjects preserve owned scope, constraint and complete source fingerprint',()=>{const s=familySource(),o=borrowedOriginal(s);expect(o.plan.materializationRequirements[0]).toMatchObject({subject:{scopeId:s.plan.request.familyScopeId,slotId:'relative.parent'},origin:{kind:'borrowed',producerId:'family-composition.v1'}});expect(validateRelationshipUnionBorrowedReferences(o,[s])).toBe(true);});
  it('does not relabel Family-borrowed Household people as Family-owned',()=>{const h=householdSource(1),f=familySource(h),inventory=adaptFamilySubjectsForRelationshipUnionComposition(f.plan,f.policy,f.context);expect(inventory.subjects).toEqual([]);const o=borrowedOriginal(h);expect(validateRelationshipUnionBorrowedReferences(o,[h])).toBe(true);expect(validateRelationshipUnionBorrowedReferences(o,[f])).toBe(false);});
  it('rejects missing/forged/stale/unrelated/aliased source proof',()=>{
    const s=householdSource(),o=borrowedOriginal(s);expect(validateRelationshipUnionBorrowedReferences(o,[])).toBe(false);
    expect(validateRelationshipUnionBorrowedReferences(o,[s,{...s,scopeId:'household.alias.synthetic'}])).toBe(false);
    const changed=copy(s);changed.plan.additionalMembers=[];expect(validateRelationshipUnionBorrowedReferences(o,[changed])).toBe(false);
    const stale=copy(s);stale.context.people.people[0].name='Different original';expect(validateRelationshipUnionBorrowedReferences(o,[stale])).toBe(false);
    expect(validateRelationshipUnionBorrowedReferences(o,[s,familySource()])).toBe(false);
  });
  it('source permutations and source input alias changes cannot mutate inventories',()=>{const s=copy(householdSource()),inventory=adaptHouseholdSubjectsForRelationshipUnionComposition(s.plan,s.scopeId,s.policy,s.context),before=canonicalStringify(inventory);s.context.people.people[0].name='Different source';expect(canonicalStringify(inventory)).toBe(before);});
  it('rejects missing inventory slot, conflicting scope owner and local/borrowed scope collision',()=>{
    const s=householdSource(),o=borrowedOriginal(s),context=copy(o.context);context.borrowedSubjects[0].subjects=[];expect(validateRelationshipUnionCompositionRequest(o.plan.request,o.policy,context)).toBe(false);
    const duplicate={...o.context,borrowedSubjects:[...o.context.borrowedSubjects,o.context.borrowedSubjects[0]]};expect(validateRelationshipUnionCompositionRequest(o.plan.request,o.policy,duplicate)).toBe(false);
    expect(validateRelationshipUnionCompositionRequest({...o.plan.request,relationshipScopeId:s.scopeId},o.policy,o.context)).toBe(false);
  });
});

// Explicit case numbers provide traceability to the architecture's eighteen-case table.
describe('architecture stress cases for independent romantic truth',()=>{
  it('CASE 1: existing adult single is a positive empty plan, not history',()=>{const o=fixtureOriginal([{...fixtureTemplate(),partnerships:[]}]);expect(assertPure(o,'READY').compatibility.partnership.status).toBe('COMPATIBLE');expect(o.plan.partnerships).toEqual([]);});
  it('CASE 2: future non-resident partner remains unproven',()=>{const o=futureOriginal();expect(assertPure(o,'NOT_READY').compatibility.partnership.status).toBe('UNRESOLVED');expect(o.plan.materializationRequirements).toHaveLength(1);expect(o.plan).not.toHaveProperty('residence');});
  it('CASE 3: two Household future subjects are one pair and two owner requirements',()=>{const h=householdSource(),o=borrowedOriginal(h,true);assertPure(o,'NOT_READY');expect(o.plan.materializationRequirements).toHaveLength(2);expect(validateRelationshipUnionBorrowedReferences(o,[h])).toBe(true);});
  it('CASE 4: Household member plus outside future partner needs no co-residence',()=>{const h=householdSource(0),o=futureOriginal();expect(h.plan.households[0].members[0]).toEqual({kind:'existing',personId:'person:1'});assertPure(o,'NOT_READY');expect(o.plan.partnerships[0].subjects.map(s=>s.kind)).toEqual(['existing','future']);expect(o.plan.materializationRequirements[0].origin.kind).toBe('relationship');});
  it('CASE 5: two co-parents can share a child without any romantic plan',()=>{const base=familySource(),{fingerprint:_hash,...input}=base.policy,first=input.templates[0],second={slotId:'relative.other-parent',birth:{kind:'any-living' as const}},policy=withFamilyCompositionPolicyFingerprint({...input,templates:[{...first,additionalSubjects:[...first.additionalSubjects,second],parentages:[...first.parentages,{parent:additional(second.slotId),child:binding('anchor.child'),bases:['legal']}]}]}),f={...base,policy,plan:evaluateFamilyComposition(policy,base.plan.request,base.context)},o=fixtureOriginal([{...fixtureTemplate(),partnerships:[]}]);expect(f.plan.parentages).toHaveLength(2);assertPure(o,'READY');expect(o.plan.partnerships).toEqual([]);expect(o.plan.formalUnions).toEqual([]);});
  it('CASE 6: partners can share a Household without planned children',()=>{const h=householdSource(1),o=borrowedOriginal(h);expect(h.plan.households).toHaveLength(1);expect(h.plan.households[0].members).toHaveLength(2);assertPure(o,'NOT_READY');expect(o.plan).not.toHaveProperty('parentages');expect(o.plan.formalUnions).toEqual([]);});
  it('CASE 8: romance without formal union is independently compatible',()=>{const o=fixtureOriginal();assertPure(o,'READY');expect(resolveRelationshipUnionCompositionPlan(o,[],currentView(o.context)).desiredFormalUnions).toEqual([]);});
  it('CASE 10: multiple romantic dyads allowed without universal monogamy',()=>{const c=copy(fixtureContext());c.people=copy(appendPerson(c.people,1990));const input={...fixtureInput(),bindings:[...fixtureInput().bindings,{bindingId:'anchor.three',accepts:'existing' as const}],templates:[{...fixtureTemplate(),partnerships:[{subjects:[binding('anchor.one'),binding('anchor.two')] as const},{subjects:[binding('anchor.one'),binding('anchor.three')] as const}]}]},r={...fixtureRequest(),bindings:[...fixtureRequest().bindings,{bindingId:'anchor.three',subject:{kind:'existing' as const,personId:'person:3'}}]},o=planFor(input,r,c);assertPure(o,'READY');expect(resolveRelationshipUnionCompositionPlan(o,[],currentView(c)).missingPartnerships).toHaveLength(2);});
  it('CASE 12: same HH future person borrowed through Family keeps one exact tuple',()=>{const h=householdSource(1),f=familySource(h),o=borrowedOriginal(h);assertPure(o,'NOT_READY');expect(f.plan.materializationRequirements[0].subject).toEqual(o.plan.materializationRequirements[0].subject);expect(o.plan.materializationRequirements).toHaveLength(1);expect(validateRelationshipUnionBorrowedReferences(o,[h])).toBe(true);});
  it('CASE 16: parent new partner creates no Kinship/Care implications',()=>{const o=futureOriginal();assertPure(o,'NOT_READY');expect(Object.keys(o.plan).sort()).toEqual(['evaluationFingerprint','formalUnions','materializationRequirements','partnerships','planFingerprint','policyFingerprint','request','templateId','version'].sort());});
  it('CASE 17: age18 need not have a partner or relocate family',()=>{const c=copy(fixtureContext());c.people.people[0].dateOfBirth={year:2014,month:6,day:30};const o=planFor(fixtureInput([{...fixtureTemplate(),partnerships:[]}]),fixtureRequest(),c);expect(ageOn(c.people.people[0].dateOfBirth,fixtureDate)).toBe(18);assertPure(o,'READY');expect(o.plan.materializationRequirements).toEqual([]);});
  it('CASE 18: newborn no romance; Family/Care readiness stays separate',()=>{const c=copy(fixtureContext());c.people.people[0].dateOfBirth=fixtureDate;const o=planFor(fixtureInput([{...fixtureTemplate(),partnerships:[]}]),fixtureRequest(),c);assertPure(o,'READY');expect(o.plan.partnerships).toEqual([]);expect(o.plan).not.toHaveProperty('care');});
});

describe('complete cross-owner lineage and representation safety',()=>{
  it('validates transitive Family-owned and Household-owned sources without relabeling; source order independent',()=>{
    const h=householdSource(1),base=familySource(h),{fingerprint:_hash,...input}=base.policy,t=input.templates[0],policy=withFamilyCompositionPolicyFingerprint({...input,templates:[{...t,additionalSubjects:[{slotId:'relative.other',birth:{kind:'any-living'}}],parentages:[...t.parentages,{parent:additional('relative.other'),child:binding('anchor.child'),bases:['legal']}]}]}),f={...base,policy,plan:evaluateFamilyComposition(policy,base.plan.request,base.context)},familyInventory=adaptFamilySubjectsForRelationshipUnionComposition(f.plan,f.policy,f.context),householdInventory=adaptHouseholdSubjectsForRelationshipUnionComposition(h.plan,h.scopeId,h.policy,h.context);
    const context={people:f.context.people,borrowedSubjects:[familyInventory,householdInventory]},ruPolicy=withRelationshipUnionCompositionPolicyFingerprint({...fixtureInput(),bindings:fixtureInput().bindings.map(b=>({...b,accepts:'subject'}))}),request={...fixtureRequest(),bindings:[{bindingId:'anchor.one',subject:{kind:'future' as const,scopeId:familyInventory.scopeId,slotId:familyInventory.subjects[0].slotId}},{bindingId:'anchor.two',subject:{kind:'future' as const,scopeId:householdInventory.scopeId,slotId:householdInventory.subjects[0].slotId}}]},o={policy:ruPolicy,context,plan:evaluateRelationshipUnionComposition(request,ruPolicy,context)};
    expect(o.plan.materializationRequirements).toHaveLength(2);expect(validateRelationshipUnionBorrowedReferences(o,[f,h])).toBe(true);expect(validateRelationshipUnionBorrowedReferences(o,[h,f])).toBe(true);expect(validateRelationshipUnionBorrowedReferences(o,[f])).toBe(false);expect(familyInventory.subjects.map(s=>s.slotId)).toEqual(['relative.other']);expect(evaluateRelationshipUnionComposition(request,ruPolicy,{...context,borrowedSubjects:[...context.borrowedSubjects].reverse()})).toEqual(o.plan);
  });
  it('a used shared future subject participating in multiple dyads/contracts remains one obligation',()=>{
    const t={...fixtureTemplate(),additionalSubjects:[{slotId:'outside.shared',birth:{kind:'any-living' as const}}],partnerships:[{subjects:[binding('anchor.one'),additional('outside.shared')] as const},{subjects:[binding('anchor.two'),additional('outside.shared')] as const}]},o=fixtureOriginal([t]);expect(o.plan.materializationRequirements).toHaveLength(1);expect(o.plan.partnerships).toHaveLength(2);assertPure(o,'NOT_READY');
  });
  it('completed-age representability handles Feb29 without pretending DOB materialization is proven',()=>{
    const o=futureOriginal(),referenceDate={year:2032,month:2,day:29},policy=withRelationshipUnionCompositionPolicyFingerprint({...fixtureInput(),scope:{countryId:'synthetic',effectiveFrom:referenceDate,effectiveThrough:referenceDate},bindings:[{bindingId:'anchor.one',accepts:'existing'}],templates:[{...fixtureTemplate(),additionalSubjects:[{slotId:'outside.leap',birth:{kind:'completed-age-range',minimumAge:20,maximumAge:20}}],partnerships:[{subjects:[binding('anchor.one'),additional('outside.leap')]}]}]}),request={...o.plan.request,policyId:policy.policyId,referenceDate},plan=evaluateRelationshipUnionComposition(request,policy,o.context);expect(plan.materializationRequirements[0].birth).toEqual({kind:'completed-age-range',minimumAge:20,maximumAge:20});expect(plan).not.toHaveProperty('dateOfBirth');
  });
  it('more than safe mass can never be reached through eligibility filtering',()=>{const input=fixtureInput([{...fixtureTemplate('structure.a'),weight:Number.MAX_SAFE_INTEGER,when:[{kind:'life-status',bindingId:'anchor.one',lifeStatus:'deceased'}]},fixtureTemplate('structure.b')]);expect(()=>withRelationshipUnionCompositionPolicyFingerprint(input)).toThrow();});
  it('forged canonical output/digest cannot replace deterministic replay',()=>{const o=fixtureOriginal(),fake={...o.plan,templateId:'unselected.template',planFingerprint:o.plan.planFingerprint};expect(validateRelationshipUnionCompositionPlan(fake,o.policy,o.context)).toBe(false);expect(validateRelationshipUnionCompositionPlan({...o.plan,request:{...o.plan.request,rootSeed:4294967296}},o.policy,o.context)).toBe(false);});
});
