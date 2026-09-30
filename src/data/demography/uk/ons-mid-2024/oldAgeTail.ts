import {addDays,addYears,compareDates,dateToOrdinal,isSimulationDate} from '../../../../engine/core/clock';
import type {SimulationDate} from '../../../../engine/core/model';
import {addRational,allocateLargestRemainder,compareRational,divideRational,multiplyRational,parseExactDecimal,rational,rationalToString,type ExactRational} from '../../../../engine/human/calibration/arithmetic';

export const UK_OLD_AGE_TAIL_MODEL_ID='uk-old-age-tail.geometric-adjacent-v1' as const;
export const UK_OLD_AGE_TAIL_TERMINAL_AGE=120 as const;
const REFERENCE_DATE={year:2024,month:6,day:30} as const;
const codePointCompare=(left:string,right:string)=>left<right?-1:left>right?1:0;
const ageId=(age:number)=>`age:${String(age).padStart(3,'0')}`;
const birthYearId=(year:number)=>`birth-year:${String(year).padStart(4,'0')}`;

export type OldAgeSourceCell=Readonly<{age:number;count:number}>;
export type UkOldAgeTailInput=Readonly<{
  referenceDate:SimulationDate;
  authoritative90Plus:number;
  published90Plus:number;
  published105Plus:number;
  ages90To104:readonly OldAgeSourceCell[];
  sourceReleaseIds:readonly string[];
}>;
export type CanonicalAgeCount=Readonly<{age:number;count:number}>;
export type CanonicalBirthYearCount=Readonly<{birthYear:number;count:number}>;
export type TailLineage=Readonly<{
  age:number;
  modelId:typeof UK_OLD_AGE_TAIL_MODEL_ID;
  sourceReleaseIds:readonly string[];
  originalRounded105Plus:number;
  ratioNumerator:string;
  ratioDenominator:string;
  supportAges:'105-119';
  terminalAgeAssumption:120;
  normalizedPreReconciliationWeight:string;
  postReconciliationCount:number;
  receivedResidualUnit:boolean;
  sourcePrecision:'rounded-open-age-band';
  assumedTailShape:true;
  calibratedIntegerAllocation:true;
  directlyObserved:false;
  statement:string;
}>;
export type TailSensitivity=Readonly<{
  id:string;
  ratio:string;
  preReconciliationTailTotal:number;
  postReconciliationTailTotal:number;
  ages:readonly CanonicalAgeCount[];
  birthYears:readonly CanonicalBirthYearCount[];
  maximumCellDifference:number;
  totalAbsoluteMovement:number;
  oldestNonzeroAge:number|null;
  oldestNonzeroBirthYear:number|null;
  authoritative90Plus:number;
  authoritativePopulation:number;
}>;
export type UkOldAgeTailReport=Readonly<{
  version:1;
  modelId:typeof UK_OLD_AGE_TAIL_MODEL_ID;
  referenceDate:SimulationDate;
  sourceReleaseIds:readonly string[];
  authoritativePopulation:number;
  authoritative90Plus:number;
  published90Plus:number;
  publishedAges90To104:readonly OldAgeSourceCell[];
  published105Plus:number;
  unsupportedResidualBeforeModel:number;
  ratio:Readonly<{numerator:string;denominator:string;value:string}>;
  rawTailWeights:readonly Readonly<{age:number;weight:string}>[];
  normalizedTailWeights:readonly Readonly<{age:number;weight:string}>[];
  preReconciliationTailTotal:number;
  reconciliation:Readonly<{kind:'proportional-largest-remainder';target:number;inputTotal:string;residualAssignments:readonly string[]}>;
  canonicalAges90To119:readonly CanonicalAgeCount[];
  canonicalTail105To119:readonly CanonicalAgeCount[];
  canonicalTailTotal:number;
  canonical90PlusTotal:number;
  canonicalBirthYears:readonly CanonicalBirthYearCount[];
  lineage:readonly TailLineage[];
  terminalAgeAssumption:Readonly<{age:120;classification:'official-method-assumption';statement:string}>;
  sensitivity:readonly TailSensitivity[];
  demographicCoverage:'complete';
  personGenerationReadiness:'not-ready';
}>;

const safeSum=(values:readonly number[])=>values.reduce((sum,value)=>{const next=sum+value;if(!Number.isSafeInteger(next))throw Error('Old-age-tail total exceeds the safe integer range.');return next;},0);
const immutable=<T>(value:T):T=>{const copy=structuredClone(value);const freeze=(item:unknown):void=>{if(!item||typeof item!=='object'||Object.isFrozen(item))return;for(const key of Reflect.ownKeys(item)){const descriptor=Object.getOwnPropertyDescriptor(item,key);if(descriptor&&'value' in descriptor)freeze(descriptor.value);}Object.freeze(item);};freeze(copy);return copy;};
const power=(base:ExactRational,exponent:number)=>{let result=rational(1n);for(let index=0;index<exponent;index++)result=multiplyRational(result,base);return result;};
const roundedCompatible=(canonical:number,published:number)=>Number.isSafeInteger(canonical)&&Number.isSafeInteger(published)&&Math.abs(canonical-published)<=5;
const daysInclusive=(from:SimulationDate,through:SimulationDate)=>dateToOrdinal(through)-dateToOrdinal(from)+1;

function validateInput(input:UkOldAgeTailInput):Map<number,number>{
  try{
    if(!input||typeof input!=='object'||Array.isArray(input)||(Object.getPrototypeOf(input)!==Object.prototype&&Object.getPrototypeOf(input)!==null))throw Error();
    const fields=Reflect.ownKeys(input);if(fields.length!==6||!['referenceDate','authoritative90Plus','published90Plus','published105Plus','ages90To104','sourceReleaseIds'].every(key=>fields.includes(key)))throw Error();
    for(const key of fields){const descriptor=Object.getOwnPropertyDescriptor(input,key);if(typeof key!=='string'||!descriptor?.enumerable||!('value' in descriptor))throw Error();}
    if(!isSimulationDate(input.referenceDate)||compareDates(input.referenceDate,REFERENCE_DATE)!==0)throw Error();
    for(const value of [input.authoritative90Plus,input.published90Plus,input.published105Plus])if(!Number.isSafeInteger(value)||value<=0)throw Error();
    if(!Array.isArray(input.ages90To104)||input.ages90To104.length!==15||Object.keys(input.ages90To104).length!==15||Reflect.ownKeys(input.ages90To104).length!==16)throw Error();
    const result=new Map<number,number>();
    for(let index=0;index<input.ages90To104.length;index++){
      const descriptor=Object.getOwnPropertyDescriptor(input.ages90To104,index);if(!descriptor?.enumerable||!('value' in descriptor))throw Error();const cell=descriptor.value;
      if(!cell||typeof cell!=='object'||Array.isArray(cell)||(Object.getPrototypeOf(cell)!==Object.prototype&&Object.getPrototypeOf(cell)!==null)||Reflect.ownKeys(cell).length!==2)throw Error();
      const age=Object.getOwnPropertyDescriptor(cell,'age'),count=Object.getOwnPropertyDescriptor(cell,'count');if(!age?.enumerable||!('value' in age)||!count?.enumerable||!('value' in count)||!Number.isSafeInteger(age.value)||age.value<90||age.value>104||!Number.isSafeInteger(count.value)||count.value<0||result.has(age.value))throw Error();result.set(age.value,count.value);
    }
    if([...Array(15)].some((_,index)=>!result.has(90+index)))throw Error();
    if(!Array.isArray(input.sourceReleaseIds)||input.sourceReleaseIds.length===0||Object.keys(input.sourceReleaseIds).length!==input.sourceReleaseIds.length||Reflect.ownKeys(input.sourceReleaseIds).length!==input.sourceReleaseIds.length+1||input.sourceReleaseIds.some(id=>typeof id!=='string'||!id.trim())||new Set(input.sourceReleaseIds).size!==input.sourceReleaseIds.length)throw Error();
    if(Math.round(input.authoritative90Plus/10)*10!==input.published90Plus)throw Error();
    return result;
  }catch{throw Error('Invalid UK old-age-tail model input.');}
}

function allocateBirthYears(referenceDate:SimulationDate,ages:readonly CanonicalAgeCount[]):readonly CanonicalBirthYearCount[]{
  const totals=new Map<number,number>();
  for(const cell of ages){
    if(!Number.isSafeInteger(cell.age)||cell.age<0||cell.age>=referenceDate.year||!Number.isSafeInteger(cell.count)||cell.count<0)throw Error('Invalid completed-age allocation.');
    if(cell.count===0)continue;
    const from=addDays(addYears(referenceDate,-(cell.age+1)),1),through=addYears(referenceDate,-cell.age),weights=[] as {id:string;weight:ExactRational}[];
    for(let year=from.year;year<=through.year;year++){
      const start=compareDates(from,{year,month:1,day:1})>0?from:{year,month:1,day:1},end=compareDates(through,{year,month:12,day:31})<0?through:{year,month:12,day:31},days=daysInclusive(start,end);
      if(days>0)weights.push({id:birthYearId(year),weight:rational(BigInt(days))});
    }
    const allocation=allocateLargestRemainder(cell.count,weights);
    if(safeSum(allocation.allocations.map(item=>item.count))!==cell.count)throw Error('Birth-year allocation did not conserve its source age.');
    for(const item of allocation.allocations){const year=Number(item.id.slice('birth-year:'.length));totals.set(year,safeSum([totals.get(year)??0,item.count]));}
  }
  return Object.freeze([...totals].filter(([,count])=>count>0).sort(([left],[right])=>left-right).map(([birthYear,count])=>Object.freeze({birthYear,count})));
}

export function allocateCompletedAgePopulationToBirthYears(referenceDate:SimulationDate,ages:readonly CanonicalAgeCount[]):readonly CanonicalBirthYearCount[]{
  if(!isSimulationDate(referenceDate)||!Array.isArray(ages)||Object.keys(ages).length!==ages.length||Reflect.ownKeys(ages).length!==ages.length+1)throw Error('Invalid completed-age population.');
  const seen=new Set<number>();for(const item of ages){if(!item||typeof item!=='object'||Array.isArray(item)||!Number.isSafeInteger(item.age)||seen.has(item.age))throw Error('Invalid completed-age population.');seen.add(item.age);}
  return immutable(allocateBirthYears(referenceDate,ages));
}

function normalizedTail(ratio:ExactRational,total:number){
  const raw=Array.from({length:15},(_,index)=>({age:105+index,weight:power(ratio,index)})),sum=raw.reduce((value,item)=>addRational(value,item.weight),rational(0n));
  if(sum.numerator===0n)throw Error('Old-age-tail model produced zero total weight.');
  return {raw,normalized:raw.map(item=>({age:item.age,weight:divideRational(multiplyRational(rational(BigInt(total)),item.weight),sum)}))};
}

function fullReconciliation(source:ReadonlyMap<number,number>,ratio:ExactRational,authoritative:number,publishedTail:number){
  const tail=normalizedTail(ratio,publishedTail),weights=[...source].map(([age,count])=>({id:ageId(age),weight:rational(BigInt(count))}));
  weights.push(...tail.normalized.map(item=>({id:ageId(item.age),weight:item.weight})));
  const allocation=allocateLargestRemainder(authoritative,weights),ages=allocation.allocations.map(item=>({age:Number(item.id.slice(4)),count:item.count})).sort((a,b)=>a.age-b.age);
  return {tail,...allocation,ages};
}

function diagnosticRatio(value:number):ExactRational{
  if(!Number.isFinite(value)||value<=0)return rational(0n);const text=value.toFixed(12).replace(/0+$/,'').replace(/\.$/,'');return parseExactDecimal(text);
}

function diagnostic(id:string,ratio:ExactRational,source:ReadonlyMap<number,number>,input:UkOldAgeTailInput,canonicalAges:readonly CanonicalAgeCount[],canonicalBirthYears:readonly CanonicalBirthYearCount[],preserveClosed=false):TailSensitivity{
  let ages:readonly CanonicalAgeCount[];
  if(preserveClosed){const target=input.authoritative90Plus-safeSum([...source.values()]),tail=normalizedTail(ratio,target),allocation=allocateLargestRemainder(target,tail.raw.map(item=>({id:ageId(item.age),weight:item.weight})));ages=Object.freeze([...source].map(([age,count])=>({age,count})).concat(allocation.allocations.map(item=>({age:Number(item.id.slice(4)),count:item.count}))).sort((a,b)=>a.age-b.age));}
  else ages=Object.freeze(fullReconciliation(source,ratio,input.authoritative90Plus,input.published105Plus).ages);
  const birthYears=allocateBirthYears(input.referenceDate,ages),canonical=new Map(canonicalAges.map(item=>[item.age,item.count])),allAges=[...new Set([...canonical.keys(),...ages.map(item=>item.age)])],differences=allAges.map(age=>Math.abs((ages.find(item=>item.age===age)?.count??0)-(canonical.get(age)??0)));
  const tailTotal=safeSum(ages.filter(item=>item.age>=105).map(item=>item.count)),oldestAge=ages.filter(item=>item.count>0).at(-1)?.age??null,oldestBirthYear=birthYears.find(item=>item.count>0)?.birthYear??null;
  void canonicalBirthYears;
  return Object.freeze({id,ratio:rationalToString(ratio),preReconciliationTailTotal:preserveClosed?input.authoritative90Plus-safeSum([...source.values()]):input.published105Plus,postReconciliationTailTotal:tailTotal,ages,birthYears,maximumCellDifference:Math.max(0,...differences),totalAbsoluteMovement:safeSum(differences),oldestNonzeroAge:oldestAge,oldestNonzeroBirthYear:oldestBirthYear,authoritative90Plus:input.authoritative90Plus,authoritativePopulation:69281437});
}

export function compileUkOldAgeTail(input:UkOldAgeTailInput):UkOldAgeTailReport{
  const source=validateInput(input),numerator=safeSum([source.get(101)!,source.get(102)!,source.get(103)!,source.get(104)!]),denominator=safeSum([source.get(100)!,source.get(101)!,source.get(102)!,source.get(103)!]),ratio=rational(BigInt(numerator),BigInt(denominator));
  if(compareRational(ratio,rational(0n))<=0||compareRational(ratio,rational(1n))>=0)throw Error('UK old-age-tail continuation ratio must be between zero and one.');
  const central=safeSum([...source.values(),input.published105Plus]);if(Math.abs(central-input.authoritative90Plus)>5*16)throw Error('UK old-age-tail authoritative subtotal is incompatible with the rounded source cells.');
  const canonical=fullReconciliation(source,ratio,input.authoritative90Plus,input.published105Plus),canonicalAges=Object.freeze(canonical.ages.map(item=>Object.freeze(item))),tailAges=Object.freeze(canonicalAges.filter(item=>item.age>=105)),tailTotal=safeSum(tailAges.map(item=>item.count));
  if(safeSum(canonicalAges.map(item=>item.count))!==input.authoritative90Plus)throw Error('UK old-age-tail reconciliation failed to conserve the 90+ subtotal.');
  for(const item of canonicalAges.filter(item=>item.age<=104))if(!roundedCompatible(item.count,source.get(item.age)!))throw Error('UK old-age-tail reconciliation is incompatible with a published source cell.');
  if(!roundedCompatible(tailTotal,input.published105Plus))throw Error('UK old-age-tail reconciliation is incompatible with the published 105+ estimate.');
  const canonicalBirthYears=allocateBirthYears(input.referenceDate,canonicalAges),individual=Array.from({length:4},(_,index)=>rational(BigInt(source.get(101+index)!),BigInt(source.get(100+index)!))).sort(compareRational),median=divideRational(addRational(individual[1],individual[2]),rational(2n)),endpoint=diagnosticRatio((source.get(104)!/source.get(100)!)**0.25),logValues=Array.from({length:5},(_,index)=>Math.log(source.get(100+index)!)),mean=logValues.reduce((sum,value)=>sum+value,0)/5,logSlope=logValues.reduce((sum,value,index)=>sum+(index-2)*(value-mean),0)/10,logLinear=diagnosticRatio(Math.exp(logSlope)),last=rational(BigInt(source.get(104)!),BigInt(source.get(103)!)),roundingLow=rational(BigInt(numerator-20),BigInt(denominator-10)),roundingHigh=rational(BigInt(numerator+20),BigInt(denominator+10));
  const variants:[string,ExactRational,boolean?][]=[['canonical.pooled-adjacent',ratio],['rounding.lower-bound',roundingLow],['rounding.upper-bound',roundingHigh],['estimator.median-adjacent',median],['estimator.endpoint-geometric',endpoint],['estimator.log-linear',logLinear],['stress.last-adjacent-ratio',last],['envelope.minimum-adjacent-ratio',individual[0]],['envelope.maximum-adjacent-ratio',individual[3]],['reconciliation.preserve-90-104-allocate-residual',ratio,true]];
  const sensitivity=Object.freeze(variants.map(([id,value,preserve])=>diagnostic(id,value,source,input,canonicalAges,canonicalBirthYears,preserve)));
  const tailResiduals=new Set(canonical.residualAssignments),lineage=Object.freeze(tailAges.map(item=>{const normalized=canonical.tail.normalized.find(weight=>weight.age===item.age)!;return Object.freeze({age:item.age,modelId:UK_OLD_AGE_TAIL_MODEL_ID,sourceReleaseIds:Object.freeze([...input.sourceReleaseIds].sort(codePointCompare)),originalRounded105Plus:input.published105Plus,ratioNumerator:ratio.numerator.toString(),ratioDenominator:ratio.denominator.toString(),supportAges:'105-119' as const,terminalAgeAssumption:120 as const,normalizedPreReconciliationWeight:rationalToString(normalized.weight),postReconciliationCount:item.count,receivedResidualUnit:tailResiduals.has(ageId(item.age)),sourcePrecision:'rounded-open-age-band' as const,assumedTailShape:true as const,calibratedIntegerAllocation:true as const,directlyObserved:false as const,statement:`Canonical count ${item.count} at completed age ${item.age} is a deterministic allocation from rounded 105+ evidence using an assumed geometric tail; it is not an ONS single-age estimate.`});}));
  return immutable({version:1,modelId:UK_OLD_AGE_TAIL_MODEL_ID,referenceDate:{...input.referenceDate},sourceReleaseIds:[...input.sourceReleaseIds].sort(codePointCompare),authoritativePopulation:69281437,authoritative90Plus:input.authoritative90Plus,published90Plus:input.published90Plus,publishedAges90To104:[...source].sort(([left],[right])=>left-right).map(([age,count])=>({age,count})),published105Plus:input.published105Plus,unsupportedResidualBeforeModel:input.authoritative90Plus-safeSum([...source.values()]),ratio:{numerator:ratio.numerator.toString(),denominator:ratio.denominator.toString(),value:rationalToString(ratio)},rawTailWeights:canonical.tail.raw.map(item=>({age:item.age,weight:rationalToString(item.weight)})),normalizedTailWeights:canonical.tail.normalized.map(item=>({age:item.age,weight:rationalToString(item.weight)})),preReconciliationTailTotal:input.published105Plus,reconciliation:{kind:'proportional-largest-remainder',target:input.authoritative90Plus,inputTotal:rationalToString(addRational(rational(BigInt(safeSum([...source.values()]))),rational(BigInt(input.published105Plus)))),residualAssignments:canonical.residualAssignments},canonicalAges90To119:canonicalAges,canonicalTail105To119:tailAges,canonicalTailTotal:tailTotal,canonical90PlusTotal:input.authoritative90Plus,canonicalBirthYears,lineage,terminalAgeAssumption:{age:120,classification:'official-method-assumption',statement:'The initialization model assigns no support at age 120 or above because the official ONS production method assumes no survivors beyond age 120; this is not an observed or biological maximum age.'},sensitivity,demographicCoverage:'complete',personGenerationReadiness:'not-ready'});
}

export function renderUkOldAgeTailReport(report:UkOldAgeTailReport):string{
  return [`Model ${report.modelId}`,`Reference date: ${report.referenceDate.year}-${String(report.referenceDate.month).padStart(2,'0')}-${String(report.referenceDate.day).padStart(2,'0')}`,`Exact continuation ratio: ${report.ratio.numerator}/${report.ratio.denominator}`,`Published rounded 105+: ${report.published105Plus}; canonical reconciled tail: ${report.canonicalTailTotal}`,`Canonical 90+ total: ${report.canonical90PlusTotal}; authoritative UK total: ${report.authoritativePopulation}`,report.terminalAgeAssumption.statement,...report.lineage.map(item=>item.statement),`Demographic coverage: ${report.demographicCoverage}; Person-generation readiness: ${report.personGenerationReadiness}`].join('\n');
}
