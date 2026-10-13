import {ageOn,compareDates,isSimulationDate,isSimulationYear,MAX_SIMULATION_YEAR} from '../core/clock';
import type {SimulationDate} from '../core/model';
import {validPeople} from '../human/person';
import {canonicalStringify,countryId,dense,fields,fingerprintShape,personId,snapshot,stableId,subjectKey,unionId,versionedId} from './data';
import {validateRelationshipUnionCompositionPolicy} from './package';
import type {RelationshipBirthConstraintV1,RelationshipUnionCompositionContextV1,RelationshipUnionCompositionPolicyV1,RelationshipUnionCompositionRequestV1,RelationshipSubjectRefV1,RelationshipTemplateSubjectV1,RelationshipFormalUnionTemplateV1} from './types';

const nonnegative=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
const positive=(v:unknown):v is number=>nonnegative(v)&&v>0;
const unique=(v:readonly string[])=>new Set(v).size===v.length;
const text=(v:unknown):v is string=>{
  if(typeof v!=='string'||!v.trim())return false;
  for(let i=0;i<v.length;i++){const n=v.charCodeAt(i);if(n>=0xd800&&n<=0xdbff){const next=v.charCodeAt(++i);if(!(next>=0xdc00&&next<=0xdfff))return false;}else if(n>=0xdc00&&n<=0xdfff)return false;}return true;
};
const strings=(v:unknown,guard:(x:unknown)=>x is string):v is readonly string[]=>dense(v)&&v.every(guard)&&unique(v);
const date=(v:unknown):v is SimulationDate=>fields(v,['year','month','day'])&&isSimulationDate(v);
const ageRange=(min:unknown,max:unknown)=>nonnegative(min)&&nonnegative(max)&&min<=max&&max<MAX_SIMULATION_YEAR;
function birthShape(v:unknown):v is RelationshipBirthConstraintV1{
  if(fields(v,['kind']))return v.kind==='any-living';
  if(fields(v,['kind','minimumYear','maximumYear']))return v.kind==='birth-year-range'&&isSimulationYear(v.minimumYear)&&isSimulationYear(v.maximumYear)&&v.minimumYear<=v.maximumYear;
  return fields(v,['kind','minimumAge','maximumAge'])&&v.kind==='completed-age-range'&&ageRange(v.minimumAge,v.maximumAge);
}
function birthAtDate(v:RelationshipBirthConstraintV1,d:SimulationDate):boolean{
  return v.kind==='any-living'||(v.kind==='birth-year-range'?v.maximumYear<=d.year:v.maximumAge<=ageOn({year:1,month:1,day:1},d));
}
function subjectShape(v:unknown):v is RelationshipSubjectRefV1{
  return fields(v,['kind','personId'])?v.kind==='existing'&&personId(v.personId):fields(v,['kind','scopeId','slotId'])&&v.kind==='future'&&stableId(v.scopeId)&&stableId(v.slotId);
}
const kindRef=(v:unknown)=>fields(v,['kindId','fingerprint'])&&versionedId(v.kindId)&&fingerprintShape(v.fingerprint);
const separation=(v:unknown)=>v==='unknown'||v==='not-separated'||v==='separated';
function policyShape(v:unknown):v is RelationshipUnionCompositionPolicyV1{
  if(!fields(v,['version','policyId','fingerprint','algorithmId','eligibility','scope','bindings','unionBindings','templates','provenance','limitations'])||v.version!==1||!versionedId(v.policyId)||!fingerprintShape(v.fingerprint)||v.algorithmId!=='relationship-union-composition.weighted-integer-v1'||v.eligibility!=='declared-person-facts-v1')return false;
  if(!fields(v.scope,['countryId','effectiveFrom','effectiveThrough'])||!countryId(v.scope.countryId)||!date(v.scope.effectiveFrom)||!date(v.scope.effectiveThrough)||compareDates(v.scope.effectiveFrom,v.scope.effectiveThrough)>0)return false;
  if(!dense(v.bindings)||!strings(v.unionBindings,stableId)||!dense(v.templates)||!v.templates.length||!dense(v.provenance)||!strings(v.limitations,text))return false;
  const bindings=new Map<string,string>(),provenance=new Set<string>(),pins=new Map<string,string>();
  for(const b of v.bindings){if(!fields(b,['bindingId','accepts'])||!stableId(b.bindingId)||bindings.has(b.bindingId)||(b.accepts!=='existing'&&b.accepts!=='subject'))return false;bindings.set(b.bindingId,b.accepts);}
  for(const p of v.provenance){if(!fields(p,['id','classification','sourceIds','note'])||!stableId(p.id)||provenance.has(p.id)||!['observed','estimated','calibrated','assumed','authored-gameplay-abstraction'].includes(p.classification as string)||!strings(p.sourceIds,stableId)||!text(p.note))return false;provenance.add(p.id);}
  const ids=new Set<string>();let mass=0n;
  for(const t of v.templates){
    if(!fields(t,['id','weight','when','additionalSubjects','partnerships','formalUnions','provenanceIds'])||!stableId(t.id)||ids.has(t.id)||!positive(t.weight)||!dense(t.when)||!dense(t.additionalSubjects)||!dense(t.partnerships)||!dense(t.formalUnions)||!strings(t.provenanceIds,stableId)||t.provenanceIds.some(x=>!provenance.has(x)))return false;
    ids.add(t.id);mass+=BigInt(t.weight);if(mass>BigInt(Number.MAX_SAFE_INTEGER))return false;
    const predicates=new Set<string>(),slots=new Set<string>();
    for(const p of t.when){
      if(!fields(p,['kind','bindingId','minimumAge','maximumAge'])&&!fields(p,['kind','bindingId','lifeStatus']))return false;
      if(!stableId(p.bindingId)||bindings.get(p.bindingId)!=='existing')return false;
      if(p.kind==='completed-age-range'){if(!fields(p,['kind','bindingId','minimumAge','maximumAge'])||!ageRange(p.minimumAge,p.maximumAge))return false;}
      else if(p.kind==='life-status'){if(!fields(p,['kind','bindingId','lifeStatus'])||(p.lifeStatus!=='living'&&p.lifeStatus!=='deceased'))return false;}else return false;
      const key=JSON.stringify([p.kind,p.bindingId]);if(predicates.has(key))return false;predicates.add(key);
    }
    for(const s of t.additionalSubjects){if(!fields(s,['slotId','birth'])||!stableId(s.slotId)||slots.has(s.slotId)||bindings.has(s.slotId)||!birthShape(s.birth))return false;slots.add(s.slotId);}
    const used=new Set<string>(),pairs=new Set<string>(),cells=new Set<string>(),contracts=new Set<string>(),assertions=new Set<string>();
    const ref=(x:unknown):x is RelationshipTemplateSubjectV1=>{
      if(fields(x,['kind','bindingId'])&&x.kind==='binding'&&stableId(x.bindingId)&&bindings.has(x.bindingId))return true;
      if(fields(x,['kind','slotId'])&&x.kind==='additional'&&stableId(x.slotId)&&slots.has(x.slotId)){used.add(x.slotId);return true;}return false;
    };
    const pair=(x:unknown):x is readonly [RelationshipTemplateSubjectV1,RelationshipTemplateSubjectV1]=>dense(x)&&x.length===2&&ref(x[0])&&ref(x[1])&&canonicalStringify(x[0])!==canonicalStringify(x[1]);
    const pairKey=(x:readonly RelationshipTemplateSubjectV1[])=>JSON.stringify(x.map(canonicalStringify).sort()); // template references contain ASCII IDs only
    for(const p of t.partnerships){if(!fields(p,['subjects'])||!pair(p.subjects))return false;const key=pairKey(p.subjects);if(pairs.has(key))return false;pairs.add(key);}
    for(const u of t.formalUnions){
      if(!fields(u,['kind','contractSlotId','subjects','unionKind','formedOn','separation'])&&!fields(u,['kind','unionBindingId','subjects','unionKind','separation']))return false;
      if(!pair(u.subjects)||!kindRef(u.unionKind)||!separation(u.separation))return false;
      const pin=u.unionKind as {kindId:string;fingerprint:string};if(pins.has(pin.kindId)&&pins.get(pin.kindId)!==pin.fingerprint)return false;pins.set(pin.kindId,pin.fingerprint);
      if(u.kind==='create-contract'){
        if(!fields(u,['kind','contractSlotId','subjects','unionKind','formedOn','separation'])||!stableId(u.contractSlotId)||contracts.has(u.contractSlotId)||u.formedOn!==null&&!date(u.formedOn))return false;contracts.add(u.contractSlotId);
      }else if(u.kind==='assert-existing'){
        if(!fields(u,['kind','unionBindingId','subjects','unionKind','separation'])||!stableId(u.unionBindingId)||!v.unionBindings.includes(u.unionBindingId)||assertions.has(u.unionBindingId)||u.subjects.some(s=>s.kind!=='binding'||bindings.get(s.bindingId)!=='existing'))return false;assertions.add(u.unionBindingId);
      }else return false;
      const cell=JSON.stringify([pairKey(u.subjects),pin.kindId]);if(cells.has(cell))return false;cells.add(cell);
    }
    if(used.size!==slots.size)return false;
  }return true;
}
function contextShape(v:unknown):v is RelationshipUnionCompositionContextV1{
  if(!fields(v,['people','borrowedSubjects'])||!validPeople(v.people)||!dense(v.borrowedSubjects))return false;
  const scopes=new Set<string>(),owners=new Set<string>();
  for(const i of v.borrowedSubjects){
    if(!fields(i,['scopeId','producerId','planFingerprint','subjects'])||!stableId(i.scopeId)||!['household-composition.v1','family-composition.v1'].includes(i.producerId as string)||!fingerprintShape(i.planFingerprint)||scopes.has(i.scopeId)||!dense(i.subjects))return false;
    const owner=JSON.stringify([i.producerId,i.planFingerprint]);if(owners.has(owner))return false;owners.add(owner);scopes.add(i.scopeId);
    const slots=new Set<string>();for(const s of i.subjects){if(!fields(s,['slotId','birth'])||!stableId(s.slotId)||slots.has(s.slotId)||!birthShape(s.birth))return false;slots.add(s.slotId);}
  }return true;
}
function requestShape(v:unknown,p:RelationshipUnionCompositionPolicyV1,c:RelationshipUnionCompositionContextV1):v is RelationshipUnionCompositionRequestV1{
  if(!fields(v,['version','policyId','requestKey','rootSeed','referenceDate','countryId','relationshipScopeId','bindings','unionBindings'])||v.version!==1||v.policyId!==p.policyId||!stableId(v.requestKey)||!nonnegative(v.rootSeed)||v.rootSeed>0xffffffff||!date(v.referenceDate)||!countryId(v.countryId)||v.countryId!==p.scope.countryId||!stableId(v.relationshipScopeId)||!dense(v.bindings)||v.bindings.length!==p.bindings.length||!dense(v.unionBindings)||v.unionBindings.length!==p.unionBindings.length)return false;
  const d=v.referenceDate;if(compareDates(d,p.scope.effectiveFrom)<0||compareDates(d,p.scope.effectiveThrough)>0||c.borrowedSubjects.some(i=>i.scopeId===v.relationshipScopeId))return false;
  const bindings=new Map(p.bindings.map(b=>[b.bindingId,b.accepts])),used=new Set<string>(),subjects=new Set<string>();
  for(const b of v.bindings){
    if(!fields(b,['bindingId','subject'])||!stableId(b.bindingId)||!bindings.has(b.bindingId)||used.has(b.bindingId)||!subjectShape(b.subject))return false;
    const s=b.subject,key=subjectKey(s);if(subjects.has(key))return false;subjects.add(key);used.add(b.bindingId);
    if(s.kind==='existing'){
      const person=c.people.people[Number(s.personId.slice(7))-1];if(!person||person.id!==s.personId||compareDates(person.dateOfBirth,d)>0||person.diedAt&&compareDates(person.diedAt,d)>0)return false;
    }else if(bindings.get(b.bindingId)==='existing'||!c.borrowedSubjects.some(i=>i.scopeId===s.scopeId&&i.subjects.some(slot=>slot.slotId===s.slotId)))return false;
  }
  const unionBindings=new Set<string>(),unionIds=new Set<string>();
  for(const b of v.unionBindings){if(!fields(b,['unionBindingId','unionId'])||!stableId(b.unionBindingId)||!p.unionBindings.includes(b.unionBindingId)||unionBindings.has(b.unionBindingId)||!unionId(b.unionId)||unionIds.has(b.unionId))return false;unionBindings.add(b.unionBindingId);unionIds.add(b.unionId);}
  return c.borrowedSubjects.every(i=>i.subjects.every(s=>birthAtDate(s.birth,d)))&&p.templates.every(t=>t.additionalSubjects.every(s=>birthAtDate(s.birth,d))&&t.when.every(q=>q.kind!=='completed-age-range'||q.maximumAge<=ageOn({year:1,month:1,day:1},d)));
}
export function validateRelationshipUnionCompositionRequest(value:unknown,policy:RelationshipUnionCompositionPolicyV1,context:RelationshipUnionCompositionContextV1):value is RelationshipUnionCompositionRequestV1{
  try{const p=snapshot(policy),c=snapshot(context),r=snapshot(value);return validateRelationshipUnionCompositionPolicy(p)&&contextShape(c)&&requestShape(r,p,c);}catch{return false;}
}
// Private immutable sibling validator table; not an application API.
export default Object.freeze({policyShape,contextShape,requestShape,birthShape,birthAtDate,subjectShape,date});
