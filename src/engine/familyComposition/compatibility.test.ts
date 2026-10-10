import {describe,expect,it} from 'vitest';
import {addParentageBasis} from '../kinship/state';
import {getSiblingRelationship as siblingOverlap} from '../kinship/queries';
import {validKinshipWithPeople} from '../kinship/validation';
import type {ParentageBasis,KinshipStateV1} from '../kinship/types';
import {currentView,fixtureContext,fixtureInput,fixturePolicy,fixtureRequest,fixtureTemplate,futureFixture,appendPerson,additional,binding} from './fixtures';
import {withFamilyCompositionPolicyFingerprint} from './package';
import {assessFamilyCompositionReadiness,assessFamilyPlanAgainstKinship,resolveFamilyCompositionPlan,validateResolvedFamilyPlan} from './compatibility';
import {diagnoseFamilyComposition,evaluateFamilyComposition} from './runtime';
import type {FamilySubjectResolutionV1} from './types';

describe('pure current Kinship compatibility and resolution',()=>{
  it('requires the exact current-state projection, not a Game or broad planning context',()=>{
    const context=fixtureContext(),policy=fixturePolicy(),plan=evaluateFamilyComposition(policy,fixtureRequest(),context);
    expect(()=>assessFamilyPlanAgainstKinship(plan,policy,context,context)).toThrow('Invalid');
  });
  it('describes satisfied truth and only missing legal basis without mutation',()=>{
    const source=fixtureContext(),context={...source,kinship:addParentageBasis(source.kinship,'person:2','person:1','genetic',{people:source.people})},policy=fixturePolicy(),plan=evaluateFamilyComposition(policy,fixtureRequest(),context),before=structuredClone(context);
    const resolved=resolveFamilyCompositionPlan(plan,policy,context,[],currentView(context));
    expect(resolved.desiredParentages).toEqual([{parentId:'person:2',childId:'person:1',bases:['genetic','legal']}]);
    expect(resolved.missingParentages).toEqual([{parentId:'person:2',childId:'person:1',bases:['legal']}]);expect(context).toEqual(before);
    expect(validateResolvedFamilyPlan(resolved,plan,policy,context,[],currentView(context))).toBe(true);
    const current={...context,kinship:addParentageBasis(context.kinship,'person:2','person:1','legal',{people:context.people})};
    expect(resolveFamilyCompositionPlan(plan,policy,context,[],currentView(current)).missingParentages).toEqual([]);
    expect(assessFamilyCompositionReadiness(plan,policy,context,currentView(current)).materialization.status).toBe('READY');
  });
  it('detects a conflict added after planning while materialization remains READY',()=>{
    const source=fixtureContext(),policy=fixturePolicy(),plan=evaluateFamilyComposition(policy,fixtureRequest(),source),current={...source,kinship:addParentageBasis(source.kinship,'person:1','person:2','gestational',{people:source.people})},before=structuredClone(current);
    const result=assessFamilyCompositionReadiness(plan,policy,source,currentView(current));expect(result.materialization.status).toBe('READY');expect(result.application.status).toBe('INCOMPATIBLE');
    expect(()=>resolveFamilyCompositionPlan(plan,policy,source,[],currentView(current))).toThrow('incompatible');expect(current).toEqual(before);
  });
  it('excludes a known cycle before weighting rather than retrying',()=>{
    const source=fixtureContext(),context={...source,kinship:addParentageBasis(source.kinship,'person:1','person:2','legal',{people:source.people})};
    const policy=fixturePolicy([{...fixtureTemplate('structure.conflict'),weight:99},{...fixtureTemplate('structure.noop'),parentages:[]}]);
    const result=diagnoseFamilyComposition(policy,fixtureRequest(),context);expect(result.eligibleTemplateIds).toEqual(['structure.noop']);expect(result.excludedTemplates[0].reasons.join()).toMatch(/union graph/);expect(result.attempts).toBe(0);
    expect(()=>evaluateFamilyComposition(fixturePolicy(),fixtureRequest(),context)).toThrow('No eligible compatible');
  });
  it('checks existing paths through Persons outside the bound subject set',()=>{
    const source=fixtureContext(),people=appendPerson(source.people,1990);let kinship=addParentageBasis(source.kinship,'person:1','person:3','genetic',{people});kinship=addParentageBasis(kinship,'person:3','person:2','legal',{people});
    expect(()=>evaluateFamilyComposition(fixturePolicy(),fixtureRequest(),{...source,people,kinship})).toThrow('No eligible compatible');
  });
  it('detects a future-subject chain cycle through existing Kinship before resolution',()=>{
    const source=fixtureContext(),context={...source,kinship:addParentageBasis(source.kinship,'person:1','person:2','legal',{people:source.people})};
    const template={...fixtureTemplate(),additionalSubjects:[{slotId:'future.bridge',birth:{kind:'any-living' as const}}],parentages:[{parent:binding('anchor.parent'),child:additional('future.bridge'),bases:['genetic' as const]},{parent:additional('future.bridge'),child:binding('anchor.child'),bases:['legal' as const]}]};
    expect(()=>evaluateFamilyComposition(fixturePolicy([template]),fixtureRequest(),context)).toThrow('No eligible compatible');
  });
  it('accepts a supplied real new Person resolution without allocating or mutating anything',()=>{
    const {context,policy,request}=futureFixture(),plan=evaluateFamilyComposition(policy,request,context),current={...context,people:appendPerson(context.people,1980)},resolutions=[{subject:plan.materializationRequirements[0].subject,personId:'person:3'}],before=structuredClone({context,current,resolutions});
    const result=resolveFamilyCompositionPlan(plan,policy,context,resolutions,currentView(current));
    expect(result.desiredParentages).toEqual([{parentId:'person:3',childId:'person:1',bases:['legal']}]);expect(result.missingParentages).toEqual(result.desiredParentages);
    expect(validateResolvedFamilyPlan(result,plan,policy,context,resolutions,currentView(current))).toBe(true);expect({context,current,resolutions}).toEqual(before);
    expect(assessFamilyCompositionReadiness(plan,policy,context,currentView(current)).application.status).toBe('UNRESOLVED');
  });
  it.each(['missing','extra','original','unknown','wrong-age','changed-facts','wrong-scope','malformed','wrong-life'])('rejects resolution %s atomically',kind=>{
    const {context,policy,request}=futureFixture(),plan=evaluateFamilyComposition(policy,request,context);let current={...context,people:appendPerson(context.people,kind==='wrong-age'?2000:1980)};
    let resolutions:unknown=[{subject:plan.materializationRequirements[0].subject,personId:'person:3'}];
    if(kind==='missing')resolutions=[];
    if(kind==='extra')resolutions=[...(resolutions as unknown[]),...(resolutions as unknown[])];
    if(kind==='original')resolutions=[{subject:plan.materializationRequirements[0].subject,personId:'person:2'}];
    if(kind==='unknown')resolutions=[{subject:plan.materializationRequirements[0].subject,personId:'person:999'}];
    if(kind==='wrong-scope')resolutions=[{subject:{...plan.materializationRequirements[0].subject,scopeId:'future.wrong'},personId:'person:3'}];
    if(kind==='malformed')resolutions=[{subject:plan.materializationRequirements[0].subject,personId:'person:03'}];
    if(kind==='changed-facts')current={...current,people:{...current.people,people:current.people.people.map(person=>person.id==='person:1'?{...person,dateOfBirth:{year:2011,month:6,day:30}}:person)}};
    if(kind==='wrong-life')current={...current,people:{...current.people,people:current.people.people.map(person=>person.id==='person:3'?{...person,lifeStatus:'deceased' as const,diedAt:request.referenceDate}:person)}};
    const before=structuredClone({current,context});expect(()=>resolveFamilyCompositionPlan(plan,policy,context,resolutions as readonly FamilySubjectResolutionV1[],currentView(current))).toThrow();expect({current,context}).toEqual(before);
  });
  it('rejects distinct subjects mapped to the same actual Person',()=>{
    const context=fixtureContext(),template={...fixtureTemplate(),additionalSubjects:[{slotId:'future.a',birth:{kind:'any-living' as const}},{slotId:'future.b',birth:{kind:'any-living' as const}}],parentages:[{parent:additional('future.a'),child:additional('future.b'),bases:['genetic' as const]}]},policy=withFamilyCompositionPolicyFingerprint({...fixtureInput([template]),bindings:[]}),plan=evaluateFamilyComposition(policy,{...fixtureRequest(),bindings:[]},context),current={...context,people:appendPerson(context.people,1980)};
    expect(()=>resolveFamilyCompositionPlan(plan,policy,context,plan.materializationRequirements.map(item=>({subject:item.subject,personId:'person:3'})),currentView(current))).toThrow();
  });
  it('requires a valid current graph and never repairs corruption',()=>{
    const context=fixtureContext(),policy=fixturePolicy(),plan=evaluateFamilyComposition(policy,fixtureRequest(),context),current={people:context.people,kinship:{version:1 as const,parentages:[{parentId:'person:1',childId:'person:1',bases:['legal' as const]}]}};
    expect(()=>assessFamilyPlanAgainstKinship(plan,policy,context,currentView(current))).toThrow('Invalid');expect(current.kinship.parentages).toHaveLength(1);
  });
  it('accepts deceased existing endpoints without imposing living Household eligibility',()=>{
    const source=fixtureContext(),context={...source,people:{...source.people,people:source.people.people.map(person=>person.id==='person:2'?{...person,lifeStatus:'deceased' as const,diedAt:{year:2030,month:1,day:1}}:person)}},policy=fixturePolicy(),plan=evaluateFamilyComposition(policy,fixtureRequest(),context);
    expect(resolveFamilyCompositionPlan(plan,policy,context,[],currentView(context)).missingParentages).toHaveLength(1);
  });
  it('permits donor/adoptive/gestational and 3+ same-gender parents without domestic or romance truth',()=>{
    const source=fixtureContext();let people=appendPerson(source.people,1985);people=appendPerson(people,1987);
    people={...people,people:people.people.map(person=>({...person,genderLabel:'Woman'}))};
    const input=fixtureInput([{...fixtureTemplate(),parentages:[{parent:binding('anchor.parent'),child:binding('anchor.child'),bases:['genetic']},{parent:binding('anchor.gestational'),child:binding('anchor.child'),bases:['gestational']},{parent:binding('anchor.adoptive'),child:binding('anchor.child'),bases:['legal']}]}]);
    const policy=withFamilyCompositionPolicyFingerprint({...input,bindings:[...input.bindings,{bindingId:'anchor.gestational',accepts:'existing'},{bindingId:'anchor.adoptive',accepts:'existing'}]}),request={...fixtureRequest(),bindings:[...fixtureRequest().bindings,{bindingId:'anchor.gestational',subject:{kind:'existing' as const,personId:'person:3'}},{bindingId:'anchor.adoptive',subject:{kind:'existing' as const,personId:'person:4'}}]},context={...source,people};
    const plan=evaluateFamilyComposition(policy,request,context);expect(plan.parentages).toHaveLength(3);expect(resolveFamilyCompositionPlan(plan,policy,context,[],currentView(context)).missingParentages).toHaveLength(3);
    expect(Object.keys(plan).some(key=>['household','residence','guardian','partner','spouse'].includes(key))).toBe(false);
  });
  it('derives sibling overlap only after external frozen mutations, not as a plan edge',()=>{
    const source=fixtureContext(),people=appendPerson(source.people,2015),template={...fixtureTemplate(),parentages:[...fixtureTemplate().parentages,{parent:binding('anchor.parent'),child:binding('anchor.other-child'),bases:['genetic' as const]}]},input=fixtureInput([template]),policy=withFamilyCompositionPolicyFingerprint({...input,bindings:[...input.bindings,{bindingId:'anchor.other-child',accepts:'existing'}]}),request={...fixtureRequest(),bindings:[...fixtureRequest().bindings,{bindingId:'anchor.other-child',subject:{kind:'existing' as const,personId:'person:3'}}]},context={...source,people},plan=evaluateFamilyComposition(policy,request,context),resolved=resolveFamilyCompositionPlan(plan,policy,context,[],currentView(context));
    let candidate=context.kinship;for(const edge of resolved.missingParentages)for(const basis of edge.bases)candidate=addParentageBasis(candidate,edge.parentId,edge.childId,basis,{people});
    expect(siblingOverlap(candidate,'person:1','person:3','genetic',{people}).sharedParentIds).toEqual(['person:2']);expect(context.kinship.parentages).toEqual([]);expect(plan.parentages).toHaveLength(2);
  });
  it('checks all 64 three-node graphs against an independent reachability oracle',()=>{
    const source=fixtureContext(),context={...source,people:appendPerson(source.people,1990)},slots=['anchor.a','anchor.b','anchor.c'],pairs=[[0,1],[0,2],[1,0],[1,2],[2,0],[2,1]];
    for(let mask=0;mask<64;mask++){
      const edges=pairs.filter((_,index)=>mask&(1<<index)),reach=Array.from({length:3},()=>[false,false,false]);for(const [parent,child] of edges)reach[parent][child]=true;
      for(let k=0;k<3;k++)for(let i=0;i<3;i++)for(let j=0;j<3;j++)reach[i][j] ||= reach[i][k]&&reach[k][j];
      const cycle=reach.some((row,index)=>row[index]),input={...fixtureInput([{...fixtureTemplate(),parentages:edges.map(([parent,child],index)=>({parent:binding(slots[parent]),child:binding(slots[child]),bases:[(index%2?'legal':'genetic') as ParentageBasis]}))}]),bindings:slots.map(bindingId=>({bindingId,accepts:'existing' as const}))};
      if(cycle){expect(()=>withFamilyCompositionPolicyFingerprint(input),String(mask)).toThrow();continue;}
      const policy=withFamilyCompositionPolicyFingerprint(input),request={...fixtureRequest(),bindings:slots.map((bindingId,index)=>({bindingId,subject:{kind:'existing' as const,personId:`person:${index+1}`}}))},plan=evaluateFamilyComposition(policy,request,context),resolved=resolveFamilyCompositionPlan(plan,policy,context,[],currentView(context));
      let frozen:KinshipStateV1=context.kinship;for(const edge of resolved.missingParentages)for(const basis of edge.bases)frozen=addParentageBasis(frozen,edge.parentId,edge.childId,basis,{people:context.people});
      expect(validKinshipWithPeople(frozen,context.people)).toBe(true);expect(frozen.parentages).toEqual(resolved.desiredParentages);
    }
  });
  it('rejects tampered resolved output independently',()=>{
    const context=fixtureContext(),policy=fixturePolicy(),plan=evaluateFamilyComposition(policy,fixtureRequest(),context),resolved=resolveFamilyCompositionPlan(plan,policy,context,[],currentView(context));
    expect(validateResolvedFamilyPlan({...resolved,missingParentages:[]},plan,policy,context,[],currentView(context))).toBe(false);
  });
  it('owns compatibility and missing-basis outputs independently of mutable inputs',()=>{
    const context=fixtureContext(),policy=fixturePolicy(),plan=evaluateFamilyComposition(policy,fixtureRequest(),context),current=structuredClone(currentView(context)),result=resolveFamilyCompositionPlan(plan,policy,context,[],current),before=structuredClone(result);
    expect(Object.isFrozen(result.missingParentages[0].bases)).toBe(true);
    expect(()=>{(result.missingParentages as unknown as unknown[]).push({});}).toThrow();
    (current.kinship.parentages as unknown as unknown[]).push({bad:'caller mutation'});expect(result).toEqual(before);
  });
});
