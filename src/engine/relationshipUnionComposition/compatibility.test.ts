import {describe,expect,it} from 'vitest';
import {establishPartnership} from '../partnership/state';
import {createFormalUnion,setFormalUnionSeparation,endFormalUnion} from '../formalUnion/state';
import {canonicalStringify} from './data';
import {withRelationshipUnionCompositionPolicyFingerprint} from './package';
import {evaluateRelationshipUnionComposition} from './runtime';
import {assessRelationshipUnionPlanAgainstPartnership,assessRelationshipUnionPlanAgainstFormalUnion,assessRelationshipUnionCompositionReadiness,resolveRelationshipUnionCompositionPlan,validateResolvedRelationshipUnionCompositionPlan} from './compatibility';
import {fixtureOriginal,fixtureTemplate,fixtureInput,fixtureRequest,fixtureContext,fixtureDate,currentView,futureOriginal,appendPerson,unionTemplate,kindRef,fixtureKinds,binding,additional} from './fixtures';
import type {RelationshipOriginalPlanV1,RelationshipUnionCompositionTemplateV1,RelationshipUnionCurrentContextV1,RelationshipContractBindingV1} from './types';

type Mutable<T>=T extends object?{-readonly [K in keyof T]:Mutable<T[K]>}:T;
const copy=<T,>(x:T):Mutable<T>=>structuredClone(x) as Mutable<T>;
const pView=(c:RelationshipUnionCurrentContextV1)=>({people:c.people,partnership:c.partnership,referenceDate:c.referenceDate});
const uView=(c:RelationshipUnionCurrentContextV1)=>({people:c.people,formalUnion:c.formalUnion,referenceDate:c.referenceDate});
const uContext=(c:RelationshipUnionCurrentContextV1)=>({people:c.people,referenceDate:c.referenceDate,kinds:fixtureKinds});
const applied=(o:RelationshipOriginalPlanV1)=>{
  const c=copy(currentView(o.context)),u=o.plan.formalUnions[0];if(u.kind!=='create-contract')throw Error('Expected fixture create');
  const result=createFormalUnion(c.formalUnion,{personIds:['person:1','person:2'],kindId:kindRef.kindId,formedOn:u.formedOn},uContext(c));
  c.formalUnion=copy(setFormalUnionSeparation(result.state,result.union.id,u.separation,uContext(c)));
  const bindings:readonly RelationshipContractBindingV1[]=[{contract:u.contract,planFingerprint:o.plan.planFingerprint,unionId:result.union.id}];return {current:c,bindings,unionId:result.union.id};
};
const assertOriginal=(separation:'unknown'|'not-separated'|'separated'='unknown')=>{
  const t:RelationshipUnionCompositionTemplateV1={...fixtureTemplate('structure.assert'),partnerships:[],formalUnions:[{kind:'assert-existing',unionBindingId:'union.current',subjects:[binding('anchor.one'),binding('anchor.two')],unionKind:kindRef,separation}]},policy=withRelationshipUnionCompositionPolicyFingerprint({...fixtureInput([t]),unionBindings:['union.current']}),context=fixtureContext(),request={...fixtureRequest(),unionBindings:[{unionBindingId:'union.current',unionId:'formal-union:1'}]};
  return {policy,context,plan:evaluateRelationshipUnionComposition(request,policy,context)};
};

describe('read-only Partnership and independent contract compatibility',()=>{
  it('reports missing P; an already satisfied pair has no missing creation',()=>{
    const o=fixtureOriginal(),c=copy(currentView(o.context)),before=canonicalStringify(c);
    expect(assessRelationshipUnionPlanAgainstPartnership(o,pView(c))).toEqual({status:'COMPATIBLE',reasons:[]});expect(resolveRelationshipUnionCompositionPlan(o,[],c).missingPartnerships).toHaveLength(1);expect(canonicalStringify(c)).toBe(before);
    c.partnership=copy(establishPartnership(c.partnership,'person:2','person:1',{people:c.people,referenceDate:fixtureDate}));expect(resolveRelationshipUnionCompositionPlan(o,[],c).missingPartnerships).toEqual([]);
  });
  it('unrelated positive pairs remain untouched by an empty plan',()=>{const o=fixtureOriginal([{...fixtureTemplate(),partnerships:[]}]),c=copy(currentView(o.context));c.partnership=copy(establishPartnership(c.partnership,'person:1','person:2',{people:c.people,referenceDate:fixtureDate}));const before=canonicalStringify(c);expect(resolveRelationshipUnionCompositionPlan(o,[],c).desiredPartnerships).toEqual([]);expect(canonicalStringify(c)).toBe(before);});
  it('existing subject changes dominate unresolved futures and require reevaluation',()=>{const o=futureOriginal(),c=copy(currentView(o.context));c.people.people[0].lifeStatus='deceased';c.people.people[0].diedAt=fixtureDate;expect(assessRelationshipUnionPlanAgainstPartnership(o,pView(c))).toMatchObject({status:'INCOMPATIBLE'});});
  it('date mismatch is incompatible, never a new selection',()=>{const o=fixtureOriginal(),c=copy(currentView(o.context));c.referenceDate={year:2032,month:7,day:1};expect(assessRelationshipUnionPlanAgainstPartnership(o,pView(c)).status).toBe('INCOMPATIBLE');expect(()=>resolveRelationshipUnionCompositionPlan(o,[],c)).toThrow('Invalid or incompatible');});
  it('mechanical union compatibility does not replace missing kind resolution',()=>{const o=fixtureOriginal([unionTemplate()]),c=currentView(o.context),r=assessRelationshipUnionCompositionReadiness(o,c);expect(r.materialization.status).toBe('READY');expect(r.compatibility.formalUnion.status).toBe('COMPATIBLE');expect(r.kinds.status).toBe('UNRESOLVED');expect(()=>resolveRelationshipUnionCompositionPlan(o,[],c)).toThrow();});
  it('new contract never aliases an existing same-pair/kind contract',()=>{
    const o=fixtureOriginal([unionTemplate()]),a=applied(o),before=canonicalStringify(a.current);expect(assessRelationshipUnionPlanAgainstFormalUnion(o,uView(a.current)).status).toBe('INCOMPATIBLE');
    expect(assessRelationshipUnionPlanAgainstFormalUnion(o,uView(a.current),a.bindings).status).toBe('COMPATIBLE');const resolved=resolveRelationshipUnionCompositionPlan(o,[],a.current,fixtureKinds,a.bindings);expect(resolved.missingFormalUnions).toEqual([]);expect(resolved.satisfiedFormalUnions[0].unionId).toBe(a.unionId);expect(canonicalStringify(a.current)).toBe(before);
  });
  it('explicit existing ID asserts standing without rewriting formation metadata',()=>{
    const o=assertOriginal(),created=fixtureOriginal([{...unionTemplate(),formalUnions:[{...unionTemplate().formalUnions[0],formedOn:{year:2030,month:1,day:1}}] as never}]),a=applied(created),before=canonicalStringify(a.current);
    expect(assessRelationshipUnionPlanAgainstFormalUnion(o,uView(a.current)).status).toBe('COMPATIBLE');const resolved=resolveRelationshipUnionCompositionPlan(o,[],a.current,fixtureKinds);expect(resolved.missingFormalUnions).toEqual([]);expect(resolved.satisfiedFormalUnions).toEqual([{target:{kind:'assert-existing',unionId:'formal-union:1'},unionId:'formal-union:1'}]);expect(canonicalStringify(a.current)).toBe(before);
  });
  it('explicit missing ID is incompatible and no fallback is created',()=>{const o=assertOriginal(),c=currentView(o.context);expect(assessRelationshipUnionPlanAgainstFormalUnion(o,uView(c)).status).toBe('INCOMPATIBLE');expect(()=>resolveRelationshipUnionCompositionPlan(o,[],c,fixtureKinds)).toThrow();expect(c.formalUnion.nextSequence).toBe(1);});
  it.each(['wrong-fingerprint','duplicate-contract','duplicate-target','extra','wrong-id','null'])('rejects forged or malformed contract bindings %s',kind=>{
    const o=fixtureOriginal([unionTemplate()]),a=applied(o),b=copy(a.bindings);let value:unknown=b;
    if(kind==='wrong-fingerprint')b[0].planFingerprint='fnv1a64-v1:0000000000000000';if(kind==='duplicate-contract'||kind==='duplicate-target')value=[...b,b[0]];if(kind==='extra')b[0].contract.contractSlotId='unrelated.contract';if(kind==='wrong-id')b[0].unionId='formal-union:01';if(kind==='null')value=null;
    expect(()=>assessRelationshipUnionPlanAgainstFormalUnion(o,uView(a.current),value as readonly RelationshipContractBindingV1[])).toThrow();
  });
  it('different scoped create intents cannot claim one asserted Union ID',()=>{
    const o=fixtureOriginal([unionTemplate()]),a=applied(o),b={...a.bindings[0],contract:{...a.bindings[0].contract,scopeId:'unrelated.scope'}};expect(()=>assessRelationshipUnionPlanAgainstFormalUnion(o,uView(a.current),[b])).toThrow();
  });
  it.each(['standing','formation','pair','missing-record'])('receipt binding rejects changed actual contract %s',kind=>{
    const o=fixtureOriginal([unionTemplate()]),a=applied(o),c=copy(a.current);
    if(kind==='standing')c.formalUnion=copy(setFormalUnionSeparation(c.formalUnion,a.unionId,'separated',uContext(c)));
    if(kind==='formation')c.formalUnion.unions[0].formedOn={year:2031,month:1,day:1};
    if(kind==='pair'){c.people=copy(appendPerson(c.people,1990));c.formalUnion.unions[0].personIds=['person:1','person:3'];}
    if(kind==='missing-record')c.formalUnion.unions=[];
    expect(assessRelationshipUnionPlanAgainstFormalUnion(o,uView(c),a.bindings).status).toBe('INCOMPATIBLE');
  });
  it('no pending contract allocator advance; safe capacity uses exact aggregate',()=>{
    const o=fixtureOriginal([unionTemplate()]),c=copy(currentView(o.context)),before=canonicalStringify(c);resolveRelationshipUnionCompositionPlan(o,[],c,fixtureKinds);expect(canonicalStringify(c)).toBe(before);expect(c.formalUnion.nextSequence).toBe(1);
    c.formalUnion.nextSequence=Number.MAX_SAFE_INTEGER;expect(assessRelationshipUnionPlanAgainstFormalUnion(o,uView(c)).status).toBe('INCOMPATIBLE');expect(()=>createFormalUnion(c.formalUnion,{personIds:['person:1','person:2'],kindId:kindRef.kindId,formedOn:null},uContext(c))).toThrow('exhausted');
    c.formalUnion.nextSequence=Number.MAX_SAFE_INTEGER-1;expect(assessRelationshipUnionPlanAgainstFormalUnion(o,uView(c)).status).toBe('COMPATIBLE');expect(createFormalUnion(c.formalUnion,{personIds:['person:1','person:2'],kindId:kindRef.kindId,formedOn:null},uContext(c)).state.nextSequence).toBe(Number.MAX_SAFE_INTEGER);
  });
  it('read-only formation preflight matches frozen operations for explicit dates/separation',()=>{
    for(const separation of ['unknown','not-separated','separated'] as const){const t=unionTemplate(),u=t.formalUnions[0];if(u.kind!=='create-contract')throw Error();const o=fixtureOriginal([{...t,formalUnions:[{...u,formedOn:{year:2030,month:2,day:28},separation}]}]),c=currentView(o.context),proposal=resolveRelationshipUnionCompositionPlan(o,[],c,fixtureKinds),a=applied(o);expect(proposal.missingFormalUnions[0].separation).toBe(separation);expect(a.current.formalUnion.unions[0].standing).toEqual({kind:'in-force',separation});expect(assessRelationshipUnionPlanAgainstFormalUnion(o,uView(a.current),a.bindings).status).toBe('COMPATIBLE');}
  });
  it('declared future formation/calendar impossibility excludes templates without invented DOB',()=>{
    for(const formedOn of [{year:2033,month:1,day:1},{year:1999,month:1,day:1}]){const t=unionTemplate(),u=t.formalUnions[0];if(u.kind!=='create-contract')throw Error();expect(()=>fixtureOriginal([{...t,formalUnions:[{...u,formedOn}]}])).toThrow('No eligible');}
  });
  it('deceased existing participants are mechanically permitted by frozen Union rules, never legal endorsement',()=>{
    const t=unionTemplate(),policy=withRelationshipUnionCompositionPolicyFingerprint(fixtureInput([t])),context=copy(fixtureContext());context.people.people[1].lifeStatus='deceased';context.people.people[1].diedAt=fixtureDate;
    const o={policy,context,plan:evaluateRelationshipUnionComposition(fixtureRequest(),policy,context)},c=currentView(context);expect(resolveRelationshipUnionCompositionPlan(o,[],c,fixtureKinds).missingFormalUnions).toHaveLength(1);expect(applied(o).current.formalUnion.unions).toHaveLength(1);
  });
});

describe('exact actual Person resolution and pure proposal validation',()=>{
  it('validates supplied newly living actual Person with declared age; no allocation',()=>{
    const o=futureOriginal(),c=copy(currentView(o.context));c.people=copy(appendPerson(c.people,2000));const rows=[{subject:o.plan.materializationRequirements[0].subject,personId:'person:3'}],before=canonicalStringify({o,c,rows}),resolved=resolveRelationshipUnionCompositionPlan(o,rows,c);
    expect(resolved.desiredPartnerships).toEqual([{personIds:['person:1','person:3']}]);expect(validateResolvedRelationshipUnionCompositionPlan(resolved,o,rows,c)).toBe(true);expect(canonicalStringify({o,c,rows})).toBe(before);
    expect(validateResolvedRelationshipUnionCompositionPlan({...resolved,extra:true},o,rows,c)).toBe(false);expect(Object.isFrozen(resolved.desiredPartnerships[0].personIds)).toBe(true);
  });
  it.each(['missing','extra','original-id','missing-id','wrong-age','deceased','malformed-subject','wrong-date'])('rejects incorrect supplied resolutions %s atomically',kind=>{
    const o=futureOriginal(),c=copy(currentView(o.context));c.people=copy(appendPerson(c.people,2000));let rows=[{subject:o.plan.materializationRequirements[0].subject,personId:'person:3'}];
    if(kind==='missing')rows=[];if(kind==='extra')rows=[...rows,rows[0]];if(kind==='original-id')rows[0].personId='person:1';if(kind==='missing-id')rows[0].personId='person:99';if(kind==='wrong-age')c.people.people[2].dateOfBirth=fixtureDate;if(kind==='deceased'){c.people.people[2].lifeStatus='deceased';c.people.people[2].diedAt=fixtureDate;}if(kind==='malformed-subject')rows=[{subject:{...rows[0].subject,slotId:'unrelated.slot'},personId:'person:3'}];if(kind==='wrong-date')c.referenceDate={year:2032,month:7,day:1};
    const before=canonicalStringify({o,c,rows});expect(()=>resolveRelationshipUnionCompositionPlan(o,rows,c)).toThrow('Invalid or incompatible');expect(canonicalStringify({o,c,rows})).toBe(before);
  });
  it('CASE 13: two distinct future humans cannot collapse onto one Person',()=>{
    const t={...fixtureTemplate(),additionalSubjects:[{slotId:'outside.one',birth:{kind:'any-living' as const}},{slotId:'outside.two',birth:{kind:'any-living' as const}}],partnerships:[{subjects:[additional('outside.one'),additional('outside.two')] as const}]},o=fixtureOriginal([t]),c=copy(currentView(o.context));c.people=copy(appendPerson(c.people,2000));
    const before=canonicalStringify(c),rows=o.plan.materializationRequirements.map(r=>({subject:r.subject,personId:'person:3'}));expect(assessRelationshipUnionCompositionReadiness(o,c).materialization.status).toBe('NOT_READY');expect(()=>resolveRelationshipUnionCompositionPlan(o,rows,c)).toThrow();expect(canonicalStringify(c)).toBe(before);
  });
  it('recanonicalizes lexicographic Person IDs after transient mapping',()=>{
    const o=futureOriginal(),c=copy(currentView(o.context));for(let i=3;i<=10;i++)c.people=copy(appendPerson(c.people,2000));const rows=[{subject:o.plan.materializationRequirements[0].subject,personId:'person:10'}];expect(resolveRelationshipUnionCompositionPlan(o,rows,c).desiredPartnerships[0].personIds).toEqual(['person:1','person:10']);
  });
});

describe('formal contract architecture stress cases',()=>{
  it('CASE 7: formal contract needs no romantic pair',()=>{const o=fixtureOriginal([unionTemplate()]),c=currentView(o.context),before=canonicalStringify(c),r=assessRelationshipUnionCompositionReadiness(o,c,fixtureKinds);expect(r).toMatchObject({materialization:{status:'READY'},compatibility:{partnership:{status:'COMPATIBLE'},formalUnion:{status:'COMPATIBLE'}},kinds:{status:'RESOLVED'}});expect(o.plan.partnerships).toEqual([]);expect(resolveRelationshipUnionCompositionPlan(o,[],c,fixtureKinds).missingFormalUnions).toHaveLength(1);expect(canonicalStringify(c)).toBe(before);});
  it('CASE 9: separated formal union remains in force without dissolution',()=>{const t=unionTemplate(),u=t.formalUnions[0];if(u.kind!=='create-contract')throw Error();const o=fixtureOriginal([{...t,formalUnions:[{...u,separation:'separated'}]}]),a=applied(o),before=canonicalStringify(a.current),r=assessRelationshipUnionCompositionReadiness(o,a.current,fixtureKinds,a.bindings);expect(r.compatibility.formalUnion.status).toBe('COMPATIBLE');expect(a.current.formalUnion.unions[0].standing).toEqual({kind:'in-force',separation:'separated'});expect(resolveRelationshipUnionCompositionPlan(o,[],a.current,fixtureKinds,a.bindings).missingFormalUnions).toEqual([]);expect(canonicalStringify(a.current)).toBe(before);});
  it('CASE 11: multiple independent contracts use allowed distinct participant cells',()=>{
    const c=copy(fixtureContext());c.people=copy(appendPerson(c.people,1990));const t=unionTemplate(),u=t.formalUnions[0];if(u.kind!=='create-contract')throw Error();
    const input={...fixtureInput([{...t,formalUnions:[u,{...u,contractSlotId:'contract.two',subjects:[binding('anchor.one'),binding('anchor.three')]}]}]),bindings:[...fixtureInput().bindings,{bindingId:'anchor.three',accepts:'existing' as const}]},policy=withRelationshipUnionCompositionPolicyFingerprint(input),request={...fixtureRequest(),bindings:[...fixtureRequest().bindings,{bindingId:'anchor.three',subject:{kind:'existing' as const,personId:'person:3'}}]},o={policy,context:c,plan:evaluateRelationshipUnionComposition(request,policy,c)},current=currentView(c),before=canonicalStringify(current),r=assessRelationshipUnionCompositionReadiness(o,current,fixtureKinds);expect(r.materialization.status).toBe('READY');expect(r.compatibility.formalUnion.status).toBe('COMPATIBLE');expect(resolveRelationshipUnionCompositionPlan(o,[],current,fixtureKinds).missingFormalUnions).toHaveLength(2);expect(canonicalStringify(current)).toBe(before);
  });
  it('CASE 15: terminal episode remains distinct from planned new contract; no reopening',()=>{
    const prior=fixtureOriginal([unionTemplate('contract.old')]),o=fixtureOriginal([unionTemplate('contract.new')]),a=applied(prior),c=copy(a.current);c.formalUnion=copy(endFormalUnion(c.formalUnion,a.unionId,{reason:'dissolution',endedOn:null},uContext(c)));const before=canonicalStringify(c),r=assessRelationshipUnionCompositionReadiness(o,c,fixtureKinds);expect(r.compatibility.formalUnion.status).toBe('COMPATIBLE');expect(resolveRelationshipUnionCompositionPlan(o,[],c,fixtureKinds).missingFormalUnions).toHaveLength(1);expect(assessRelationshipUnionPlanAgainstFormalUnion(prior,uView(c),a.bindings).status).toBe('INCOMPATIBLE');expect(assessRelationshipUnionPlanAgainstFormalUnion(assertOriginal(),uView(c)).status).toBe('INCOMPATIBLE');expect(canonicalStringify(c)).toBe(before);
  });
});
