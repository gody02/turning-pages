// Synthetic structure only. No empirical relationship frequencies or country law.
import {createPeople,allocatePerson,type PeopleState} from '../human/person';
import {withFormalUnionKindFingerprint,createFormalUnionKindRegistry} from '../formalUnion/kinds';
import {withRelationshipUnionCompositionPolicyFingerprint} from './package';
import {evaluateRelationshipUnionComposition} from './runtime';
import type {RelationshipUnionCompositionTemplateV1,RelationshipUnionCompositionPolicyInputV1,RelationshipUnionCompositionRequestV1,RelationshipUnionCompositionContextV1,RelationshipTemplateSubjectV1,RelationshipUnionCurrentContextV1,RelationshipOriginalPlanV1} from './types';

export const fixtureDate={year:2032,month:6,day:30};
export const binding=(bindingId:string):RelationshipTemplateSubjectV1=>({kind:'binding',bindingId});
export const additional=(slotId:string):RelationshipTemplateSubjectV1=>({kind:'additional',slotId});
export function appendPerson(people:PeopleState,year:number,name='Synthetic Future Human'){
  return allocatePerson(people,{name,genderLabel:'Unspecified',dateOfBirth:{year,month:6,day:30},lifeStatus:'living'}).state;
}
export function fixtureContext():RelationshipUnionCompositionContextV1{
  let people=createPeople({name:'Synthetic Adult',genderLabel:'Unspecified',dateOfBirth:{year:2000,month:6,day:30},lifeStatus:'living'});
  people=appendPerson(people,1980,'Another Synthetic Adult');return {people,borrowedSubjects:[]};
}
export function currentView(context:RelationshipUnionCompositionContextV1):RelationshipUnionCurrentContextV1{
  return {people:context.people,referenceDate:fixtureDate,partnership:{version:1,partnerships:[]},formalUnion:{version:1,nextSequence:1,unions:[]}};
}
export function fixtureTemplate(id='structure.pair'):RelationshipUnionCompositionTemplateV1{
  return {id,weight:1,when:[],additionalSubjects:[],partnerships:[{subjects:[binding('anchor.one'),binding('anchor.two')]}],formalUnions:[],provenanceIds:['decision.synthetic']};
}
export function fixtureInput(templates:readonly RelationshipUnionCompositionTemplateV1[]=[fixtureTemplate()]):RelationshipUnionCompositionPolicyInputV1{
  return {version:1,policyId:'relationship-union-composition.synthetic.v1',algorithmId:'relationship-union-composition.weighted-integer-v1',eligibility:'declared-person-facts-v1',scope:{countryId:'synthetic',effectiveFrom:{year:2032,month:1,day:1},effectiveThrough:{year:2032,month:12,day:31}},bindings:[{bindingId:'anchor.one',accepts:'existing'},{bindingId:'anchor.two',accepts:'existing'}],unionBindings:[],templates,provenance:[{id:'decision.synthetic',classification:'authored-gameplay-abstraction',sourceIds:[],note:'Synthetic structural selection mass, not population or relationship evidence.'}],limitations:['No production or legal claim.']};
}
export function fixtureRequest():RelationshipUnionCompositionRequestV1{
  return {version:1,policyId:'relationship-union-composition.synthetic.v1',requestKey:'relationship.synthetic.request',rootSeed:73,referenceDate:fixtureDate,countryId:'synthetic',relationshipScopeId:'relationship.operation.synthetic',bindings:[{bindingId:'anchor.one',subject:{kind:'existing',personId:'person:1'}},{bindingId:'anchor.two',subject:{kind:'existing',personId:'person:2'}}],unionBindings:[]};
}
export function fixtureOriginal(templates:readonly RelationshipUnionCompositionTemplateV1[]=[fixtureTemplate()]):RelationshipOriginalPlanV1{
  const policy=withRelationshipUnionCompositionPolicyFingerprint(fixtureInput(templates)),context=fixtureContext(),plan=evaluateRelationshipUnionComposition(fixtureRequest(),policy,context);return {plan,policy,context};
}
export const fixtureKind=withFormalUnionKindFingerprint({version:1,kindId:'formal-union-kind.synthetic.contract-v1',label:'Synthetic contract',definition:'Explicit synthetic formal association.',jurisdictionId:null,classification:'authored-gameplay-abstraction',sourceIds:[],limitations:['Not a legal rule or empirical evidence.']});
export const kindRef={kindId:fixtureKind.kindId,fingerprint:fixtureKind.fingerprint};
export const fixtureKinds=createFormalUnionKindRegistry([fixtureKind],[kindRef]);
export function unionTemplate(slot='contract.one'):RelationshipUnionCompositionTemplateV1{
  return {...fixtureTemplate('structure.union'),partnerships:[],formalUnions:[{kind:'create-contract',contractSlotId:slot,subjects:[binding('anchor.one'),binding('anchor.two')],unionKind:kindRef,formedOn:null,separation:'unknown'}]};
}
export function futureOriginal():RelationshipOriginalPlanV1{
  const template={...fixtureTemplate(),additionalSubjects:[{slotId:'outside.partner',birth:{kind:'completed-age-range' as const,minimumAge:25,maximumAge:40}}],partnerships:[{subjects:[binding('anchor.one'),additional('outside.partner')] as const}]};
  const policy=withRelationshipUnionCompositionPolicyFingerprint({...fixtureInput([template]),bindings:[{bindingId:'anchor.one',accepts:'existing'}]}),context=fixtureContext(),request={...fixtureRequest(),bindings:fixtureRequest().bindings.slice(0,1)};
  return {policy,context,plan:evaluateRelationshipUnionComposition(request,policy,context)};
}
