import {describe,expect,it} from 'vitest';
import {createFormalUnion} from '../formalUnion/state';
import {createFormalUnionKindRegistry,withFormalUnionKindFingerprint} from '../formalUnion/kinds';
import {withRelationshipUnionCompositionPolicyFingerprint} from './package';
import {evaluateRelationshipUnionComposition} from './runtime';
import {assessRelationshipUnionKindResolution} from './kinds';
import {assessRelationshipUnionCompositionReadiness,resolveRelationshipUnionCompositionPlan} from './compatibility';
import {canonicalStringify} from './data';
import {fixtureOriginal,fixtureInput,fixtureContext,fixtureRequest,fixtureTemplate,fixtureKinds,fixtureKind,kindRef,unionTemplate,currentView,fixtureDate,binding,additional} from './fixtures';
import type {FormalUnionKindRegistryV1} from '../formalUnion/types';

describe('exact immutable kind availability separate from plan structure',()=>{
  it('CASE 14: valid planned pin absent from registry is unresolved, never substituted',()=>{
    const o=fixtureOriginal([unionTemplate()]),c=currentView(o.context),before=canonicalStringify({o,c});
    expect(assessRelationshipUnionKindResolution(o,{people:c.people,formalUnion:c.formalUnion,referenceDate:fixtureDate})).toMatchObject({status:'UNRESOLVED'});
    const readiness=assessRelationshipUnionCompositionReadiness(o,c);expect(readiness.materialization.status).toBe('READY');expect(readiness.compatibility.formalUnion.status).toBe('COMPATIBLE');expect(readiness.kinds.reasons[0]).toContain(kindRef.kindId);
    expect(()=>resolveRelationshipUnionCompositionPlan(o,[],c)).toThrow();expect(canonicalStringify({o,c})).toBe(before);expect(o.plan.materializationRequirements).toEqual([]);
  });
  it('matches exact registered immutable fingerprint and creates no state',()=>{const o=fixtureOriginal([unionTemplate()]),c=currentView(o.context),before=canonicalStringify(c);expect(assessRelationshipUnionCompositionReadiness(o,c,fixtureKinds).kinds).toEqual({status:'RESOLVED',reasons:[]});expect(canonicalStringify(c)).toBe(before);});
  it('changed semantics under same kind ID cannot satisfy a previous content pin',()=>{
    const {fingerprint:_hash,...input}=fixtureKind,changed=withFormalUnionKindFingerprint({...input,definition:'Changed semantic contract.'}),registry=createFormalUnionKindRegistry([changed],[{kindId:changed.kindId,fingerprint:changed.fingerprint}]),o=fixtureOriginal([unionTemplate()]),c=currentView(o.context);
    expect(assessRelationshipUnionKindResolution(o,{people:c.people,formalUnion:c.formalUnion,referenceDate:fixtureDate},registry)).toMatchObject({status:'UNRESOLVED'});
  });
  it('all current unrelated/terminal union kinds resolve even when plan is Partnership only',()=>{
    const o=fixtureOriginal(),c=currentView(o.context),result=createFormalUnion(c.formalUnion,{personIds:['person:1','person:2'],kindId:kindRef.kindId,formedOn:null},{people:c.people,referenceDate:fixtureDate,kinds:fixtureKinds});
    const current={...c,formalUnion:result.state};expect(assessRelationshipUnionCompositionReadiness(o,current).kinds.status).toBe('UNRESOLVED');expect(assessRelationshipUnionCompositionReadiness(o,current,fixtureKinds).kinds.status).toBe('RESOLVED');
    const terminal={...result.state,unions:result.state.unions.map(u=>({...u,standing:{kind:'ended' as const,end:{reason:'annulment' as const,endedOn:null}}}))};expect(assessRelationshipUnionCompositionReadiness(o,{...c,formalUnion:terminal}).kinds.status).toBe('UNRESOLVED');
  });
  it.each([null,false,{},[],{version:2,kinds:[],manifest:[]},{version:1,kinds:[],manifest:[kindRef]}])('invalid registry is not an empty fallback: %s',value=>{
    const o=fixtureOriginal(),c=currentView(o.context);expect(()=>assessRelationshipUnionKindResolution(o,{people:c.people,formalUnion:c.formalUnion,referenceDate:fixtureDate},value as FormalUnionKindRegistryV1)).toThrow('Invalid');
  });
  it('missing kind does not alter keyed selection or planned identity',()=>{const o=fixtureOriginal([unionTemplate()]),before=canonicalStringify(o.plan);assessRelationshipUnionCompositionReadiness(o,currentView(o.context));expect(canonicalStringify(o.plan)).toBe(before);expect(evaluateRelationshipUnionComposition(o.plan.request,o.policy,o.context)).toEqual(o.plan);});
  it.each(['missing-pin','malformed-pin','unknown-standing','terminal-create','duplicate-slot','same-cell','assert-future'])('rejects malformed Union policy %s',mode=>{
    const t=structuredClone(unionTemplate()),u=t.formalUnions[0] as unknown as Record<string,unknown>;let input=fixtureInput([t]);
    if(mode==='missing-pin')u.unionKind={kindId:kindRef.kindId};if(mode==='malformed-pin')u.unionKind={...kindRef,fingerprint:'not-a-digest'};if(mode==='unknown-standing')u.separation='divorced';if(mode==='terminal-create')u.standing={kind:'ended'};
    if(mode==='duplicate-slot')input=fixtureInput([{...t,formalUnions:[...t.formalUnions,t.formalUnions[0]]}]);
    if(mode==='same-cell')input=fixtureInput([{...t,formalUnions:[...t.formalUnions,{...t.formalUnions[0],contractSlotId:'contract.other'} as never]}]);
    if(mode==='assert-future')input={...fixtureInput([{...fixtureTemplate(),additionalSubjects:[{slotId:'future.member',birth:{kind:'any-living'}}],formalUnions:[{kind:'assert-existing',unionBindingId:'union.current',subjects:[binding('anchor.one'),additional('future.member')],unionKind:kindRef,separation:'unknown'}]}]),unionBindings:['union.current']};
    expect(()=>withRelationshipUnionCompositionPolicyFingerprint(input)).toThrow();
  });
  it('future known chronological impossibility fails explicitly rather than attempting DOB retries',()=>{
    const t=unionTemplate(),u=t.formalUnions[0];if(u.kind!=='create-contract')throw Error();
    const policy=withRelationshipUnionCompositionPolicyFingerprint({...fixtureInput([{...t,additionalSubjects:[{slotId:'future.young',birth:{kind:'birth-year-range',minimumYear:2030,maximumYear:2032}}],formalUnions:[{...u,subjects:[binding('anchor.one'),additional('future.young')],formedOn:{year:2029,month:12,day:31}}]}]),bindings:[{bindingId:'anchor.one',accepts:'existing'}]}),request={...fixtureRequest(),bindings:fixtureRequest().bindings.slice(0,1)};
    expect(()=>evaluateRelationshipUnionComposition(request,policy,fixtureContext())).toThrow('No eligible');
  });
});
