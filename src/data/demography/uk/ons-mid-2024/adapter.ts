import {strFromU8,unzipSync} from 'fflate';
import {validatePopulationCalibrationPackage,withCalibrationFingerprint} from '../../../../engine/human/calibration/package';
import type {PopulationCalibrationPackageV1,PopulationMeasureV1} from '../../../../engine/human/calibration/types';
import {allocateCompletedAgePopulationToBirthYears,compileUkOldAgeTail,renderUkOldAgeTailReport,UK_OLD_AGE_TAIL_MODEL_ID,type UkOldAgeTailReport} from './oldAgeTail';
import packageManifestJson from './package-manifest.json';
import successorPackageManifestJson from './successor-package-manifest.json';
import compiledPackageV2Json from './compiled-package-v2.json';
import manifestJson from './source-manifest.json';

export type EvidenceArtifact=Readonly<{
  id:string;
  filename:string;
  mediaType:string;
  size:number;
  sha256:string;
  sourceLocator:string;
  purpose:string;
}>;

export type EvidenceBundleManifest=Readonly<{
  version:1;
  bundleId:string;
  publisher:string;
  publication:string;
  releaseId:string;
  publicationDate:string;
  referenceDate:string;
  retrievalDate:string;
  licence:string;
  licenceLocator:string;
  correctionNotices:readonly string[];
  artifacts:readonly EvidenceArtifact[];
}>;

export type CompletedAgeEvidence=Readonly<{minimumAge:number;maximumAge:number|null;value:string;series:string;roundingNote?:string}>;
export type OnsMid2024WorkbookEvidence=Readonly<{
  releaseId:'MYE24UK';
  referenceDate:Readonly<{year:2024;month:6;day:30}>;
  authoritativeTotal:string;
  ages:readonly CompletedAgeEvidence[];
  constituentTotals:Readonly<{englandAndWales:string;scotland:string;northernIreland:string}>;
  ageSum:string;
  openAge90Plus:string;
}>;
export type OnsVeryOld2024Evidence=Readonly<{
  referenceDate:Readonly<{year:2024;month:6;day:30}>;
  ages:readonly CompletedAgeEvidence[];
  openAge105Plus:string;
  publishedAge90Plus:string;
  closedAgeSum:string;
}>;
export type UkMid2024V2ModelReport=Readonly<{
  version:1;
  packageId:'uk.population.mid-2024.v2';
  packageFingerprint:string;
  modelId:typeof UK_OLD_AGE_TAIL_MODEL_ID;
  evidenceSources:readonly string[];
  authoritativePopulation:number;
  authoritative90Plus:number;
  fullBirthYearOutputs:readonly Readonly<{birthYear:number;count:number}>[];
  tail:UkOldAgeTailReport;
  demographicCoverage:'complete';
  personGenerationReadiness:'not-ready';
}>;
export type UkMid2024V2Calibration=Readonly<{package:PopulationCalibrationPackageV1;modelReport:UkMid2024V2ModelReport}>;

const MANIFEST=manifestJson as EvidenceBundleManifest;
const utf8=new TextEncoder();
const codePointCompare=(left:string,right:string)=>left<right?-1:left>right?1:0;
const EXPECTED_SHEETS=['Cover sheet','Contents','Notes','Geography guide','Related publications','MYE1','MYE2 - Persons','MYE2 - Females','MYE2 - Males','MYE3','MYE4','MYE5','MYE6','MYE7'] as const;
const MAIN_ARTIFACT_ID='artifact.ons.mye24uk-workbook-v1';
const OLD_AGE_ARTIFACT_ID='artifact.ons.ukevo2024-csv-v1';
const REFERENCE_DATE={year:2024,month:6,day:30} as const;
const USUAL_RESIDENT_UNIVERSE='The mid-year population estimates are consistent with the standard UN definition for population estimates, which is based upon the concept of usual residence and includes people who reside, or intend to reside, in the country for at least 12 months, whatever their nationality. Visitors and short-term migrants (who enter or leave the UK for less than 12 months) are not included.';

function immutable<T>(value:T):T{
  const freeze=(item:unknown):void=>{if(!item||typeof item!=='object'||Object.isFrozen(item))return;for(const key of Reflect.ownKeys(item)){const descriptor=Object.getOwnPropertyDescriptor(item,key);if(descriptor&&'value' in descriptor)freeze(descriptor.value);}Object.freeze(item);};
  freeze(value);return value;
}

function artifact(id:string):EvidenceArtifact{
  const found=MANIFEST.artifacts.find(item=>item.id===id);
  if(!found)throw Error('ONS evidence manifest is missing a required artifact.');
  return found;
}

function hex(bytes:ArrayBuffer):string{return [...new Uint8Array(bytes)].map(value=>value.toString(16).padStart(2,'0')).join('');}
export async function sha256(bytes:Uint8Array):Promise<string>{return hex(await crypto.subtle.digest('SHA-256',bytes.slice().buffer));}

export function validateOnsMid2024Manifest(value:unknown):value is EvidenceBundleManifest{
  try{
    if(value!==MANIFEST||MANIFEST.version!==1||MANIFEST.bundleId!=='evidence.ons.uk-population-mid-2024-v1'||MANIFEST.releaseId!=='MYE24UK'||MANIFEST.referenceDate!=='2024-06-30'||MANIFEST.publicationDate!=='2025-09-26'||MANIFEST.retrievalDate!=='2026-09-24'||MANIFEST.licence!=='Open Government Licence v3.0')return false;
    if(!Array.isArray(MANIFEST.artifacts)||MANIFEST.artifacts.length!==4||new Set(MANIFEST.artifacts.map(item=>item.id)).size!==4)return false;
    return MANIFEST.artifacts.every(item=>Number.isSafeInteger(item.size)&&item.size>0&&/^[a-f0-9]{64}$/.test(item.sha256)&&item.filename.length>0&&item.sourceLocator.startsWith('https://www.ons.gov.uk/'));
  }catch{return false;}
}

export async function verifyOnsArtifact(bytes:Uint8Array,id:string):Promise<EvidenceArtifact>{
  if(!(bytes instanceof Uint8Array)||!validateOnsMid2024Manifest(MANIFEST))throw Error('Invalid ONS evidence artifact request.');
  const expected=artifact(id);
  if(bytes.byteLength!==expected.size||await sha256(bytes)!==expected.sha256)throw Error(`ONS evidence artifact failed integrity validation: ${expected.filename}.`);
  return expected;
}

function decodeXml(value:string):string{return value.replace(/&#(x[0-9a-f]+|\d+);|&(amp|lt|gt|quot|apos);/gi,(_,numeric:string|undefined,named:string|undefined)=>{
  if(numeric)return String.fromCodePoint(Number.parseInt(numeric.slice(0,1).toLowerCase()==='x'?numeric.slice(1):numeric,numeric.slice(0,1).toLowerCase()==='x'?16:10));
  return ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"} as Record<string,string>)[named!.toLowerCase()];
});}
function attributes(value:string):Readonly<Record<string,string>>{const result:Record<string,string>={};for(const match of value.matchAll(/([A-Za-z_:][A-Za-z0-9_.:-]*)="([^"]*)"/g))result[match[1]]=decodeXml(match[2]);return result;}
function entry(files:Readonly<Record<string,Uint8Array>>,path:string):string{const value=files[path];if(!value)throw Error(`ONS workbook is missing ${path}.`);return strFromU8(value);}
function sharedStrings(xml:string):readonly string[]{return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(match=>[...match[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(item=>decodeXml(item[1])).join(''));}
function workbookSheets(xml:string):readonly Readonly<{name:string;relationshipId:string}>[]{return [...xml.matchAll(/<sheet\b([^>]*)\/>/g)].map(match=>{const item=attributes(match[1]);if(!item.name||!item['r:id'])throw Error('ONS workbook contains a malformed sheet definition.');return {name:item.name,relationshipId:item['r:id']};});}
function relationships(xml:string):ReadonlyMap<string,string>{const result=new Map<string,string>();for(const match of xml.matchAll(/<Relationship\b([^>]*)\/>/g)){const item=attributes(match[1]);if(item.Id&&item.Target)result.set(item.Id,item.Target);}return result;}
function worksheetCells(xml:string,strings:readonly string[]):ReadonlyMap<string,string>{
  const result=new Map<string,string>();
  for(const cell of xml.matchAll(/<c\b(?![^>]*\/>)([^>]*)>([\s\S]*?)<\/c>/g)){
    const item=attributes(cell[1]),value=cell[2].match(/<v>([\s\S]*?)<\/v>/);
    if(!item.r||!value)continue;
    const raw=decodeXml(value[1]);
    if(item.t==='s'){
      if(!/^\d+$/.test(raw)||strings[Number(raw)]===undefined)throw Error('ONS workbook contains an invalid shared-string reference.');
      result.set(item.r,strings[Number(raw)]);
    }else if(item.t===undefined||item.t==='n')result.set(item.r,raw);
    else throw Error(`ONS workbook uses an unsupported cell type in ${item.r}.`);
  }
  return result;
}
function integerCell(cells:ReadonlyMap<string,string>,reference:string):string{const value=cells.get(reference);if(!value||!/^(?:0|[1-9]\d*)$/.test(value)||!Number.isSafeInteger(Number(value)))throw Error(`ONS workbook has an invalid integer in ${reference}.`);return value;}
function exactCell(cells:ReadonlyMap<string,string>,reference:string,expected:string):void{if(cells.get(reference)!==expected)throw Error(`ONS workbook schema mismatch in ${reference}.`);}
function columnName(index:number):string{let value=index+1,result='';while(value>0){value--;result=String.fromCharCode(65+value%26)+result;value=Math.floor(value/26);}return result;}

export async function adaptOnsMid2024Workbook(bytes:Uint8Array):Promise<OnsMid2024WorkbookEvidence>{
  await verifyOnsArtifact(bytes,MAIN_ARTIFACT_ID);
  try{
    const files=unzipSync(bytes),strings=sharedStrings(entry(files,'xl/sharedStrings.xml')),sheets=workbookSheets(entry(files,'xl/workbook.xml')),rels=relationships(entry(files,'xl/_rels/workbook.xml.rels'));
    if(sheets.map(item=>item.name).join('\u0000')!==EXPECTED_SHEETS.join('\u0000'))throw Error('ONS workbook sheet inventory changed.');
    const sheet=(name:string,expectedTarget:string)=>{const definition=sheets.find(item=>item.name===name),target=definition&&rels.get(definition.relationshipId);if(!definition||target!==expectedTarget)throw Error(`ONS workbook sheet mapping changed for ${name}.`);return worksheetCells(entry(files,`xl/${target}`),strings);};
    const summary=sheet('MYE1','worksheets/sheet6.xml'),persons=sheet('MYE2 - Persons','worksheets/sheet7.xml');
    exactCell(summary,'A1','MYE1: Population estimates: Summary for United Kingdom, mid-2024');exactCell(summary,'B8','K02000001');exactCell(summary,'A9','All Persons');
    exactCell(persons,'A1','MYE2: Persons by single year of age and sex for local authorities in the UK, mid-2024');exactCell(persons,'A8','Code');exactCell(persons,'B8','Name');exactCell(persons,'C8','Geography');exactCell(persons,'D8','All ages');exactCell(persons,'A9','K02000001');exactCell(persons,'B9','UNITED KINGDOM');exactCell(persons,'C9','Country');
    for(let age=0;age<=89;age++)exactCell(persons,`${columnName(4+age)}8`,String(age));exactCell(persons,'CQ8','90+');
    const authoritativeTotal=integerCell(summary,'B9');if(integerCell(persons,'D9')!==authoritativeTotal)throw Error('ONS total differs between MYE1 and MYE2.');
    const ages=Array.from({length:90},(_,age)=>Object.freeze({minimumAge:age,maximumAge:age,value:integerCell(persons,`${columnName(4+age)}9`),series:`MYE2 - Persons!${columnName(4+age)}9`}));
    const openAge90Plus=integerCell(persons,'CQ9'),ageSum=(ages.reduce((sum,item)=>sum+BigInt(item.value),0n)+BigInt(openAge90Plus)).toString();if(ageSum!==authoritativeTotal)throw Error('ONS completed-age cells do not sum to the UK total.');
    const constituentTotals={englandAndWales:integerCell(summary,'D9'),scotland:integerCell(summary,'G9'),northernIreland:integerCell(summary,'H9')};if((BigInt(constituentTotals.englandAndWales)+BigInt(constituentTotals.scotland)+BigInt(constituentTotals.northernIreland)).toString()!==authoritativeTotal)throw Error('ONS same-edition constituent totals do not sum to the UK total.');
    return immutable({releaseId:'MYE24UK',referenceDate:{...REFERENCE_DATE},authoritativeTotal,ages,constituentTotals,ageSum,openAge90Plus});
  }catch(error){if(error instanceof Error&&error.message.startsWith('ONS '))throw error;throw Error('ONS mid-2024 workbook could not be parsed safely.');}
}

function parseCsv(text:string):readonly (readonly string[])[]{
  const rows:string[][]=[];let row:string[]=[],field='',quoted=false;
  for(let index=0;index<text.length;index++){
    const character=text[index];
    if(quoted){if(character==='"'&&text[index+1]==='"'){field+='"';index++;}else if(character==='"')quoted=false;else if(character==='\r'&&text[index+1]==='\n'){field+='\n';index++;}else field+=character;continue;}
    if(character==='"'){if(field!=='')throw Error('Malformed ONS CSV quoting.');quoted=true;}else if(character===','){row.push(field);field='';}else if(character==='\r'&&text[index+1]==='\n'){row.push(field);rows.push(row);row=[];field='';index++;}else if(character==='\n'){row.push(field);rows.push(row);row=[];field='';}else field+=character;
  }
  if(quoted)throw Error('Malformed ONS CSV quoting.');if(field!==''||row.length){row.push(field);rows.push(row);}return rows;
}
function csvInteger(value:string):string{const normalized=value.replaceAll(',','');if(!/^(?:0|[1-9]\d*)$/.test(normalized)||!Number.isSafeInteger(Number(normalized)))throw Error('ONS very-old-age CSV contains an invalid integer.');return normalized;}

export async function adaptOnsVeryOld2024Csv(bytes:Uint8Array):Promise<OnsVeryOld2024Evidence>{
  await verifyOnsArtifact(bytes,OLD_AGE_ARTIFACT_ID);
  try{
    const rows=parseCsv(strFromU8(bytes));if(rows.length!==82)throw Error('ONS very-old-age CSV row count changed.');
    if(rows[0][0]!=='Mid-2002 to mid-2024 population estimates of the very old (including centenarians) UK (provisional) [note 1]')throw Error('ONS very-old-age CSV title changed.');
    const header=rows[3],expected=['Sex','Year','90 \nand over \n[note 4]','90 to 99','100 \nand over',...Array.from({length:15},(_,index)=>String(90+index)),'105 \nand over'];
    if(header.length!==expected.length||header.some((value,index)=>value!==expected[index]))throw Error('ONS very-old-age CSV schema changed.');
    const target=rows.find(row=>row[0]==='Persons'&&row[1]==='2024');if(!target||target.length!==21)throw Error('ONS very-old-age CSV is missing the Persons 2024 row.');
    const ages=Array.from({length:15},(_,index)=>Object.freeze({minimumAge:90+index,maximumAge:90+index,value:csvInteger(target[5+index]),series:`ukevo2024.csv:Persons:2024:age-${90+index}`,roundingNote:'Provisional estimate rounded to the nearest 10 people; figures may not add because of rounding.'}));
    const openAge105Plus=csvInteger(target[20]),publishedAge90Plus=csvInteger(target[2]),closedAgeSum=ages.reduce((sum,item)=>sum+BigInt(item.value),0n).toString();
    return immutable({referenceDate:{...REFERENCE_DATE},ages,openAge105Plus,publishedAge90Plus,closedAgeSum});
  }catch(error){if(error instanceof Error&&error.message.startsWith('ONS '))throw error;throw Error('ONS very-old-age CSV could not be parsed safely.');}
}

const measure=(id:string,sourceId:string,series:string,value:string,dimensions:PopulationMeasureV1['dimensions'],roundingNote?:string):PopulationMeasureV1=>({
  version:1,id,sourceId,series,semantic:'population-count',unit:'persons',referenceDate:{...REFERENCE_DATE},universeId:'population.universe.uk-usual-residents-mid-2024-v1',classification:'estimated',dimensions,value,
  uncertainty:'Official mid-year population estimate. Canonical integer precision must not be read as equivalent empirical precision.',
  ...(roundingNote===undefined?{}:{roundingNote}),
});

export function createUkMid2024CalibrationPackage(main:OnsMid2024WorkbookEvidence,oldAge:OnsVeryOld2024Evidence):PopulationCalibrationPackageV1{
  if(main.releaseId!=='MYE24UK'||main.referenceDate.year!==2024||oldAge.referenceDate.year!==2024)throw Error('Invalid UK mid-2024 evidence.');
  const total=measure('measure.ons.uk-total-mid-2024-v1','source.ons.uk-mye-mid-2024-v1','MYE1!B9',main.authoritativeTotal,{kind:'total'}),young=main.ages.map(item=>measure(`measure.ons.uk-age-${item.minimumAge}-mid-2024-v1`,'source.ons.uk-mye-mid-2024-v1',item.series,item.value,{kind:'completed-age-band',minimumAge:item.minimumAge,maximumAge:item.maximumAge})),old=oldAge.ages.map(item=>measure(`measure.ons.uk-age-${item.minimumAge}-mid-2024-v1`,'source.ons.uk-very-old-mid-2024-v1',item.series,item.value,{kind:'completed-age-band',minimumAge:item.minimumAge,maximumAge:item.maximumAge},item.roundingNote)),tail=measure('measure.ons.uk-age-105-plus-mid-2024-v1','source.ons.uk-very-old-mid-2024-v1','ukevo2024.csv:Persons:2024:age-105-plus',oldAge.openAge105Plus,{kind:'completed-age-band',minimumAge:105,maximumAge:null},'Provisional estimate rounded to the nearest 10 people; open-ended age category.');
  return withCalibrationFingerprint({
    schemaVersion:1,methodologyId:'population-calibration.method-v1',id:'uk.population.mid-2024.v1',countryId:'uk',effectiveDate:{...REFERENCE_DATE},coverageIntent:'complete',partition:{areaPartitionId:null,birthYearFrom:1919,birthYearThrough:2024},
    universes:[{id:'population.universe.uk-usual-residents-mid-2024-v1',description:USUAL_RESIDENT_UNIVERSE,exhaustive:true}],
    sources:[
      {version:1,id:'source.ons.uk-mye-mid-2024-v1',organisation:'Office for National Statistics',datasetId:'population-estimates-uk-constituent-countries',releaseId:'MYE24UK',title:'Population estimates for the UK, England, Wales, Scotland and Northern Ireland: mid-2024',referencePeriod:{from:{...REFERENCE_DATE},through:{...REFERENCE_DATE}},jurisdiction:'uk',publicationStatus:'final',bundledArtifact:MAIN_ARTIFACT_ID,externalLocator:artifact(MAIN_ARTIFACT_ID).sourceLocator,retrievedAt:{year:2026,month:9,day:24},methodologyNote:'Accredited official mid-year estimates using the usual-resident universe. Tables are unrounded for analysis but must not be treated as accurate to that precision.'},
      {version:1,id:'source.ons.uk-very-old-mid-2024-v1',organisation:'Office for National Statistics',datasetId:'mid-year-population-estimates-very-old-uk',releaseId:'UK-EVO-2002-2024',title:'Mid-year population estimates of the very old, including centenarians: UK',referencePeriod:{from:{...REFERENCE_DATE},through:{...REFERENCE_DATE}},jurisdiction:'uk',publicationStatus:'provisional',bundledArtifact:OLD_AGE_ARTIFACT_ID,externalLocator:artifact(OLD_AGE_ARTIFACT_ID).sourceLocator,retrievedAt:{year:2026,month:9,day:24},methodologyNote:'Provisional official estimates for ages 90 to 104 and the open 105+ group, rounded to the nearest 10 and revised when a later edition is produced.'},
    ],
    measures:[total,...young,...old,tail],derivedTotals:[],authority:{kind:'measure',id:total.id},distributionMeasureIds:[...young,...old,tail].map(item=>item.id),reconciliation:{kind:'exact'},ageConversion:{kind:'uniform-birthday-by-day'},generationProfileBindings:[{fromBirthYear:1919,throughBirthYear:2024,generationProfileId:'human.uk.pending-mid-2024-v1'}],
    gaps:[
      {id:'gap.uk.mid-2024.open-105-plus-v1',description:'Official very-old-age evidence retains an open 105+ category; no tail allocation is approved.',blocking:true},
      {id:'gap.uk.mid-2024.pre-1900-birth-years-v1',description:'The open 105+ category may include living people born before Population v1 minimum birth year 1900.',blocking:true},
      {id:'gap.uk.mid-2024.generation-profile-v1',description:'No approved production UK Person-generation profile resolves the candidate binding.',blocking:true},
      {id:'gap.uk.mid-2024.very-old-rounding-v1',description:`The rounded very-old-age 90+ total (${oldAge.publishedAge90Plus}) differs from the unrounded unified 90+ cell (${main.openAge90Plus}), and its rounded component cells need not sum to the rounded total; these differences are retained as disclosed precision metadata.`,blocking:false},
    ],
  });
}

export function createUkMid2024CalibrationPackageV2(main:OnsMid2024WorkbookEvidence,oldAge:OnsVeryOld2024Evidence):UkMid2024V2Calibration{
  if(main.releaseId!=='MYE24UK'||main.authoritativeTotal!=='69281437'||main.openAge90Plus!=='625236'||main.referenceDate.year!==2024||main.referenceDate.month!==6||main.referenceDate.day!==30||oldAge.referenceDate.year!==2024||oldAge.referenceDate.month!==6||oldAge.referenceDate.day!==30||oldAge.openAge105Plus!=='610'||oldAge.publishedAge90Plus!=='625240')throw Error('Invalid UK mid-2024 evidence for successor package.');
  const tail=compileUkOldAgeTail({referenceDate:{...REFERENCE_DATE},authoritative90Plus:Number(main.openAge90Plus),published90Plus:Number(oldAge.publishedAge90Plus),published105Plus:Number(oldAge.openAge105Plus),ages90To104:oldAge.ages.map(item=>({age:item.minimumAge,count:Number(item.value)})),sourceReleaseIds:['MYE24UK','UK-EVO-2002-2024']}),allAges=[...main.ages.map(item=>({age:item.minimumAge,count:Number(item.value)})),...tail.canonicalAges90To119],birthYears=allocateCompletedAgePopulationToBirthYears(REFERENCE_DATE,allAges),birthYearTotal=birthYears.reduce((sum,item)=>sum+item.count,0);
  if(birthYearTotal!==Number(main.authoritativeTotal)||birthYears[0]?.birthYear!==1906||birthYears.at(-1)?.birthYear!==2024)throw Error('UK mid-2024 successor birth-year allocation failed conservation.');
  const total=measure('measure.ons.uk-total-mid-2024-v1','source.ons.uk-mye-mid-2024-v1','MYE1!B9',main.authoritativeTotal,{kind:'total'}),modelSourceId='source.turning-pages.uk-old-age-tail-geometric-adjacent-v1',birthMeasures=birthYears.map(item=>({version:1,id:`measure.turning-pages.uk-birth-year-${item.birthYear}-mid-2024-v2`,sourceId:modelSourceId,series:`${UK_OLD_AGE_TAIL_MODEL_ID}:birth-year:${item.birthYear}`,semantic:'population-count' as const,unit:'persons' as const,referenceDate:{...REFERENCE_DATE},universeId:'population.universe.uk-usual-residents-mid-2024-v1',classification:'assumed' as const,dimensions:{kind:'birth-year' as const,birthYear:item.birthYear},value:String(item.count),uncertainty:'Canonical exact integer allocated from official estimated population evidence. It is calibrated simulation precision, not direct single-birth-year observation.',roundingNote:'Ages 90 to 104 and the open 105+ input are rounded; the 105 to 119 shape is assumed and the full 90+ vector is calibrated to the authoritative unrounded subtotal.'} satisfies PopulationMeasureV1));
  const packageValue=withCalibrationFingerprint({
    schemaVersion:1,methodologyId:'population-calibration.method-v1',id:'uk.population.mid-2024.v2',countryId:'uk',effectiveDate:{...REFERENCE_DATE},coverageIntent:'complete',partition:{areaPartitionId:null,birthYearFrom:1906,birthYearThrough:2024},
    universes:[{id:'population.universe.uk-usual-residents-mid-2024-v1',description:USUAL_RESIDENT_UNIVERSE,exhaustive:true}],
    sources:[
      {version:1,id:'source.ons.uk-mye-mid-2024-v1',organisation:'Office for National Statistics',datasetId:'population-estimates-uk-constituent-countries',releaseId:'MYE24UK',title:'Population estimates for the UK, England, Wales, Scotland and Northern Ireland: mid-2024',referencePeriod:{from:{...REFERENCE_DATE},through:{...REFERENCE_DATE}},jurisdiction:'uk',publicationStatus:'final',bundledArtifact:MAIN_ARTIFACT_ID,externalLocator:artifact(MAIN_ARTIFACT_ID).sourceLocator,retrievedAt:{year:2026,month:9,day:24},methodologyNote:'Accredited official mid-year estimates using the usual-resident universe. Tables are unrounded for analysis but must not be treated as accurate to that precision.'},
      {version:1,id:'source.ons.uk-very-old-mid-2024-v1',organisation:'Office for National Statistics',datasetId:'mid-year-population-estimates-very-old-uk',releaseId:'UK-EVO-2002-2024',title:'Mid-year population estimates of the very old, including centenarians: UK',referencePeriod:{from:{...REFERENCE_DATE},through:{...REFERENCE_DATE}},jurisdiction:'uk',publicationStatus:'provisional',bundledArtifact:OLD_AGE_ARTIFACT_ID,externalLocator:artifact(OLD_AGE_ARTIFACT_ID).sourceLocator,retrievedAt:{year:2026,month:9,day:24},methodologyNote:'Provisional official estimates for ages 90 to 104 and the open 105+ group, rounded to the nearest 10 and revised when a later edition is produced.'},
      {version:1,id:modelSourceId,organisation:'Turning Pages',datasetId:'uk-old-age-tail-calibration',releaseId:UK_OLD_AGE_TAIL_MODEL_ID,title:'UK mid-2024 closed old-age-tail calibration',referencePeriod:{from:{...REFERENCE_DATE},through:{...REFERENCE_DATE}},jurisdiction:'uk',publicationStatus:'experimental',methodologyNote:'Assumed within-total shape. Exact ratio r=(N101+N102+N103+N104)/(N100+N101+N102+N103)=933/1516; exact powers support ages 105-119; age 120 is the official-method terminal assumption; normalized tail weight is 610; all ages 90-119 reconcile by code-point age:090..age:119 largest remainder to 625236; birth years use uniform Gregorian birth-day weights. Exact output is calibrated and is not an ONS single-age estimate.'},
    ],
    measures:[total,...birthMeasures],derivedTotals:[],authority:{kind:'measure',id:total.id},distributionMeasureIds:birthMeasures.map(item=>item.id),reconciliation:{kind:'exact'},ageConversion:{kind:'direct-birth-year'},generationProfileBindings:[{fromBirthYear:1906,throughBirthYear:2024,generationProfileId:'human.uk.pending-mid-2024-v1'}],gaps:[],
  }),modelReport=immutable({version:1 as const,packageId:'uk.population.mid-2024.v2' as const,packageFingerprint:packageValue.fingerprint,modelId:UK_OLD_AGE_TAIL_MODEL_ID,evidenceSources:['MYE24UK','UK-EVO-2002-2024'],authoritativePopulation:Number(main.authoritativeTotal),authoritative90Plus:Number(main.openAge90Plus),fullBirthYearOutputs:birthYears,tail,demographicCoverage:'complete' as const,personGenerationReadiness:'not-ready' as const});
  return immutable({package:packageValue,modelReport});
}

export function renderUkMid2024V2ModelReport(report:UkMid2024V2ModelReport):string{
  return [`Package ${report.packageId} (${report.packageFingerprint})`,`Evidence releases: ${report.evidenceSources.join(', ')}`,`Authoritative UK total: ${report.authoritativePopulation}; authoritative 90+ total: ${report.authoritative90Plus}`,renderUkOldAgeTailReport(report.tail),`Full birth-year outputs: ${report.fullBirthYearOutputs.length}; range ${report.fullBirthYearOutputs[0]?.birthYear}-${report.fullBirthYearOutputs.at(-1)?.birthYear}`,`Demographic coverage: ${report.demographicCoverage}; Person-generation readiness: ${report.personGenerationReadiness}`].join('\n');
}

export const ONS_MID_2024_EVIDENCE_MANIFEST=immutable(MANIFEST);
export const ONS_MID_2024_PACKAGE_MANIFEST=immutable(packageManifestJson as Readonly<Record<string,string>>);
export const ONS_MID_2024_SUCCESSOR_PACKAGE_MANIFEST=immutable(successorPackageManifestJson as Readonly<Record<string,string>>);
export const ONS_MID_2024_UNIVERSE=USUAL_RESIDENT_UNIVERSE;
export const ONS_MID_2024_PACKAGE_ID='uk.population.mid-2024.v1' as const;
export const ONS_MID_2024_PACKAGE_V2_ID='uk.population.mid-2024.v2' as const;
export const ONS_MID_2024_PENDING_PROFILE_ID='human.uk.pending-mid-2024-v1' as const;

/** Bundled production semantics; source parsing and byte verification remain build/test concerns. */
export function loadUkMid2024ProductionPackage():PopulationCalibrationPackageV1{
 const value=immutable(structuredClone(compiledPackageV2Json) as unknown as PopulationCalibrationPackageV1),expected=ONS_MID_2024_SUCCESSOR_PACKAGE_MANIFEST[ONS_MID_2024_PACKAGE_V2_ID];
 if(expected!==value.fingerprint||!validatePopulationCalibrationPackage(value,ONS_MID_2024_SUCCESSOR_PACKAGE_MANIFEST))throw Error('UK production demographic package failed integrity validation.');return value;
}
