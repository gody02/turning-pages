import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join,resolve} from 'node:path';
import {strFromU8,unzipSync} from 'fflate';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const content=join(root,'src','data','human','uk','generation');
const demography=join(root,'src','data','demography','uk','ons-mid-2024');
const artifacts=join(content,'artifacts');
const expected=[
 {id:'artifact.ons.ew-historical-1904-2024-v1',filename:'ons-historical-names-1904-2024.xlsx',size:52780,sha256:'c51916592a67bdfbe7171da69414080386f1cb599814b7393217a0947afd0688'},
 {id:'artifact.ons.ew-annual-1996-2024-v1',filename:'ons-baby-names-1996-2024.xlsx',size:11363277,sha256:'8be2715a9e79e12576aff795ad1eee0b36cac9636134039b4adb232367c28859'},
 {id:'artifact.nrs.baby-names-1974-2024-v1',filename:'nrs-baby-names-1974-2024.zip',size:380223,sha256:'458761e293b27429faa2816988ed086f7476121524945f46ef464f23265b05d7'},
 {id:'artifact.nisra.baby-names-1997-2024-v1',filename:'nisra-baby-names-1997-2024.xlsx',size:4812967,sha256:'294ab007810241dfe8f33eda166c98dd91a4f7ccdddd751416492bba436ba627'},
];
const compiled={filename:'compiled-given-names.json',size:604548,sha256:'6211c987c52441183ce99ba392b76fa292396c5314bdef1502dad660cbbafe25'};
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=message=>{throw new Error(`UK Human content integrity failure: ${message}`);};
const requireFile=(path,size,sha256)=>{const bytes=readFileSync(path);if(bytes.byteLength!==size||digest(bytes)!==sha256)fail(path);return new Uint8Array(bytes);};
const workbook=(bytes)=>{const files=unzipSync(bytes),xml=files['xl/workbook.xml'];if(!xml)fail('workbook.xml missing');const text=strFromU8(xml),sheets=[...text.matchAll(/<sheet\b[^>]*\bname="([^"]+)"[^>]*\/>/g)].map(match=>match[1]),shared=files['xl/sharedStrings.xml']?strFromU8(files['xl/sharedStrings.xml']):'';return {files,sheets,shared};};

const manifest=JSON.parse(readFileSync(join(content,'source-manifest.json'),'utf8'));
if(manifest.version!==1||manifest.bundleId!=='evidence.uk-human-names-2024-v1'||manifest.artifacts.length!==expected.length)fail('source manifest identity');
for(const item of expected){
 const declared=manifest.artifacts.find(candidate=>candidate.id===item.id);if(!declared||declared.filename!==item.filename||declared.size!==item.size||declared.sha256!==item.sha256)fail(`source manifest entry ${item.id}`);
 const bytes=requireFile(join(artifacts,item.filename),item.size,item.sha256);
 if(item.id==='artifact.nrs.baby-names-1974-2024-v1'){
  const files=unzipSync(bytes);if(Object.keys(files).sort().join('|')!=='full-list-1974-2024.csv|metadata.csv')fail('NRS archive members');
  const csv=new TextDecoder('windows-1252').decode(files['full-list-1974-2024.csv']),metadata=new TextDecoder('windows-1252').decode(files['metadata.csv']);
  if(!csv.startsWith('Year,Sex,Name,Number,Rank')||!metadata.includes('1974 to 2024')||!metadata.includes('count of 2 or less'))fail('NRS schema markers');
 }else {const book=workbook(bytes);if(item.id==='artifact.ons.ew-historical-1904-2024-v1'){
  if(book.sheets.join('|')!=='Cover_sheet|Contents|Notes|Table_1|Table_2'||!book.shared.includes('Top 100 names for baby girls at 10-yearly intervals, 1904 to 2024')||!book.shared.includes('Top 100 names for baby boys at 10-yearly intervals, 1904 to 2024'))fail('ONS historical schema markers');
 }else if(item.id==='artifact.ons.ew-annual-1996-2024-v1'){
  if(book.sheets.slice(0,5).join('|')!=='Cover_sheet|Contents|Notes|Table_1|Table_2'||!book.shared.includes('Names for baby girls England and Wales, 1996 to 2024')||!book.shared.includes('2024 Count')||!book.shared.includes('1996 Count'))fail('ONS annual schema markers');
 }else if(item.id==='artifact.nisra.baby-names-1997-2024-v1'){
  if(book.sheets.join('|')!=='Cover sheet|Definitions|Contents|Table 1|Table 2|Table 3|Table 4'||!book.shared.includes('Full List of First Forenames Given to Baby Boys Registered in Northern Ireland, 1997 to 2024')||!book.shared.includes('Full List of First Forenames Given to Baby Girls Registered in Northern Ireland, 1997 to 2024'))fail('NISRA schema markers');
 }}
}
requireFile(join(content,compiled.filename),compiled.size,compiled.sha256);
const packageManifest=JSON.parse(readFileSync(join(content,'package-manifest.json'),'utf8'));
if(Object.keys(packageManifest).join('|')!=='human-content.uk.mid-2024-v1'||packageManifest['human-content.uk.mid-2024-v1']!=='fnv1a64-v1:595ae6cfea24c49d')fail('package manifest');
const populationBytes=requireFile(join(demography,'compiled-package-v2.json'),131959,'053a809849cd71fddded00eeee0dcfa7d39959f7a506e700e57385ae7765de52');
const population=JSON.parse(new TextDecoder().decode(populationBytes)),populationManifest=JSON.parse(readFileSync(join(demography,'successor-package-manifest.json'),'utf8'));
if(population.id!=='uk.population.mid-2024.v2'||population.fingerprint!=='fnv1a64-v1:a43f874fe1fab27f'||populationManifest[population.id]!==population.fingerprint)fail('compiled UK population package');
console.log('UK production content integrity verified: naming evidence, Human content and compiled population package.');
