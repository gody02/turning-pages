import {ageOn,compareDates,isSimulationDate,isSimulationYear,MAX_SIMULATION_YEAR} from '../core/clock';
import type {SimulationDate} from '../core/model';
import {validPeople} from '../human/person';
import {validKinshipWithPeople} from '../kinship/validation';
import {acyclic,canonicalStringify,countryId,dense,fields,fingerprintShape,personId,snapshot,stableId,subjectKey,versionedId} from './data';
import {validateFamilyCompositionPolicy} from './package';
import type {FamilyBirthConstraintV1,FamilyCompositionContextV1,FamilyCompositionPolicyV1,FamilyCompositionRequestV1,FamilySubjectRefV1,FamilyTemplateSubjectV1} from './types';

const nonnegative=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;
const positive=(value:unknown):value is number=>nonnegative(value)&&value>0;
const text=(value:unknown):value is string=>typeof value==='string'&&value.trim().length>0;
const unique=(values:readonly string[])=>new Set(values).size===values.length;
const strings=(value:unknown,guard:(value:unknown)=>value is string):value is readonly string[]=>dense(value)&&value.every(guard)&&unique(value);
const ageRange=(minimum:unknown,maximum:unknown)=>nonnegative(minimum)&&nonnegative(maximum)&&minimum<=maximum&&maximum<MAX_SIMULATION_YEAR;
function birthShape(value:unknown):value is FamilyBirthConstraintV1{
  if(fields(value,['kind']))return value.kind==='any-living';
  if(fields(value,['kind','minimumYear','maximumYear']))return value.kind==='birth-year-range'&&isSimulationYear(value.minimumYear)&&isSimulationYear(value.maximumYear)&&value.minimumYear<=value.maximumYear;
  return fields(value,['kind','minimumAge','maximumAge'])&&value.kind==='completed-age-range'&&ageRange(value.minimumAge,value.maximumAge);
}
function birthAtDate(value:FamilyBirthConstraintV1,date:SimulationDate):boolean{
  if(value.kind==='any-living')return true;
  if(value.kind==='birth-year-range')return value.maximumYear<=date.year;
  return value.maximumAge<=ageOn({year:1,month:1,day:1},date);
}
function subjectShape(value:unknown):value is FamilySubjectRefV1{
  if(fields(value,['kind','personId']))return value.kind==='existing'&&personId(value.personId);
  return fields(value,['kind','scopeId','slotId'])&&value.kind==='future'&&stableId(value.scopeId)&&stableId(value.slotId);
}
function basesShape(value:unknown):value is readonly ('genetic'|'gestational'|'legal')[]{
  return dense(value)&&value.length>0&&value.every(basis=>basis==='genetic'||basis==='gestational'||basis==='legal')&&unique(value as readonly string[]);
}
function policyShape(value:unknown):value is FamilyCompositionPolicyV1{
  if(!fields(value,['version','policyId','fingerprint','algorithmId','eligibility','scope','bindings','templates','provenance','limitations'])||value.version!==1||!versionedId(value.policyId)||!fingerprintShape(value.fingerprint)||value.algorithmId!=='family-composition.weighted-integer-v1'||value.eligibility!=='declared-facts-and-kinship-union-dag-v1')return false;
  if(!fields(value.scope,['countryId','effectiveFrom','effectiveThrough'])||!countryId(value.scope.countryId)||!isSimulationDate(value.scope.effectiveFrom)||!isSimulationDate(value.scope.effectiveThrough)||compareDates(value.scope.effectiveFrom,value.scope.effectiveThrough)>0)return false;
  if(!dense(value.bindings)||!dense(value.templates)||!value.templates.length||!dense(value.provenance)||!strings(value.limitations,text))return false;
  const bindingKinds=new Map<string,string>(),provenanceIds=new Set<string>();
  for(const binding of value.bindings){
    if(!fields(binding,['bindingId','accepts'])||!stableId(binding.bindingId)||bindingKinds.has(binding.bindingId)||(binding.accepts!=='existing'&&binding.accepts!=='subject'))return false;
    bindingKinds.set(binding.bindingId,binding.accepts);
  }
  for(const provenance of value.provenance){
    if(!fields(provenance,['id','classification','sourceIds','note'])||!stableId(provenance.id)||provenanceIds.has(provenance.id)||!['observed','estimated','calibrated','assumed','authored-gameplay-abstraction'].includes(provenance.classification as string)||!strings(provenance.sourceIds,stableId)||!text(provenance.note))return false;
    provenanceIds.add(provenance.id);
  }
  const templateIds=new Set<string>();let mass=0n;
  for(const template of value.templates){
    if(!fields(template,['id','weight','when','additionalSubjects','parentages','provenanceIds'])||!stableId(template.id)||templateIds.has(template.id)||!positive(template.weight)||!dense(template.when)||!dense(template.additionalSubjects)||!dense(template.parentages)||!strings(template.provenanceIds,stableId)||template.provenanceIds.some(id=>!provenanceIds.has(id)))return false;
    templateIds.add(template.id);mass+=BigInt(template.weight);if(mass>BigInt(Number.MAX_SAFE_INTEGER))return false;
    const predicates=new Set<string>(),slots=new Set<string>();
    for(const predicate of template.when){
      if(!fields(predicate,['kind','bindingId','minimumAge','maximumAge'])&&!fields(predicate,['kind','bindingId','lifeStatus']))return false;
      if(!stableId(predicate.bindingId)||bindingKinds.get(predicate.bindingId)!=='existing')return false;
      if(predicate.kind==='completed-age-range'){if(!ageRange(predicate.minimumAge,predicate.maximumAge))return false;}
      else if(predicate.kind==='life-status'){if(predicate.lifeStatus!=='living'&&predicate.lifeStatus!=='deceased')return false;}
      else return false;
      if(predicate.kind==='life-status'&&!fields(predicate,['kind','bindingId','lifeStatus'])||predicate.kind==='completed-age-range'&&!fields(predicate,['kind','bindingId','minimumAge','maximumAge']))return false;
      const key=JSON.stringify([predicate.kind,predicate.bindingId]);if(predicates.has(key))return false;predicates.add(key);
    }
    for(const slot of template.additionalSubjects){
      if(!fields(slot,['slotId','birth'])||!stableId(slot.slotId)||slots.has(slot.slotId)||bindingKinds.has(slot.slotId)||!birthShape(slot.birth))return false;
      slots.add(slot.slotId);
    }
    const used=new Set<string>(),pairs=new Set<string>(),edges:{parent:string;child:string}[]=[];
    const ref=(value:unknown):value is FamilyTemplateSubjectV1=>{
      if(fields(value,['kind','bindingId'])&&value.kind==='binding'&&stableId(value.bindingId)&&bindingKinds.has(value.bindingId))return true;
      if(fields(value,['kind','slotId'])&&value.kind==='additional'&&stableId(value.slotId)&&slots.has(value.slotId)){used.add(value.slotId);return true;}
      return false;
    };
    for(const edge of template.parentages){
      if(!fields(edge,['parent','child','bases'])||!ref(edge.parent)||!ref(edge.child)||!basesShape(edge.bases))return false;
      const parent=canonicalStringify(edge.parent),child=canonicalStringify(edge.child),pair=JSON.stringify([parent,child]);
      if(parent===child||pairs.has(pair))return false;pairs.add(pair);edges.push({parent,child});
    }
    if(used.size!==slots.size||!acyclic(edges))return false;
  }
  return true;
}
function contextShape(value:unknown):value is FamilyCompositionContextV1{
  if(!fields(value,['people','kinship','borrowedSubjects'])||!validPeople(value.people)||!validKinshipWithPeople(value.kinship,value.people)||!dense(value.borrowedSubjects))return false;
  const scopes=new Set<string>(),owners=new Set<string>();
  for(const inventory of value.borrowedSubjects){
    if(!fields(inventory,['scopeId','producerId','planFingerprint','subjects'])||!stableId(inventory.scopeId)||!stableId(inventory.producerId)||!fingerprintShape(inventory.planFingerprint)||scopes.has(inventory.scopeId)||!dense(inventory.subjects))return false;
    const owner=JSON.stringify([inventory.producerId,inventory.planFingerprint]);if(owners.has(owner))return false;owners.add(owner);scopes.add(inventory.scopeId);
    const slots=new Set<string>();
    for(const slot of inventory.subjects){if(!fields(slot,['slotId','birth'])||!stableId(slot.slotId)||slots.has(slot.slotId)||!birthShape(slot.birth))return false;slots.add(slot.slotId);}
  }
  return true;
}
function requestShape(value:unknown,policy:FamilyCompositionPolicyV1,context:FamilyCompositionContextV1):value is FamilyCompositionRequestV1{
  if(!fields(value,['version','policyId','requestKey','rootSeed','referenceDate','countryId','familyScopeId','bindings'])||value.version!==1||value.policyId!==policy.policyId||!stableId(value.requestKey)||!nonnegative(value.rootSeed)||value.rootSeed>0xffffffff||!isSimulationDate(value.referenceDate)||!countryId(value.countryId)||value.countryId!==policy.scope.countryId||!stableId(value.familyScopeId)||!dense(value.bindings)||value.bindings.length!==policy.bindings.length)return false;
  const date=value.referenceDate;if(compareDates(date,policy.scope.effectiveFrom)<0||compareDates(date,policy.scope.effectiveThrough)>0||context.borrowedSubjects.some(item=>item.scopeId===value.familyScopeId))return false;
  const bindings=new Map(policy.bindings.map(item=>[item.bindingId,item.accepts])),used=new Set<string>(),subjects=new Set<string>();
  for(const binding of value.bindings){
    if(!fields(binding,['bindingId','subject'])||!stableId(binding.bindingId)||!bindings.has(binding.bindingId)||used.has(binding.bindingId)||!subjectShape(binding.subject))return false;
    const subject=binding.subject,key=subjectKey(subject);if(subjects.has(key))return false;subjects.add(key);used.add(binding.bindingId);
    if(subject.kind==='existing'){
      const person=context.people.people[Number(subject.personId.slice(7))-1];if(!person||person.id!==subject.personId||compareDates(person.dateOfBirth,date)>0)return false;
    }else{
      if(bindings.get(binding.bindingId)==='existing'||!context.borrowedSubjects.some(item=>item.scopeId===subject.scopeId&&item.subjects.some(slot=>slot.slotId===subject.slotId)))return false;
    }
  }
  return context.borrowedSubjects.every(item=>item.subjects.every(slot=>birthAtDate(slot.birth,date)))&&policy.templates.every(template=>template.additionalSubjects.every(slot=>birthAtDate(slot.birth,date))&&template.when.every(predicate=>predicate.kind!=='completed-age-range'||predicate.maximumAge<=ageOn({year:1,month:1,day:1},date)));
}
export function validateFamilyCompositionRequest(value:unknown,policy:FamilyCompositionPolicyV1,context:FamilyCompositionContextV1):value is FamilyCompositionRequestV1{
  try{const p=snapshot(policy),c=snapshot(context),r=snapshot(value);return validateFamilyCompositionPolicy(p)&&contextShape(c)&&requestShape(r,p,c);}catch{return false;}
}
/** Private sibling-module validators. They are not Foundation application APIs. */
export default Object.freeze({policyShape,contextShape,requestShape,birthShape,birthAtDate,subjectShape,basesShape});
