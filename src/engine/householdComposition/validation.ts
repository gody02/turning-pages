import {ageOn, compareDates, isSimulationDate, isSimulationYear, MAX_SIMULATION_YEAR} from '../core/clock';
import {validPeople} from '../human/person';
import {validHouseholdWithPeople} from '../household/validation';
import {countryId, dense, fields, fingerprintShape, memberKey, personId, snapshot, stableId, versionedId} from './data';
import {validateHouseholdCompositionPolicy} from './package';
import type {CompositionBirthConstraintV1, HouseholdCompositionContextV1, HouseholdCompositionPolicyV1, HouseholdCompositionRequestV1} from './types';
import type {SimulationDate} from '../core/model';

export const COMPOSITION_ALGORITHM='household-composition.weighted-integer-v1' as const;
const nonnegative=(value:unknown):value is number=>typeof value==='number' && Number.isSafeInteger(value) && value>=0;
const positive=(value:unknown):value is number=>nonnegative(value) && value>0;
const ageRange=(value:unknown)=>fields(value,['minimumAge','maximumAge']) && nonnegative(value.minimumAge) && nonnegative(value.maximumAge) && value.minimumAge<=value.maximumAge && value.maximumAge<MAX_SIMULATION_YEAR;
export function birthConstraintShape(value:unknown):value is CompositionBirthConstraintV1{
  if(fields(value,['kind']))return value.kind==='any-living';
  if(fields(value,['kind','minimumYear','maximumYear']))return value.kind==='birth-year-range' && isSimulationYear(value.minimumYear) && isSimulationYear(value.maximumYear) && value.minimumYear<=value.maximumYear;
  if(!fields(value,['kind','minimumAge','maximumAge']) || value.kind!=='completed-age-range')return false;
  return ageRange({minimumAge:value.minimumAge,maximumAge:value.maximumAge});
}
export function birthConstraintAtDate(value:CompositionBirthConstraintV1,date:SimulationDate):boolean{
  if(value.kind==='any-living')return true;
  if(value.kind==='birth-year-range')return value.maximumYear<=date.year;
  return value.maximumAge<=ageOn({year:1,month:1,day:1},date);
}
/** Validates unordered authoring structure on a safe JSON snapshot. */
export function policyShape(value:unknown):value is HouseholdCompositionPolicyV1{
  try{
    if(!fields(value,['version','policyId','fingerprint','algorithmId','scope','anchorBindings','templates']) || value.version!==1 || !versionedId(value.policyId) || !fingerprintShape(value.fingerprint) || value.algorithmId!==COMPOSITION_ALGORITHM)return false;
    if(!fields(value.scope,['countryId','effectiveFrom','effectiveThrough']) || !countryId(value.scope.countryId) || !isSimulationDate(value.scope.effectiveFrom) || !isSimulationDate(value.scope.effectiveThrough) || compareDates(value.scope.effectiveFrom,value.scope.effectiveThrough)>0)return false;
    if(!dense(value.anchorBindings) || !value.anchorBindings.length || !value.anchorBindings.every(stableId) || !dense(value.templates) || !value.templates.length)return false;
    const bindings=new Set(value.anchorBindings);
    if(bindings.size!==value.anchorBindings.length)return false;
    const templateIds=new Set<string>();let mass=0n;
    for(const template of value.templates){
      if(!fields(template,['id','weight','when','additionalMembers','households']) || !stableId(template.id) || templateIds.has(template.id) || !positive(template.weight) || !dense(template.when) || !dense(template.additionalMembers) || !dense(template.households))return false;
      templateIds.add(template.id);mass+=BigInt(template.weight);
      if(mass>BigInt(Number.MAX_SAFE_INTEGER))return false;
      const predicates=new Set<string>();
      for(const predicate of template.when){
        if(!fields(predicate,['bindingId','completedAge']) || !stableId(predicate.bindingId) || !bindings.has(predicate.bindingId) || predicates.has(predicate.bindingId) || !ageRange(predicate.completedAge))return false;
        predicates.add(predicate.bindingId);
      }
      const slots=new Set<string>();
      for(const slot of template.additionalMembers){
        if(!fields(slot,['slotId','birth']) || !stableId(slot.slotId) || slots.has(slot.slotId) || bindings.has(slot.slotId) || !birthConstraintShape(slot.birth))return false;
        slots.add(slot.slotId);
      }
      if(!template.households.length){if(slots.size)return false;continue;}
      const units=new Set<string>(),usedAnchors=new Set<string>(),usedSlots=new Set<string>();
      for(const unit of template.households){
        if(!fields(unit,['householdSlotId','members']) || !stableId(unit.householdSlotId) || units.has(unit.householdSlotId) || slots.has(unit.householdSlotId) || bindings.has(unit.householdSlotId) || !dense(unit.members) || !unit.members.length)return false;
        units.add(unit.householdSlotId);
        const refs=new Set<string>();let hasAnchor=false;
        for(const ref of unit.members){
          if(fields(ref,['kind','bindingId']) && ref.kind==='anchor' && stableId(ref.bindingId) && bindings.has(ref.bindingId)){hasAnchor=true;usedAnchors.add(ref.bindingId);}
          else if(fields(ref,['kind','slotId']) && ref.kind==='materialize' && stableId(ref.slotId) && slots.has(ref.slotId))usedSlots.add(ref.slotId);
          else return false;
          const key=memberKey(ref as Parameters<typeof memberKey>[0]);
          if(refs.has(key))return false;refs.add(key);
        }
        if(!hasAnchor)return false;
      }
      if(usedAnchors.size!==bindings.size || usedSlots.size!==slots.size)return false;
    }
    return true;
  }catch{return false;}
}
export function contextShape(value:unknown):value is HouseholdCompositionContextV1{
  return fields(value,['people','household']) && validPeople(value.people) && validHouseholdWithPeople(value.household,value.people);
}
export function requestShape(value:unknown,policy:HouseholdCompositionPolicyV1,context:HouseholdCompositionContextV1):value is HouseholdCompositionRequestV1{
  if(!fields(value,['version','policyId','requestKey','rootSeed','referenceDate','countryId','anchors']) || value.version!==1 || value.policyId!==policy.policyId || !stableId(value.requestKey) || !nonnegative(value.rootSeed) || value.rootSeed>0xffffffff || !isSimulationDate(value.referenceDate) || !countryId(value.countryId) || value.countryId!==policy.scope.countryId || !dense(value.anchors) || value.anchors.length!==policy.anchorBindings.length)return false;
  const date=value.referenceDate;
  if(compareDates(date,policy.scope.effectiveFrom)<0 || compareDates(date,policy.scope.effectiveThrough)>0)return false;
  const declared=new Set(policy.anchorBindings),bound=new Set<string>(),persons=new Set<string>(),assigned=new Set(context.household.memberships.map(item=>item.personId));
  for(const anchor of value.anchors){
    if(!fields(anchor,['bindingId','personId']) || !stableId(anchor.bindingId) || !declared.has(anchor.bindingId) || bound.has(anchor.bindingId) || !personId(anchor.personId) || persons.has(anchor.personId) || assigned.has(anchor.personId))return false;
    const person=context.people.people[Number(anchor.personId.slice(7))-1];
    if(!person || person.id!==anchor.personId || person.lifeStatus!=='living' || compareDates(person.dateOfBirth,date)>0)return false;
    bound.add(anchor.bindingId);persons.add(anchor.personId);
  }
  // Every template must be logically supported, not just today's selected template.
  return policy.templates.every(template=>template.additionalMembers.every(slot=>birthConstraintAtDate(slot.birth,date)) && template.when.every(predicate=>predicate.completedAge.maximumAge<=ageOn({year:1,month:1,day:1},date)));
}
export function validateHouseholdCompositionRequest(value:unknown,policy:HouseholdCompositionPolicyV1,context:HouseholdCompositionContextV1):value is HouseholdCompositionRequestV1{
  try{
    const request=snapshot(value),ownedPolicy=snapshot(policy),ownedContext=snapshot(context);
    return validateHouseholdCompositionPolicy(ownedPolicy) && contextShape(ownedContext) && requestShape(request,ownedPolicy,ownedContext);
  }catch{return false;}
}
