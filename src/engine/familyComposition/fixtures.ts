// Synthetic structural examples only; no empirical family distributions.
import {allocatePerson,createPeople,type PeopleState} from '../human/person';
import {createEmptyKinshipState} from '../kinship/state';
import {withFamilyCompositionPolicyFingerprint} from './package';
import type {FamilyCompositionContextV1,FamilyCompositionPolicyInputV1,FamilyCompositionRequestV1,FamilyCompositionTemplateV1,FamilyTemplateSubjectV1} from './types';

export const fixtureDate={year:2032,month:6,day:30};
export const binding=(bindingId:string):FamilyTemplateSubjectV1=>({kind:'binding',bindingId});
export const additional=(slotId:string):FamilyTemplateSubjectV1=>({kind:'additional',slotId});
export function fixtureContext():FamilyCompositionContextV1{
  let people=createPeople({name:'Synthetic Child',genderLabel:'Unspecified',dateOfBirth:{year:2012,month:6,day:30},lifeStatus:'living'});
  people=appendPerson(people,1980,'Synthetic Adult');
  return {people,kinship:createEmptyKinshipState(),borrowedSubjects:[]};
}
export function appendPerson(people:PeopleState,year:number,name='Synthetic Future Human'):PeopleState{
  return allocatePerson(people,{name,genderLabel:'Unspecified',dateOfBirth:{year,month:6,day:30},lifeStatus:'living'}).state;
}
export function currentView(context:Pick<FamilyCompositionContextV1,'people'|'kinship'>){return {people:context.people,kinship:context.kinship};}
export function fixtureTemplate(id='structure.parentage'):FamilyCompositionTemplateV1{
  return {id,weight:1,when:[],additionalSubjects:[],parentages:[{parent:binding('anchor.parent'),child:binding('anchor.child'),bases:['genetic','legal']}],provenanceIds:['decision.synthetic']};
}
export function fixtureInput(templates:readonly FamilyCompositionTemplateV1[]=[fixtureTemplate()]):FamilyCompositionPolicyInputV1{
  return {version:1,policyId:'family-composition.synthetic.parentage-v1',algorithmId:'family-composition.weighted-integer-v1',eligibility:'declared-facts-and-kinship-union-dag-v1',scope:{countryId:'synthetic',effectiveFrom:{year:2032,month:1,day:1},effectiveThrough:{year:2032,month:12,day:31}},bindings:[{bindingId:'anchor.parent',accepts:'existing'},{bindingId:'anchor.child',accepts:'existing'}],templates,provenance:[{id:'decision.synthetic',classification:'authored-gameplay-abstraction',sourceIds:[],note:'Synthetic structural example, not demographic frequency evidence.'}],limitations:['No production population claims.']};
}
export function fixturePolicy(templates:readonly FamilyCompositionTemplateV1[]=[fixtureTemplate()]){return withFamilyCompositionPolicyFingerprint(fixtureInput(templates));}
export function fixtureRequest():FamilyCompositionRequestV1{
  return {version:1,policyId:'family-composition.synthetic.parentage-v1',requestKey:'family.synthetic.request',rootSeed:73,referenceDate:fixtureDate,countryId:'synthetic',familyScopeId:'family.operation.synthetic',bindings:[{bindingId:'anchor.parent',subject:{kind:'existing',personId:'person:2'}},{bindingId:'anchor.child',subject:{kind:'existing',personId:'person:1'}}]};
}
export function futureFixture(){
  const template={...fixtureTemplate(),additionalSubjects:[{slotId:'relative.parent',birth:{kind:'completed-age-range' as const,minimumAge:40,maximumAge:60}}],parentages:[{parent:additional('relative.parent'),child:binding('anchor.child'),bases:['legal' as const]}]};
  const input={...fixtureInput([template]),bindings:[{bindingId:'anchor.child',accepts:'existing' as const}]};
  return {policy:withFamilyCompositionPolicyFingerprint(input),request:{...fixtureRequest(),bindings:[{bindingId:'anchor.child',subject:{kind:'existing' as const,personId:'person:1'}}]},context:fixtureContext()};
}
