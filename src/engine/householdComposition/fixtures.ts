// Synthetic structural fixtures only. Weights/ages express no real-world distribution.
import {createPeople, allocatePerson} from '../human/person';
import type {HouseholdCompositionContextV1, HouseholdCompositionPolicyInputV1, HouseholdCompositionRequestV1, HouseholdCompositionTemplateV1} from './types';
import {withHouseholdCompositionPolicyFingerprint} from './package';

export const fixtureDate={year:2032,month:6,day:30};
export function fixtureContext(age=25):HouseholdCompositionContextV1{
  return {people:createPeople({name:'Synthetic Example',genderLabel:'Unspecified',dateOfBirth:{year:fixtureDate.year-age,month:6,day:30},lifeStatus:'living'}),household:{version:1,nextSequence:1,households:[],memberships:[]}};
}
export function secondAnchorContext():HouseholdCompositionContextV1{
  const source=fixtureContext();
  return {...source,people:allocatePerson(source.people,{name:'Another Example',genderLabel:'Unspecified',dateOfBirth:{year:2005,month:1,day:1},lifeStatus:'living'}).state};
}
export function structuralTemplate(id='structure.one',slots=0):HouseholdCompositionTemplateV1{
  const additionalMembers=Array.from({length:slots},(_,index)=>({slotId:`member.slot-${index+1}`,birth:{kind:'any-living' as const}}));
  return {id,weight:1,when:[],additionalMembers,households:[{householdSlotId:'unit.one',members:[{kind:'anchor',bindingId:'anchor.one'},...additionalMembers.map(slot=>({kind:'materialize' as const,slotId:slot.slotId}))]}]};
}
export function policyInput(templates:readonly HouseholdCompositionTemplateV1[]=[structuralTemplate()]):HouseholdCompositionPolicyInputV1{
  return {version:1,policyId:'composition.synthetic.structural-v1',algorithmId:'household-composition.weighted-integer-v1',scope:{countryId:'synthetic',effectiveFrom:{year:2032,month:1,day:1},effectiveThrough:{year:2032,month:12,day:31}},anchorBindings:['anchor.one'],templates};
}
export function fixturePolicy(templates:readonly HouseholdCompositionTemplateV1[]=[structuralTemplate()]){return withHouseholdCompositionPolicyFingerprint(policyInput(templates));}
export function fixtureRequest():HouseholdCompositionRequestV1{
  return {version:1,policyId:'composition.synthetic.structural-v1',requestKey:'composition.test-request',rootSeed:73,referenceDate:fixtureDate,countryId:'synthetic',anchors:[{bindingId:'anchor.one',personId:'person:1'}]};
}
