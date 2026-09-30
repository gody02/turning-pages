import {strFromU8,unzipSync} from 'fflate';
import {createHumanGenerationContentRegistry,withHumanGenerationContentFingerprint} from '../../../../engine/human/content/package';
import {resolveHumanGenerationProfile} from '../../../../engine/human/content/resolver';
import type {GivenNameBand,HumanGenerationContentPackageV1,HumanGenerationContentRegistry,NamingSourceDescriptorV1} from '../../../../engine/human/content/types';
import {generatePersonInput} from '../../../../engine/human/generation';
import compiledJson from './compiled-given-names.json';
import familyJson from './family-name-prior.json';
import familyReviewJson from './family-name-review.json';
import packageManifestJson from './package-manifest.json';
import sourceManifestJson from './source-manifest.json';

export const UK_HUMAN_CONTENT_PACKAGE_ID='human-content.uk.mid-2024-v1' as const;
export const UK_HUMAN_CONTENT_PROFILE_ID='human.uk.pending-mid-2024-v1' as const;

export type UkNamingArtifact=Readonly<{
 id:string;producer:string;publication:string;releaseId:string;publicationDate:string;filename:string;mediaType:string;size:number;sha256:string;
 coveredYears:Readonly<{from:number;through:number}>;jurisdiction:string;registrationUniverse:string;sexRegistrationCategories:readonly string[];
 suppression:string;cleaning:string;status:string;sourceLocator:string;intendedBands:string;
}>;
export type UkNamingEvidenceManifest=Readonly<{version:1;bundleId:string;retrievalDate:string;licence:string;licenceLocator:string;artifacts:readonly UkNamingArtifact[]}>;
export type UkHumanGenerationDiagnostics=Readonly<{
 version:1;packageId:string;profileId:string;bands:readonly Readonly<{id:string;birthYearFrom:number;birthYearThrough:number;mode:string;entryCount:number;totalWeight:number;longestName:string;longestCodePoints:number;samples:readonly Readonly<{personId:string;name:string}>[]}>[];
 familyNameCount:number;longestFamilyName:string;longestFamilyNameCodePoints:number;publishedNamedMass:Readonly<Record<string,Readonly<Record<string,number>>>>;
 selectedNamedMass:Readonly<Record<string,number>>;modernMass:Readonly<Record<string,Readonly<{totalRegistrationMass:null;publishedNamedMass:number;selectedNamedMass:number;publishedPositiveCountOmittedMass:number;suppressedMass:'unknown'}>>>;unrepresentedMass:string;normalization:string;
}>;

const SOURCE_MANIFEST=sourceManifestJson as UkNamingEvidenceManifest;
const PACKAGE_MANIFEST=packageManifestJson as Readonly<Record<string,string>>;
const COMPILED=compiledJson as Readonly<{version:1;normalization:string;bands:readonly GivenNameBand[];diagnostics:Readonly<{publishedNamedMass:Readonly<Record<string,Readonly<Record<string,number>>>>;selectedNamedMass:Readonly<Record<string,number>>;maximumNamesPerBand:number;unrepresentedMass:string}>}>;
const FAMILY=familyJson as Readonly<{version:1;id:string;classification:string;reviewId:string;names:readonly string[];limitations:readonly string[]}>;
const FAMILY_REVIEW=familyReviewJson as Readonly<{version:1;id:string;status:string;classification:string;scope:string;checks:Readonly<Record<string,string>>;approvalNote:string;reviewedOn:string}>;
const codePointCompare=(left:string,right:string)=>left<right?-1:left>right?1:0;
const stable=(value:string)=>/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(value)&&value.includes('.')&&value.length<=160;
const immutable=<T>(value:T):T=>{const copy=structuredClone(value);const freeze=(item:unknown):void=>{if(!item||typeof item!=='object'||Object.isFrozen(item))return;for(const key of Reflect.ownKeys(item)){const descriptor=Object.getOwnPropertyDescriptor(item,key);if(descriptor&&'value' in descriptor)freeze(descriptor.value);}Object.freeze(item);};freeze(copy);return copy;};
const points=(value:string)=>[...value].length;

function artifact(id:string):UkNamingArtifact{const value=SOURCE_MANIFEST.artifacts.find(item=>item.id===id);if(!value)throw Error('UK naming evidence manifest is missing a required artifact.');return value;}
function hex(bytes:ArrayBuffer):string{return [...new Uint8Array(bytes)].map(value=>value.toString(16).padStart(2,'0')).join('');}
export async function sha256(bytes:Uint8Array):Promise<string>{return hex(await crypto.subtle.digest('SHA-256',bytes.slice().buffer));}

export function validateUkNamingEvidenceManifest(value:unknown):value is UkNamingEvidenceManifest{
 try{
  if(value!==SOURCE_MANIFEST||SOURCE_MANIFEST.version!==1||SOURCE_MANIFEST.bundleId!=='evidence.uk-human-names-2024-v1'||SOURCE_MANIFEST.retrievalDate!=='2026-09-24'||SOURCE_MANIFEST.licence!=='Open Government Licence v3.0'||SOURCE_MANIFEST.artifacts.length!==4)return false;
  const ids=SOURCE_MANIFEST.artifacts.map(item=>item.id);if(new Set(ids).size!==ids.length)return false;
  return SOURCE_MANIFEST.artifacts.every(item=>stable(item.id)&&/^\d{4}-\d{2}-\d{2}$/.test(item.publicationDate)&&Number.isSafeInteger(item.size)&&item.size>0&&/^[0-9a-f]{64}$/.test(item.sha256)&&item.coveredYears.from>=1&&item.coveredYears.through>=item.coveredYears.from&&item.sexRegistrationCategories.length===2&&item.sourceLocator.startsWith('https://'));
 }catch{return false;}
}

export async function verifyUkNamingArtifact(bytes:Uint8Array,id:string):Promise<UkNamingArtifact>{
 if(!(bytes instanceof Uint8Array)||!validateUkNamingEvidenceManifest(SOURCE_MANIFEST))throw Error('Invalid UK naming artifact request.');const expected=artifact(id);
 if(bytes.byteLength!==expected.size||await sha256(bytes)!==expected.sha256)throw Error(`UK naming artifact failed integrity validation: ${expected.filename}.`);return immutable(expected);
}

function workbookText(files:Readonly<Record<string,Uint8Array>>,path:string):string{const value=files[path];if(!value)throw Error(`Workbook is missing ${path}.`);return strFromU8(value);}
function workbookSheetNames(files:Readonly<Record<string,Uint8Array>>):readonly string[]{return [...workbookText(files,'xl/workbook.xml').matchAll(/<sheet\b[^>]*\bname="([^"]+)"[^>]*\/>/g)].map(match=>match[1]);}
function workbookStrings(files:Readonly<Record<string,Uint8Array>>):string{const value=files['xl/sharedStrings.xml'];return value?strFromU8(value):'';}
/** Hashes first, then checks the pinned release's container and workbook markers. */
export async function validateUkNamingArtifactSchema(bytes:Uint8Array,id:string):Promise<boolean>{
 try{
  await verifyUkNamingArtifact(bytes,id);const files=unzipSync(bytes);
  if(id==='artifact.nrs.baby-names-1974-2024-v1'){
   if(Object.keys(files).sort(codePointCompare).join('|')!=='full-list-1974-2024.csv|metadata.csv')return false;
   const csv=new TextDecoder('windows-1252').decode(files['full-list-1974-2024.csv']),metadata=new TextDecoder('windows-1252').decode(files['metadata.csv']);return csv.startsWith('Year,Sex,Name,Number,Rank')&&metadata.includes('1974 to 2024')&&metadata.includes('count of 2 or less');
  }
  const sheets=workbookSheetNames(files),strings=workbookStrings(files);
  if(id==='artifact.ons.ew-historical-1904-2024-v1')return sheets.join('|')==='Cover_sheet|Contents|Notes|Table_1|Table_2'&&strings.includes('Top 100 names for baby girls at 10-yearly intervals, 1904 to 2024')&&strings.includes('Top 100 names for baby boys at 10-yearly intervals, 1904 to 2024');
  if(id==='artifact.ons.ew-annual-1996-2024-v1')return sheets.slice(0,5).join('|')==='Cover_sheet|Contents|Notes|Table_1|Table_2'&&strings.includes('Names for baby girls England and Wales, 1996 to 2024')&&strings.includes('2024 Count')&&strings.includes('1996 Count');
  if(id==='artifact.nisra.baby-names-1997-2024-v1')return sheets.join('|')==='Cover sheet|Definitions|Contents|Table 1|Table 2|Table 3|Table 4'&&strings.includes('Full List of First Forenames Given to Baby Boys Registered in Northern Ireland, 1997 to 2024')&&strings.includes('Full List of First Forenames Given to Baby Girls Registered in Northern Ireland, 1997 to 2024');
  return false;
 }catch{return false;}
}

function validateAuthoredFamilyPrior():void{
 if(FAMILY.version!==1||FAMILY.id!=='human-content.uk.family-authored-v1'||FAMILY.classification!=='authored-gameplay-abstraction'||FAMILY.reviewId!==FAMILY_REVIEW.id||FAMILY_REVIEW.status!=='approved'||FAMILY_REVIEW.classification!=='authored-gameplay-abstraction')throw Error('Invalid UK authored family-name prior.');
 if(!Array.isArray(FAMILY.names)||FAMILY.names.length<100||new Set(FAMILY.names).size!==FAMILY.names.length||FAMILY.names.some(name=>typeof name!=='string'||!name.trim()||name!==name.normalize('NFC')))throw Error('Invalid UK authored family-name entries.');
 const checks=['normalizedDuplicates','placeholders','offensiveOrTestContent','unicode','personDisplayName','breadth','similarEntries','codePointLengths','licensingContamination'];if(checks.some(key=>FAMILY_REVIEW.checks[key]!=='pass'))throw Error('UK authored family-name review is incomplete.');
}

function namingSources():readonly NamingSourceDescriptorV1[]{
 const byId=(id:string)=>artifact(id);
 const sources:NamingSourceDescriptorV1[]=[
  {version:1,id:'names.nisra.ni-1997-2024-v1',producer:byId('artifact.nisra.baby-names-1997-2024-v1').producer,datasetId:'nisra.full-names-list-1997-2024',releaseId:'nisra-baby-names-2024',title:'Full Names List, 1997 to 2024',jurisdiction:'northern-ireland',coveredBirthYears:{from:1997,through:2024},contentUniverse:byId('artifact.nisra.baby-names-1997-2024-v1').registrationUniverse,classification:'observed',suppressionPolicy:byId('artifact.nisra.baby-names-1997-2024-v1').suppression,transformation:byId('artifact.nisra.baby-names-1997-2024-v1').cleaning,licence:SOURCE_MANIFEST.licence,bundledArtifact:{id:'artifact.nisra.baby-names-1997-2024-v1',sha256:`sha256:${byId('artifact.nisra.baby-names-1997-2024-v1').sha256}`},externalLocator:byId('artifact.nisra.baby-names-1997-2024-v1').sourceLocator,methodology:'Registration-year first-forename counts; registration-sex categories are content metadata and are summed before gender-neutral profile construction.',limitations:['Counts below three are suppressed.','The registration universe is not the same concept as the mid-year usual-resident population universe.']},
  {version:1,id:'names.nrs.scotland-1974-2024-v1',producer:byId('artifact.nrs.baby-names-1974-2024-v1').producer,datasetId:'nrs.full-list-1974-2024',releaseId:'nrs-babies-first-names-2024',title:'All names given to babies between 1974 and 2024',jurisdiction:'scotland',coveredBirthYears:{from:1996,through:2024},contentUniverse:byId('artifact.nrs.baby-names-1974-2024-v1').registrationUniverse,classification:'observed',suppressionPolicy:byId('artifact.nrs.baby-names-1974-2024-v1').suppression,transformation:byId('artifact.nrs.baby-names-1974-2024-v1').cleaning,licence:SOURCE_MANIFEST.licence,bundledArtifact:{id:'artifact.nrs.baby-names-1974-2024-v1',sha256:`sha256:${byId('artifact.nrs.baby-names-1974-2024-v1').sha256}`},externalLocator:byId('artifact.nrs.baby-names-1974-2024-v1').sourceLocator,methodology:'Registration first-forename counts. NRS source processing ignores accents and proper-cases display forms; the package does not reverse or extend those transformations.',limitations:['Counts of two or fewer are suppressed.','The registration universe is not the same concept as the mid-year usual-resident population universe.']},
  {version:1,id:'names.ons.ew-annual-1996-2024-v1',producer:byId('artifact.ons.ew-annual-1996-2024-v1').producer,datasetId:'ons.baby-names-from-1996',releaseId:'ons-baby-names-1996-2024',title:'Baby names in England and Wales: from 1996',jurisdiction:'england-wales',coveredBirthYears:{from:1996,through:2024},contentUniverse:byId('artifact.ons.ew-annual-1996-2024-v1').registrationUniverse,classification:'observed',suppressionPolicy:byId('artifact.ons.ew-annual-1996-2024-v1').suppression,transformation:byId('artifact.ons.ew-annual-1996-2024-v1').cleaning,licence:SOURCE_MANIFEST.licence,bundledArtifact:{id:'artifact.ons.ew-annual-1996-2024-v1',sha256:`sha256:${byId('artifact.ons.ew-annual-1996-2024-v1').sha256}`},externalLocator:byId('artifact.ons.ew-annual-1996-2024-v1').sourceLocator,methodology:'Annual birth-registration first-name counts. Exact spellings are separate; registration-sex categories are summed for a gender-neutral generation profile.',limitations:['Counts below three in a registration-sex category are suppressed.','The registration universe is not the same concept as the mid-year usual-resident population universe.']},
  {version:1,id:'names.ons.ew-historical-1904-2024-v1',producer:byId('artifact.ons.ew-historical-1904-2024-v1').producer,datasetId:'ons.top-100-historical-names',releaseId:'ons-historical-names-1904-2024',title:'Top 100 baby names in England and Wales: historical data',jurisdiction:'england-wales',coveredBirthYears:{from:1906,through:1995},contentUniverse:byId('artifact.ons.ew-historical-1904-2024-v1').registrationUniverse,classification:'observed',suppressionPolicy:byId('artifact.ons.ew-historical-1904-2024-v1').suppression,transformation:'Published support from 1904-1994 decennial tables is mapped to approved midpoint birth-year windows; ranks are discarded and every supported display name receives authored weight 1.',licence:SOURCE_MANIFEST.licence,bundledArtifact:{id:'artifact.ons.ew-historical-1904-2024-v1',sha256:`sha256:${byId('artifact.ons.ew-historical-1904-2024-v1').sha256}`},externalLocator:byId('artifact.ons.ew-historical-1904-2024-v1').sourceLocator,methodology:'The official artifact establishes top-100 inclusion only for pre-1996 years. The package treats inclusion as support evidence and does not reconstruct frequencies from ranks.',limitations:['Historical evidence is England-and-Wales only and contains no counts.','Names outside each published top 100 remain unrepresented; coverage mass is unknown.']},
 ];return sources.sort((a,b)=>codePointCompare(a.id,b.id));
}

export function createUkHumanGenerationContentPackage():HumanGenerationContentPackageV1{
 if(!validateUkNamingEvidenceManifest(SOURCE_MANIFEST)||COMPILED.version!==1||COMPILED.bands.length!==17||COMPILED.diagnostics.maximumNamesPerBand!==250)throw Error('Invalid compiled UK given-name content.');validateAuthoredFamilyPrior();
 const familyEntries=FAMILY.names.map((text,index)=>({id:`human-name.uk.family.${String(index+1).padStart(3,'0')}-v1`,text,weight:1}));
 return withHumanGenerationContentFingerprint({version:1,compilerId:'human-generation-content.compiler-v1',id:UK_HUMAN_CONTENT_PACKAGE_ID,countryId:'uk',effectiveDate:{year:2024,month:6,day:30},profileId:UK_HUMAN_CONTENT_PROFILE_ID,sources:namingSources(),givenNameBands:COMPILED.bands,familyNames:{kind:'reviewed-authored',classification:'authored-gameplay-abstraction',review:{id:FAMILY_REVIEW.id,status:'approved',note:FAMILY_REVIEW.approvalNote},entries:familyEntries,limitations:FAMILY.limitations},genderPolicy:{kind:'fixed',label:'Unspecified'},intrinsicPolicy:{traits:[],temperament:[],aptitudes:[]},limitations:['Naming content supplies identity-facing display text only and makes no claim about demographic membership, sex, gender identity, ancestry, ethnicity, religion, citizenship, geography, temperament, aptitude, or traits.','Historical support windows use equal authored weights; modern windows use selected published registration counts and omit suppressed and lower-count names.','The current given-name plus family-name display composition is sufficient for this UK v1 package but is not a universal naming ontology.'],gaps:[]});
}

export function createUkHumanGenerationContentRegistry():HumanGenerationContentRegistry{
 const content=createUkHumanGenerationContentPackage(),expected=PACKAGE_MANIFEST[content.id];if(expected!==content.fingerprint)throw Error('UK Human generation content manifest mismatch.');return createHumanGenerationContentRegistry([content],[{packageId:content.id,fingerprint:expected}]);
}

export function ukHumanGenerationDiagnostics():UkHumanGenerationDiagnostics{
 validateAuthoredFamilyPrior();const content=createUkHumanGenerationContentPackage(),families=content.familyNames.entries;
 const bands=content.givenNameBands.map((band,bandIndex)=>{const longest=[...band.entries].sort((a,b)=>points(b.text)-points(a.text)||codePointCompare(a.id,b.id))[0],profile=resolveHumanGenerationProfile(content,band.birthYearFrom),samples=[0,1,2].map(sampleIndex=>{const sequence=900000+bandIndex*3+sampleIndex,identity={id:`person:${sequence}`,sequence},person=generatePersonInput(2024,identity,{version:1,requestKey:`human-content.uk-diagnostic.${bandIndex}-${sampleIndex}-v1`,source:'human-content.uk-diagnostic-v1',referenceDate:{year:2024,month:6,day:30},countryId:'uk',birth:{kind:'exact',date:{year:band.birthYearFrom,month:1,day:1}},namingProfileId:content.profileId,gender:{kind:'profile'}},profile);return {personId:identity.id,name:person.name};});return {id:band.id,birthYearFrom:band.birthYearFrom,birthYearThrough:band.birthYearThrough,mode:band.mode,entryCount:band.entries.length,totalWeight:band.entries.reduce((sum,item)=>sum+item.weight,0),longestName:longest.text,longestCodePoints:points(longest.text),samples};});
 const modernMass=Object.fromEntries(Object.entries(COMPILED.diagnostics.publishedNamedMass).map(([window,bySource])=>{const publishedNamedMass=Object.values(bySource).reduce((sum,value)=>sum+value,0),selectedNamedMass=COMPILED.diagnostics.selectedNamedMass[window];if(!Number.isSafeInteger(publishedNamedMass)||!Number.isSafeInteger(selectedNamedMass)||selectedNamedMass<0||selectedNamedMass>publishedNamedMass)throw Error('Invalid UK naming mass diagnostics.');return [window,{totalRegistrationMass:null,publishedNamedMass,selectedNamedMass,publishedPositiveCountOmittedMass:publishedNamedMass-selectedNamedMass,suppressedMass:'unknown' as const}];}));
 const longestFamily=[...families].sort((a,b)=>points(b.text)-points(a.text)||codePointCompare(a.id,b.id))[0];return immutable({version:1,packageId:content.id,profileId:content.profileId,bands,familyNameCount:families.length,longestFamilyName:longestFamily.text,longestFamilyNameCodePoints:points(longestFamily.text),publishedNamedMass:COMPILED.diagnostics.publishedNamedMass,selectedNamedMass:COMPILED.diagnostics.selectedNamedMass,modernMass,unrepresentedMass:COMPILED.diagnostics.unrepresentedMass,normalization:COMPILED.normalization});
}

export const UK_NAMING_EVIDENCE_MANIFEST=SOURCE_MANIFEST;
export const UK_HUMAN_CONTENT_PACKAGE_MANIFEST=PACKAGE_MANIFEST;
