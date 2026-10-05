import {describe, expect, it} from 'vitest';
import {createHousehold} from '../household/state';
import {replacePerson} from '../human/person';
import {ageOn} from '../core/clock';
import {fixtureContext, fixtureDate, fixturePolicy, fixtureRequest, policyInput, secondAnchorContext, structuralTemplate} from './fixtures';
import {createHouseholdCompositionRegistry, resolveHouseholdCompositionPolicy, validateHouseholdCompositionPolicy, withHouseholdCompositionPolicyFingerprint} from './package';
import {assessHouseholdCompositionReadiness, diagnoseHouseholdComposition, evaluateHouseholdComposition, validateHouseholdCompositionPlan} from './runtime';
import {validateHouseholdCompositionRequest} from './validation';
import {boundedCompositionTicket, keyedCompositionTicket, MAX_COMPOSITION_DRAW_ATTEMPTS} from './selection';
import {canonicalStringify, fnv1a64, snapshot} from './data';
import type {HouseholdCompositionPolicyInputV1, HouseholdCompositionPlanV1, HouseholdCompositionContextV1, HouseholdCompositionRequestV1} from './types';

type Mutable<T> = {-readonly [Key in keyof T]:Mutable<T[Key]>};
const clone=<T>(value:T):Mutable<T>=>structuredClone(value) as Mutable<T>;
const run=(slots=0)=>{
  const policy=fixturePolicy([structuralTemplate('structure.one',slots)]),request=fixtureRequest(),context=fixtureContext();
  return {policy,request,context,plan:evaluateHouseholdComposition(policy,request,context)};
};

describe('Household Composition pure structure',()=>{
  it('plans one existing anchor without allocating identities',()=>{
    const {plan,context}=run();
    expect(plan.households).toEqual([{householdSlotId:'unit.one',members:[{kind:'existing',personId:'person:1'}]}]);
    expect(plan.additionalMembers).toEqual([]);
    expect(context.people.nextSequence).toBe(2);expect(context.household.nextSequence).toBe(1);
    expect(JSON.stringify(plan)).not.toMatch(/household:[0-9]|person:2/);
  });
  it.each([1,3,12])('plans %i stable transient additional slots',slots=>{
    const {policy,request,context,plan}=run(slots);
    expect(plan.additionalMembers).toHaveLength(slots);
    expect(new Set(plan.additionalMembers.map(slot=>slot.slotId)).size).toBe(slots);
    expect(plan.households[0].members).toHaveLength(slots+1);
    expect(evaluateHouseholdComposition(policy,request,context)).toEqual(plan);
    expect(plan.additionalMembers.every(slot=>!slot.slotId.includes(':'))).toBe(true);
  });
  it('supports multiple existing anchors without duplicating Persons',()=>{
    const template=structuralTemplate(),input=policyInput([{...template,households:[{householdSlotId:'unit.one',members:[{kind:'anchor',bindingId:'anchor.two'},{kind:'anchor',bindingId:'anchor.one'}]}]}]);
    const policy=withHouseholdCompositionPolicyFingerprint({...input,anchorBindings:['anchor.two','anchor.one']}),request={...fixtureRequest(),anchors:[{bindingId:'anchor.two',personId:'person:2'},{bindingId:'anchor.one',personId:'person:1'}]};
    const plan=evaluateHouseholdComposition(policy,request,secondAnchorContext());
    expect(plan.households[0].members).toEqual([{kind:'existing',personId:'person:1'},{kind:'existing',personId:'person:2'}]);
    expect(plan.request.anchors[0].bindingId).toBe('anchor.one');
    expect(evaluateHouseholdComposition(policy,{...request,anchors:[...request.anchors].reverse()},secondAnchorContext())).toEqual(plan);
  });
  it('supports multiple units and reuses one requirement across units',()=>{
    const template=structuralTemplate('structure.multi',1);
    const policy=fixturePolicy([{...template,households:[{...template.households[0],householdSlotId:'unit.two'},template.households[0]]}]);
    const plan=evaluateHouseholdComposition(policy,fixtureRequest(),fixtureContext());
    expect(plan.households.map(unit=>unit.householdSlotId)).toEqual(['unit.one','unit.two']);
    expect(plan.additionalMembers).toHaveLength(1);
    expect(plan.households[0].members).toEqual(plan.households[1].members);
  });
  it('supports zero units without unused materialization',()=>{
    const policy=fixturePolicy([{id:'structure.zero',weight:1,when:[],additionalMembers:[],households:[]}]);
    const plan=evaluateHouseholdComposition(policy,fixtureRequest(),fixtureContext());
    expect(plan.households).toEqual([]);expect(plan.additionalMembers).toEqual([]);
  });
  it('supports a synthetic age0 anchor and adult-range requirements without care/Family',()=>{
    const template=structuralTemplate('structure.additional',2);
    const policy=fixturePolicy([{...template,when:[{bindingId:'anchor.one',completedAge:{minimumAge:0,maximumAge:0}}],additionalMembers:template.additionalMembers.map(slot=>({...slot,birth:{kind:'completed-age-range',minimumAge:20,maximumAge:50}}))}]);
    const context=fixtureContext(0),plan=evaluateHouseholdComposition(policy,fixtureRequest(),context);
    expect(ageOn(context.people.people[0].dateOfBirth,fixtureDate)).toBe(0);
    expect(plan.additionalMembers).toHaveLength(2);
    expect(JSON.stringify(plan)).not.toMatch(/parent|guardian|careRole|familyRole/);
  });
  it('distinguishes a valid exact-age requirement from unproven materialization',()=>{
    const template=structuralTemplate('structure.exact-age',1);
    const policy=fixturePolicy([{...template,additionalMembers:[{slotId:'member.slot-1',birth:{kind:'completed-age-range',minimumAge:18,maximumAge:18}}]}]);
    const context=fixtureContext(),plan=evaluateHouseholdComposition(policy,fixtureRequest(),context);
    expect(validateHouseholdCompositionPlan(plan,policy,context)).toBe(true);
    expect(assessHouseholdCompositionReadiness(plan,policy,context)).toEqual({status:'NOT_READY',requirements:[{slotId:'member.slot-1',status:'unproven'}],reasons:['Materialization is unproven for member.slot-1; a separately approved coordinator must prove inventory, content and birth constraints.']});
  });
  it('reports readiness when no new Person materialization is required',()=>{
    const {plan,policy,context}=run();
    expect(assessHouseholdCompositionReadiness(plan,policy,context)).toEqual({status:'READY',requirements:[],reasons:[]});
  });
  it.each(['any-living','birth-year-range'] as const)('does not claim inventory readiness for %s',kind=>{
    const template=structuralTemplate('structure.requirement',1),birth=kind==='any-living'?{kind} as const:{kind,minimumYear:1900,maximumYear:2032} as const;
    const policy=fixturePolicy([{...template,additionalMembers:[{slotId:'member.slot-1',birth}]}]),context=fixtureContext();
    expect(assessHouseholdCompositionReadiness(evaluateHouseholdComposition(policy,fixtureRequest(),context),policy,context).status).toBe('NOT_READY');
  });
  it('rejects assigned anchors without rewriting existing units',()=>{
    const source=fixtureContext(),household=createHousehold(source.household,['person:1'],{people:source.people}).state,context={...source,household},before=clone(context);
    expect(validateHouseholdCompositionRequest(fixtureRequest(),fixturePolicy(),context)).toBe(false);
    expect(()=>evaluateHouseholdComposition(fixturePolicy(),fixtureRequest(),context)).toThrow();expect(context).toEqual(before);
  });
  it('allows unrelated existing units and a non-player anchor',()=>{
    const source=secondAnchorContext(),household=createHousehold(source.household,['person:1'],{people:source.people}).state;
    const plan=evaluateHouseholdComposition(fixturePolicy(),{...fixtureRequest(),anchors:[{bindingId:'anchor.one',personId:'person:2'}]},{...source,household});
    expect(plan.households[0].members).toEqual([{kind:'existing',personId:'person:2'}]);
  });
});

describe('Canonical policy integrity and selection',()=>{
  it('normalizes all nonsemantic collections and fingerprints',()=>{
    const template=structuralTemplate('structure.z',3),input=policyInput([template,structuralTemplate('structure.a')]),shuffled=clone(input);
    shuffled.templates=[...shuffled.templates].reverse().map(item=>({...item,additionalMembers:[...item.additionalMembers].reverse(),households:[...item.households].reverse().map(unit=>({...unit,members:[...unit.members].reverse()}))}));
    const a=withHouseholdCompositionPolicyFingerprint(input),b=withHouseholdCompositionPolicyFingerprint(shuffled);
    expect(a).toEqual(b);expect(evaluateHouseholdComposition(a,fixtureRequest(),fixtureContext())).toEqual(evaluateHouseholdComposition(b,fixtureRequest(),fixtureContext()));
  });
  it('normalizes predicate, binding and unit authoring order',()=>{
    const template={...structuralTemplate(),when:[{bindingId:'anchor.two',completedAge:{minimumAge:0,maximumAge:100}},{bindingId:'anchor.one',completedAge:{minimumAge:0,maximumAge:100}}],households:[{householdSlotId:'unit.two',members:[{kind:'anchor' as const,bindingId:'anchor.two'}]},{householdSlotId:'unit.one',members:[{kind:'anchor' as const,bindingId:'anchor.one'}]}]};
    const input={...policyInput([template]),anchorBindings:['anchor.two','anchor.one']},permuted={...input,anchorBindings:[...input.anchorBindings].reverse(),templates:[{...template,when:[...template.when].reverse(),households:[...template.households].reverse()}]};
    expect(withHouseholdCompositionPolicyFingerprint(input)).toEqual(withHouseholdCompositionPolicyFingerprint(permuted));
  });
  it('rejects noncanonical or tampered registered content',()=>{
    const policy=fixturePolicy([structuralTemplate('structure.z'),structuralTemplate('structure.a')]);
    expect(validateHouseholdCompositionPolicy({...policy,templates:[...policy.templates].reverse()})).toBe(false);
    expect(validateHouseholdCompositionPolicy({...policy,fingerprint:'fnv1a64-v1:0000000000000000'})).toBe(false);
    expect(validateHouseholdCompositionPolicy({...policy,templates:policy.templates.map(item=>({...item,weight:2}))})).toBe(false);
  });
  it('rejects changed semantics under a pinned immutable identity',()=>{
    const original=fixturePolicy(),changed=withHouseholdCompositionPolicyFingerprint(policyInput([{...structuralTemplate(),weight:2}]));
    expect(original.fingerprint).not.toBe(changed.fingerprint);
    expect(()=>createHouseholdCompositionRegistry([changed],[{policyId:original.policyId,fingerprint:original.fingerprint}])).toThrow();
    expect(()=>createHouseholdCompositionRegistry([original,changed],[{policyId:original.policyId,fingerprint:original.fingerprint},{policyId:changed.policyId,fingerprint:changed.fingerprint}])).toThrow();
  });
  it('matches an exact manifest and returns owned data without default lookup',()=>{
    const policy=fixturePolicy(),registry=createHouseholdCompositionRegistry([policy],[{policyId:policy.policyId,fingerprint:policy.fingerprint}]);
    expect(resolveHouseholdCompositionPolicy(registry,policy.policyId)).toEqual(policy);
    expect(()=>resolveHouseholdCompositionPolicy(registry,'latest')).toThrow();
    expect(()=>resolveHouseholdCompositionPolicy({...registry,manifest:[]},policy.policyId)).toThrow();
  });
  it.each(['weight','scope','constraint','gender','id','algorithm'] as const)('detects/rejects material %s differences',field=>{
    const original=fixturePolicy(),input=clone(policyInput());
    if(field==='weight')input.templates=[{...input.templates[0],weight:3}];
    if(field==='scope')input.scope={...input.scope,countryId:'another'};
    if(field==='constraint')input.templates=[{...input.templates[0],when:[{bindingId:'anchor.one',completedAge:{minimumAge:1,maximumAge:50}}]}];
    if(field==='id')input.policyId='composition.synthetic.structural-v2';
    if(field==='algorithm'||field==='gender'){
      const bad=field==='algorithm'?{...input,algorithmId:'unsupported.v1'}:{...input,gender:'Unspecified'};
      expect(()=>withHouseholdCompositionPolicyFingerprint(bad as HouseholdCompositionPolicyInputV1)).toThrow();return;
    }
    expect(withHouseholdCompositionPolicyFingerprint(input).fingerprint).not.toBe(original.fingerprint);
  });
  it('accepts a maximum-safe total and rejects aggregation overflow',()=>{
    const a={...structuralTemplate('structure.a'),weight:Number.MAX_SAFE_INTEGER-1},b={...structuralTemplate('structure.b',1),weight:1};
    const policy=fixturePolicy([a,b]),diagnostic=diagnoseHouseholdComposition(policy,fixtureRequest(),fixtureContext());
    expect(diagnostic.eligibleMass).toBe(Number.MAX_SAFE_INTEGER);expect(BigInt(diagnostic.ticket!)).toBeLessThan(BigInt(Number.MAX_SAFE_INTEGER));
    expect(()=>fixturePolicy([{...a,weight:Number.MAX_SAFE_INTEGER},b])).toThrow();
  });
  it('bypasses derivation for one eligible template',()=>{
    const diagnostic=diagnoseHouseholdComposition(fixturePolicy(),fixtureRequest(),fixtureContext());
    expect(diagnostic.ticket).toBeNull();expect(diagnostic.attempts).toBe(0);
  });
  it('filters eligibility inclusively before integer selection and fails empty eligibility',()=>{
    const template={...structuralTemplate(),when:[{bindingId:'anchor.one',completedAge:{minimumAge:25,maximumAge:25}}]},policy=fixturePolicy([template]);
    expect(evaluateHouseholdComposition(policy,fixtureRequest(),fixtureContext(25)).templateId).toBe(template.id);
    expect(()=>evaluateHouseholdComposition(policy,fixtureRequest(),fixtureContext(24))).toThrow('No eligible');
    expect(()=>evaluateHouseholdComposition(policy,fixtureRequest(),fixtureContext(26))).toThrow('No eligible');
  });
  it('pins witnessed keys selecting different valid templates',()=>{
    const policy=fixturePolicy([structuralTemplate('structure.a'),structuralTemplate('structure.b',1)]),context=fixtureContext();
    const choices=Array.from({length:32},(_,index)=>evaluateHouseholdComposition(policy,{...fixtureRequest(),requestKey:`composition.key-${index}`},context).templateId);
    expect(new Set(choices).size).toBe(2);
    // Fixed seed73/key witnesses for the versioned algorithm, not a distribution claim.
    expect(choices.slice(0,4)).toEqual(['structure.a','structure.b','structure.a','structure.a']);
  });
  it('is independent of irrelevant identity-facing content and other Person facts',()=>{
    const {policy,request,context,plan}=run(1),person=context.people.people[0],changed={...context,people:replacePerson(context.people,{...person,name:'Changed Identity',genderLabel:'Different',traits:['example'],aptitudes:{'human.test':10}})};
    expect(evaluateHouseholdComposition(policy,request,changed)).toEqual(plan);
  });
  it('uses explicit seed/key/date and remains repeatable across fresh copies',()=>{
    const {policy,request,context,plan}=run(1);
    expect(evaluateHouseholdComposition(clone(policy),clone(request),clone(context))).toEqual(plan);
    const changed=evaluateHouseholdComposition(policy,{...request,rootSeed:74},context);
    expect(changed.requestFingerprint).not.toBe(plan.requestFingerprint);
  });
  it('has stable UTF-8 fingerprint vectors and no object insertion-order dependency',()=>{
    expect(fnv1a64('')).toBe('fnv1a64-v1:cbf29ce484222325');
    expect(fnv1a64('hello')).toBe('fnv1a64-v1:a430d84680aabd0b');
    expect(canonicalStringify({z:1,a:2})).toBe(canonicalStringify({a:2,z:1}));
    expect(fnv1a64('é')).not.toBe(fnv1a64('e'));
  });
});

describe('Exact integer ticket seams',()=>{
  it('assigns exact cumulative intervals including all boundaries',()=>{
    const tickets=Array.from({length:10},(_,value)=>boundedCompositionTicket(10,(_attempt,lane)=>lane===0?0:value).ticket);
    expect(tickets).toEqual(Array.from({length:10},(_,index)=>BigInt(index)));
  });
  it('rejects a biased upper tail then accepts the next word',()=>{
    const result=boundedCompositionTicket(3,(attempt)=>attempt===0?0xffffffff:0);
    expect(result).toEqual({ticket:0n,attempts:2});
  });
  it('enforces a technical rejection guard without modulo fallback',()=>{
    let calls=0;expect(()=>boundedCompositionTicket(3,()=>{calls++;return 0xffffffff;})).toThrow('rejection guard');
    expect(calls).toBe(MAX_COMPOSITION_DRAW_ATTEMPTS*2);
  });
  it.each([0,-1,0.1,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])('rejects invalid mass %s',mass=>expect(()=>boundedCompositionTicket(mass,()=>0)).toThrow());
  it.each([-1,1.2,Infinity,0x100000000])('rejects invalid word %s',word=>expect(()=>boundedCompositionTicket(1,()=>word)).toThrow());
  it('supports keyed maximum-safe mass and exact repeated draws',()=>{
    const a=keyedCompositionTicket(73,'test-key',Number.MAX_SAFE_INTEGER);
    expect(a).toEqual(keyedCompositionTicket(73,'test-key',Number.MAX_SAFE_INTEGER));expect(a.ticket).toBeGreaterThanOrEqual(0n);
  });
});

describe('Strict policy/request/plan validation',()=>{
  const invalidInputs:readonly [string,(input:HouseholdCompositionPolicyInputV1)=>unknown][]=[
    ['zero weight',input=>({...input,templates:[{...input.templates[0],weight:0}]})],
    ['negative weight',input=>({...input,templates:[{...input.templates[0],weight:-1}]})],
    ['fractional weight',input=>({...input,templates:[{...input.templates[0],weight:0.5}]})],
    ['duplicate template',input=>({...input,templates:[...input.templates,...input.templates]})],
    ['duplicate binding',input=>({...input,anchorBindings:['anchor.one','anchor.one']})],
    ['unused slot',input=>({...input,templates:[{...input.templates[0],additionalMembers:[{slotId:'member.extra',birth:{kind:'any-living'}}]}]})],
    ['duplicate ref',input=>({...input,templates:[{...input.templates[0],households:[{householdSlotId:'unit.one',members:[{kind:'anchor',bindingId:'anchor.one'},{kind:'anchor',bindingId:'anchor.one'}]}]}]})],
    ['undeclared anchor',input=>({...input,templates:[{...input.templates[0],when:[{bindingId:'anchor.other',completedAge:{minimumAge:0,maximumAge:10}}]}]})],
    ['duplicate predicate',input=>({...input,templates:[{...input.templates[0],when:Array(2).fill({bindingId:'anchor.one',completedAge:{minimumAge:0,maximumAge:10}})}]})],
    ['invalid age range',input=>({...input,templates:[{...input.templates[0],when:[{bindingId:'anchor.one',completedAge:{minimumAge:50,maximumAge:10}}]}]})],
    ['role field',input=>({...input,templates:[{...input.templates[0],familyRole:'parent'}]})],
    ['invalid birth year',input=>({...input,templates:[{...structuralTemplate('structure.one',1),additionalMembers:[{slotId:'member.slot-1',birth:{kind:'birth-year-range',minimumYear:0,maximumYear:2024}}]}]})],
    ['authoritative unit id',input=>({...input,templates:[{...input.templates[0],households:[{...input.templates[0].households[0],householdSlotId:'household:1'}]}]})],
    ['authoritative person slot',input=>({...input,templates:[{...input.templates[0],additionalMembers:[{slotId:'person:2',birth:{kind:'any-living'}}]}]})],
    ['unknown algorithm',input=>({...input,algorithmId:'composition.other-v1'})],
    ['bad policy id',input=>({...input,policyId:'default'})],
    ['bad date',input=>({...input,scope:{...input.scope,effectiveFrom:{year:2032,month:2,day:30}}})],
    ['reversed dates',input=>({...input,scope:{...input.scope,effectiveFrom:input.scope.effectiveThrough,effectiveThrough:input.scope.effectiveFrom}})],
    ['empty bindings',input=>({...input,anchorBindings:[]})],
    ['empty templates',input=>({...input,templates:[]})],
    ['zero units with slot',input=>({...input,templates:[{...structuralTemplate('structure.one',1),households:[]}]})],
    ['no anchor in unit',input=>({...input,templates:[{...structuralTemplate('structure.one',1),households:[{householdSlotId:'unit.one',members:[{kind:'materialize',slotId:'member.slot-1'}]}]}]})],
    ['duplicate slot',input=>({...input,templates:[{...structuralTemplate('structure.one',1),additionalMembers:Array(2).fill({slotId:'member.slot-1',birth:{kind:'any-living'}})}]})],
    ['missing slot reference',input=>({...input,templates:[{...input.templates[0],households:[{householdSlotId:'unit.one',members:[{kind:'anchor',bindingId:'anchor.one'},{kind:'materialize',slotId:'member.missing'}]}]}]})],
    ['empty unit',input=>({...input,templates:[{...input.templates[0],households:[{householdSlotId:'unit.one',members:[]}]}]})],
    ['duplicate unit',input=>({...input,templates:[{...input.templates[0],households:[...input.templates[0].households,...input.templates[0].households]}]})],
    ['binding slot collision',input=>({...input,templates:[{...input.templates[0],additionalMembers:[{slotId:'anchor.one',birth:{kind:'any-living'}}]}]})],
    ['slot unit collision',input=>({...input,templates:[{...structuralTemplate('structure.one',1),households:[{...structuralTemplate('structure.one',1).households[0],householdSlotId:'member.slot-1'}]}]})],
    ['invalid tagged birth',input=>({...input,templates:[{...structuralTemplate('structure.one',1),additionalMembers:[{slotId:'member.slot-1',birth:{kind:'age',minimumAge:18,maximumAge:20}}]}]})],
    ['extra birth field',input=>({...input,templates:[{...structuralTemplate('structure.one',1),additionalMembers:[{slotId:'member.slot-1',birth:{kind:'any-living',gender:'Unspecified'}}]}]})],
  ];
  it.each(invalidInputs)('rejects %s',(_name,modify)=>expect(()=>withHouseholdCompositionPolicyFingerprint(modify(clone(policyInput())) as HouseholdCompositionPolicyInputV1)).toThrow());
  it.each([
    ['wrong version',{version:2}],['seed missing',{rootSeed:undefined}],['negative seed',{rootSeed:-1}],['unsafe seed',{rootSeed:0x100000000}],['fractional seed',{rootSeed:1.5}],['key malformed',{requestKey:'bad key'}],['country mismatch',{countryId:'another'}],['date outside scope',{referenceDate:{year:2031,month:6,day:30}}],['date invalid',{referenceDate:{year:2032,month:2,day:30}}],['missing anchors',{anchors:[]}],['missing person',{anchors:[{bindingId:'anchor.one',personId:'person:2'}]}],['leading zero ID',{anchors:[{bindingId:'anchor.one',personId:'person:01'}]}],['binding mismatch',{anchors:[{bindingId:'anchor.two',personId:'person:1'}]}],['unexpected DOB',{dateOfBirth:{year:2000,month:1,day:1}}],
  ])('rejects request %s',(_name,patch)=>{
    const request={...fixtureRequest(),...patch} as HouseholdCompositionRequestV1;
    expect(validateHouseholdCompositionRequest(request,fixturePolicy(),fixtureContext())).toBe(false);
    expect(()=>evaluateHouseholdComposition(fixturePolicy(),request,fixtureContext())).toThrow();
  });
  it('rejects duplicate Persons bound under different anchors',()=>{
    const policy=withHouseholdCompositionPolicyFingerprint({...policyInput([{id:'structure.zero',weight:1,when:[],additionalMembers:[],households:[]}]),anchorBindings:['anchor.one','anchor.two']});
    expect(validateHouseholdCompositionRequest({...fixtureRequest(),anchors:[{bindingId:'anchor.one',personId:'person:1'},{bindingId:'anchor.two',personId:'person:1'}]},policy,fixtureContext())).toBe(false);
  });
  it('rejects deceased or future DOB anchors',()=>{
    const source=fixtureContext(),person=source.people.people[0];
    for(const patch of [{lifeStatus:'deceased' as const,diedAt:fixtureDate},{dateOfBirth:{year:2033,month:1,day:1}}]){
      const context={...source,people:replacePerson(source.people,{...person,...patch})};
      expect(validateHouseholdCompositionRequest(fixtureRequest(),fixturePolicy(),context)).toBe(false);
    }
  });
  it('rejects future birth-year slots and calendar-unrealizable ages without clipping',()=>{
    const template=structuralTemplate('structure.one',1);
    for(const birth of [{kind:'birth-year-range' as const,minimumYear:2032,maximumYear:2033},{kind:'completed-age-range' as const,minimumAge:0,maximumAge:3000}]){
      const policy=fixturePolicy([{...template,additionalMembers:[{slotId:'member.slot-1',birth}]}]);
      expect(()=>evaluateHouseholdComposition(policy,fixtureRequest(),fixtureContext())).toThrow();
    }
  });
  it('uses shared leap-day completed-age semantics at boundaries',()=>{
    const source=fixtureContext(),context={...source,people:replacePerson(source.people,{...source.people.people[0],dateOfBirth:{year:2004,month:2,day:29}})},input=policyInput([{...structuralTemplate(),when:[{bindingId:'anchor.one',completedAge:{minimumAge:28,maximumAge:28}}]}]);
    const policy=withHouseholdCompositionPolicyFingerprint(input);
    expect(()=>evaluateHouseholdComposition(policy,{...fixtureRequest(),referenceDate:{year:2032,month:2,day:28}},context)).toThrow('No eligible');
    expect(evaluateHouseholdComposition(policy,{...fixtureRequest(),referenceDate:{year:2032,month:2,day:29}},context).templateId).toBe('structure.one');
  });
  it('supports shared year1 calendar capabilities without a modern-year guard',()=>{
    const input=policyInput([{...structuralTemplate('structure.one',1),additionalMembers:[{slotId:'member.slot-1',birth:{kind:'birth-year-range',minimumYear:1,maximumYear:1899}}]}]);
    expect(evaluateHouseholdComposition(withHouseholdCompositionPolicyFingerprint(input),fixtureRequest(),fixtureContext()).additionalMembers[0].birth.kind).toBe('birth-year-range');
  });
  it('does not reject very old anchors using the generator age-range guard',()=>{
    const source=fixtureContext(),context={...source,people:replacePerson(source.people,{...source.people.people[0],dateOfBirth:{year:1700,month:1,day:1}})};
    const policy=fixturePolicy([{...structuralTemplate(),when:[{bindingId:'anchor.one',completedAge:{minimumAge:300,maximumAge:400}}]}]);
    expect(evaluateHouseholdComposition(policy,fixtureRequest(),context).templateId).toBe('structure.one');
  });
  it('independently rejects tampered expansion, refs, fingerprints, ordering or request',()=>{
    const {plan,policy,context}=run(2);
    const mutations:unknown[]=[{...plan,version:2},{...plan,policyFingerprint:'fnv1a64-v1:0000000000000000'},{...plan,requestFingerprint:'fnv1a64-v1:0000000000000000'},{...plan,templateId:'structure.other'},{...plan,additionalMembers:[...plan.additionalMembers].reverse()},{...plan,additionalMembers:[]},{...plan,households:[]},{...plan,request:{...plan.request,rootSeed:1}},{...plan,completion:true},{...plan,households:[{householdSlotId:'unit.one',members:[{kind:'existing',personId:'person:2'}]}]}];
    for(const mutation of mutations)expect(validateHouseholdCompositionPlan(mutation,policy,context)).toBe(false);
    expect(validateHouseholdCompositionPlan(plan,policy,context)).toBe(true);
    expect(()=>assessHouseholdCompositionReadiness(mutations[0] as HouseholdCompositionPlanV1,policy,context)).toThrow();
  });
  it('rejects stale relevant facts even if the structure is unchanged',()=>{
    const {plan,policy,context}=run(1),person=context.people.people[0];
    const changed={...context,people:replacePerson(context.people,{...person,dateOfBirth:{...person.dateOfBirth,day:29}})};
    expect(validateHouseholdCompositionPlan(plan,policy,changed)).toBe(false);
  });
});

describe('Hostile input, ownership and side effects',()=>{
  const hostileFactories:readonly [string,()=>unknown][]=[
    ['sparse array',()=>Array(2)],['symbol',()=>({[Symbol('hidden')]:1})],['hidden',()=>Object.defineProperty({},'hidden',{value:1})],['class',()=>new (class Example {value=1;})()],['date',()=>new Date(0)],['NaN',()=>NaN],['Infinity',()=>Infinity],['proxy',()=>new Proxy({}, {})],['revoked proxy',()=>{const {proxy,revoke}=Proxy.revocable({},{});revoke();return proxy;}],['cycle',()=>{const value:{self?:unknown}={};value.self=value;return value;}],['unsupported array prototype',()=>{const value:unknown[]=[];Object.setPrototypeOf(value,null);return value;}],
  ];
  it.each(hostileFactories)('rejects %s predictably at all public validation boundaries',(_name,make)=>{
    const hostile=make(),policy=fixturePolicy(),context=fixtureContext();
    expect(validateHouseholdCompositionPolicy(hostile)).toBe(false);
    expect(validateHouseholdCompositionRequest(hostile,policy,context)).toBe(false);
    expect(validateHouseholdCompositionPlan(hostile,policy,context)).toBe(false);
    expect(()=>snapshot(hostile)).toThrow('Invalid Household composition JSON');
  });
  it('does not invoke getters anywhere in policy/request/context/plan',()=>{
    let calls=0;const bad=Object.defineProperty({},'value',{enumerable:true,get(){calls++;throw Error('getter');}});
    const {policy,request,context,plan}=run();
    expect(validateHouseholdCompositionPolicy({...policy,scope:bad})).toBe(false);
    expect(validateHouseholdCompositionRequest({...request,anchors:[bad]},policy,context)).toBe(false);
    expect(validateHouseholdCompositionRequest(request,policy,{people:bad,household:context.household} as unknown as HouseholdCompositionContextV1)).toBe(false);
    expect(validateHouseholdCompositionPlan({...plan,households:[bad]},policy,context)).toBe(false);
    expect(calls).toBe(0);
  });
  it('rejects transparent proxies inside valid-looking structure',()=>{
    const policy=fixturePolicy(),request=fixtureRequest(),context=fixtureContext();
    expect(validateHouseholdCompositionPolicy(new Proxy(policy,{}))).toBe(false);
    expect(validateHouseholdCompositionRequest({...request,referenceDate:new Proxy(fixtureDate,{})},policy,context)).toBe(false);
  });
  it('bounds pathological nesting and sparse resource attacks',()=>{
    let nested:unknown=0;for(let i=0;i<45;i++)nested={nested};
    expect(()=>snapshot(nested)).toThrow();expect(()=>snapshot(Array(1_000_001))).toThrow();
  });
  it('owns immutable outputs and does not freeze or mutate caller inputs',()=>{
    const policy=clone(fixturePolicy([structuralTemplate('structure.one',2)])),request=clone(fixtureRequest()),context=clone(fixtureContext()),before=clone({policy,request,context});
    const plan=evaluateHouseholdComposition(policy,request,context),original=clone(plan);
    expect({policy,request,context}).toEqual(before);
    expect(Object.isFrozen(policy)).toBe(false);expect(Object.isFrozen(context.people)).toBe(false);
    policy.templates=[];request.rootSeed=1;context.people.people[0].name='Changed';
    expect(plan).toEqual(original);
    expect(Object.isFrozen(plan.additionalMembers[0].birth)).toBe(true);
    expect(()=>{(plan.households as unknown[]).push({});}).toThrow();
    expect(()=>{(plan.request as {rootSeed:number}).rootSeed=99;}).toThrow();
  });
  it('owns registry and diagnostic data without mutable indexes on canonical objects',()=>{
    const source=clone(fixturePolicy()),manifest=[{policyId:source.policyId,fingerprint:source.fingerprint}],registry=createHouseholdCompositionRegistry([source],manifest),resolved=resolveHouseholdCompositionPolicy(registry,source.policyId);
    const diagnostic=diagnoseHouseholdComposition(resolved,fixtureRequest(),fixtureContext());
    source.templates=[];manifest.length=0;
    expect(registry.policies[0].templates).toHaveLength(1);
    expect(Object.isFrozen(diagnostic.eligibleTemplateIds)).toBe(true);
    expect(()=>{(diagnostic.eligibleTemplateIds as string[]).push('structure.other');}).toThrow();
    expect(Object.keys(registry)).toEqual(['version','policies','manifest']);
    expect(Object.keys(resolved)).not.toContain('index');
  });
  it('leaves full supplied authority and sequential RNG containers untouched',()=>{
    const context=clone(fixtureContext()),authority={...context,clock:{date:fixtureDate},rng:{streams:{ordinary:{state:123,cursor:9}}},history:[],events:[],scheduler:[]},before=clone(authority);
    const {people,household}=authority;
    for(let index=0;index<20;index++)evaluateHouseholdComposition(fixturePolicy(),fixtureRequest(),{people,household});
    expect(authority).toEqual(before);
    expect(()=>evaluateHouseholdComposition(fixturePolicy(),fixtureRequest(),authority as HouseholdCompositionContextV1)).toThrow();
  });
  it('has no country-specific rules and permits explicitly scoped alternative country/null',()=>{
    for(const countryId of ['synthetic-other',null]){
      const policy=withHouseholdCompositionPolicyFingerprint({...policyInput(),scope:{...policyInput().scope,countryId}});
      expect(evaluateHouseholdComposition(policy,{...fixtureRequest(),countryId},fixtureContext()).households).toHaveLength(1);
    }
  });
});
