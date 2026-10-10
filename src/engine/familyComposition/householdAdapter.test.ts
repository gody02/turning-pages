import {describe,expect,it} from 'vitest';
import {fixtureContext as householdContext,fixturePolicy as householdPolicy,fixtureRequest as householdRequest,structuralTemplate} from '../householdComposition/fixtures';
import {assessHouseholdCompositionReadiness,evaluateHouseholdComposition} from '../householdComposition/runtime';
import {adaptHouseholdCompositionSubjects,validateFamilyPlanHouseholdReferences} from './householdAdapter';
import {currentView,appendPerson,fixtureContext,fixtureInput,fixtureRequest,fixtureTemplate} from './fixtures';
import {withFamilyCompositionPolicyFingerprint} from './package';
import {evaluateFamilyComposition} from './runtime';
import {assessFamilyCompositionReadiness,resolveFamilyCompositionPlan} from './compatibility';
import {validateFamilyCompositionRequest} from './validation';

function setup(){
  const hc=householdContext(),hp=householdPolicy([structuralTemplate('structure.housemates',2)]),householdPlan=evaluateHouseholdComposition(hp,householdRequest(),hc),inventory=adaptHouseholdCompositionSubjects(householdPlan,hp,hc,'household.operation.synthetic');
  const input=fixtureInput(),policy=withFamilyCompositionPolicyFingerprint({...input,bindings:input.bindings.map(binding=>({...binding,accepts:binding.bindingId==='anchor.parent'?'subject' as const:'existing' as const}))});
  const request={...fixtureRequest(),bindings:[{bindingId:'anchor.parent',subject:{kind:'future' as const,scopeId:inventory.scopeId,slotId:'member.slot-1'}},{bindingId:'anchor.child',subject:{kind:'existing' as const,personId:'person:1'}}]},context={people:hc.people,kinship:fixtureContext().kinship,borrowedSubjects:[inventory]};
  return {hc,hp,householdPlan,inventory,policy,request,context};
}
describe('borrowed Household subjects and exact cross-plan identity',()=>{
  it('exports the actual validated Household requirements as owned immutable content',()=>{
    const {hc,hp,householdPlan,inventory}=setup();
    expect(inventory.producerId).toBe('household-composition.v1');expect(inventory.subjects).toEqual(householdPlan.additionalMembers);expect(Object.isFrozen(inventory.subjects[0].birth)).toBe(true);
    expect(adaptHouseholdCompositionSubjects(householdPlan,hp,hc,inventory.scopeId)).toEqual(inventory);
  });
  it('links one shared future parent once, without consuming the unused roommate slot',()=>{
    const {hc,hp,householdPlan,inventory,policy,request,context}=setup(),before=structuredClone({hc,hp,householdPlan,inventory,context}),plan=evaluateFamilyComposition(policy,request,context);
    expect(plan.materializationRequirements).toEqual([{subject:request.bindings[0].subject,birth:{kind:'any-living'},origin:{kind:'borrowed',producerId:inventory.producerId,planFingerprint:inventory.planFingerprint}}]);
    expect(plan.parentages[0].parent).toEqual(request.bindings[0].subject);
    expect(validateFamilyPlanHouseholdReferences(plan,inventory,householdPlan,hp,hc)).toBe(true);expect(householdPlan.additionalMembers).toHaveLength(2);expect({hc,hp,householdPlan,inventory,context}).toEqual(before);
  });
  it('deduplicates the same external parent used by multiple children',()=>{
    const state=setup(),context={...state.context,people:appendPerson(state.context.people,2015)},input=fixtureInput([{...fixtureTemplate(),parentages:[...fixtureTemplate().parentages,{parent:{kind:'binding',bindingId:'anchor.parent'},child:{kind:'binding',bindingId:'anchor.other-child'},bases:['legal']}]}]),policy=withFamilyCompositionPolicyFingerprint({...input,bindings:[{bindingId:'anchor.parent',accepts:'subject'},{bindingId:'anchor.child',accepts:'existing'},{bindingId:'anchor.other-child',accepts:'existing'}]}),request={...state.request,bindings:[...state.request.bindings,{bindingId:'anchor.other-child',subject:{kind:'existing' as const,personId:'person:2'}}]},plan=evaluateFamilyComposition(policy,request,context);
    expect(plan.parentages).toHaveLength(2);expect(plan.materializationRequirements).toHaveLength(1);
    expect(validateFamilyPlanHouseholdReferences(plan,state.inventory,state.householdPlan,state.hp,state.hc)).toBe(true);
  });
  it('permits Household roommates with no parentage requirement or Family completeness claim',()=>{
    const state=setup(),input=fixtureInput([{...fixtureTemplate(),parentages:[]}]),policy=withFamilyCompositionPolicyFingerprint({...input,bindings:[{bindingId:'anchor.parent',accepts:'subject'},{bindingId:'anchor.child',accepts:'existing'}]}),plan=evaluateFamilyComposition(policy,state.request,state.context);
    expect(plan.materializationRequirements).toEqual([]);expect(validateFamilyPlanHouseholdReferences(plan,state.inventory,state.householdPlan,state.hp,state.hc)).toBe(true);
    expect(assessFamilyCompositionReadiness(plan,policy,state.context,currentView(state.context)).materialization.status).toBe('READY');
    expect(assessHouseholdCompositionReadiness(state.householdPlan,state.hp,state.hc).status).toBe('NOT_READY');
  });
  it('validates a later actual shared subject resolution, without duplicating extraction',()=>{
    const state=setup(),plan=evaluateFamilyComposition(state.policy,state.request,state.context),current={...state.context,people:appendPerson(state.context.people,1980)},resolved=resolveFamilyCompositionPlan(plan,state.policy,state.context,[{subject:plan.materializationRequirements[0].subject,personId:'person:2'}],currentView(current));
    expect(resolved.desiredParentages[0].parentId).toBe('person:2');expect(state.context.people.nextSequence).toBe(2);
  });
  it('rejects missing borrowed slots instead of manufacturing requirements',()=>{
    const state=setup(),request={...state.request,bindings:[{...state.request.bindings[0],subject:{kind:'future' as const,scopeId:state.inventory.scopeId,slotId:'member.missing'}},state.request.bindings[1]]};
    expect(validateFamilyCompositionRequest(request,state.policy,state.context)).toBe(false);expect(()=>evaluateFamilyComposition(state.policy,request,state.context)).toThrow();
  });
  it.each(['scope','duplicate-owner','duplicate-slot','scope-collision'])('rejects cross-plan identity conflict %s',kind=>{
    const state=setup();let context=state.context,request=state.request;
    if(kind==='scope')context={...context,borrowedSubjects:[state.inventory,state.inventory]};
    if(kind==='duplicate-owner')context={...context,borrowedSubjects:[state.inventory,{...state.inventory,scopeId:'household.another-scope'}]};
    if(kind==='duplicate-slot')context={...context,borrowedSubjects:[{...state.inventory,subjects:[...state.inventory.subjects,state.inventory.subjects[0]]}]};
    if(kind==='scope-collision')request={...request,familyScopeId:state.inventory.scopeId};
    expect(validateFamilyCompositionRequest(request,state.policy,context)).toBe(false);
  });
  it('rejects changed source plans, fingerprints and birth requirements at the adapter boundary',()=>{
    const state=setup(),plan=evaluateFamilyComposition(state.policy,state.request,state.context);
    expect(validateFamilyPlanHouseholdReferences(plan,{...state.inventory,planFingerprint:'fnv1a64-v1:0000000000000000'},state.householdPlan,state.hp,state.hc)).toBe(false);
    const changed={...state.householdPlan,additionalMembers:[]};expect(()=>adaptHouseholdCompositionSubjects(changed,state.hp,state.hc,state.inventory.scopeId)).toThrow();
    expect(validateFamilyPlanHouseholdReferences({...plan,materializationRequirements:plan.materializationRequirements.map(item=>({...item,birth:{kind:'completed-age-range',minimumAge:0,maximumAge:1}}))},state.inventory,state.householdPlan,state.hp,state.hc)).toBe(false);
  });
  it('owns copies and remains independent of later source alias mutation',()=>{
    const state=setup(),raw=structuredClone(state.householdPlan),inventory=adaptHouseholdCompositionSubjects(raw,state.hp,state.hc,state.inventory.scopeId),before=structuredClone(inventory);
    (raw.additionalMembers as unknown as {slotId:string}[])[0].slotId='member.changed';expect(inventory).toEqual(before);
    expect(()=>{(inventory.subjects as unknown as unknown[]).push({});}).toThrow();
  });
});
