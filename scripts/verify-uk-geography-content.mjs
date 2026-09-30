import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const root=process.cwd(),content=join(root,'src','data','geography','uk','primary-local-admin-2024'),artifacts=join(content,'artifacts');
const expectedArtifacts=[
 ['ons-lad-may-2024-attributes.json',29265,'a0dc2a30f66a87e9c12156ca37cbba6e726d8fa3ff166066381717d50954414c'],
 ['ons-lad-may-2024-item.json',4862,'8bc3a4e2ec1bc43f86e9afd3dfc8aae500b16db4e39130847e8a127310e52908'],
 ['ons-lad-may-2024-layer.json',13451,'e2ff820533c7bd4b168cf015a5c244b4c44ace5ee889d60c78a11161487238c9'],
 ['ons-myeb-local-authorities-mid-2024.xlsx',47036552,'321f27261c9cf110ea44ca10d198580ec3969bc1171c780cba5596184df9b04d'],
];
const expectedCompiled=[
 ['build-report.json',1990,'3cd232227cdeafe0743563ed331f24a0d29a9b940f5efa7b5f378245ac53fe32'],
 ['compiled-partition.json',154934,'c7c542f874e334cfcf3bd59a0fda21fdba107d5360d403a417e865bfe3d35740'],
 ['continuity-ledger.json',118911,'dc981695a7efebd291b2211f410c3a1f970613585f2b681edf4e67b416c66023'],
 ['normalized-local-authorities.json',118397,'c234fb73287901692987905c9ad24d6de5b91cfef110080b9600df878ac7925b'],
 ['package-manifest.json',89,'ddb3ebafa1e0b5c00c891c75b133690e79b8dd80456456bc9cd04c5dfab1d90d'],
 ['place-identities.json',33715,'fd5482ff7d4bda8020ccf093852fc34f7f3ecd71a9036d1fa4463017b9a95d38'],
 ['place-manifest.json',43647,'6aeb6bcc4efa673b73ac4e31dc426ccd36c68720740a381f46c40e76be0ec9b0'],
 ['population-area-index.json',41568,'ecc05c582d26e99aa4b3d555980a8a80156a39b4c612d31575148eb44187854c'],
 ['source-manifest.json',4093,'4148fa0e9df412928a946f3dcdefb429296fba37d64b9256d42b09e3753cf502'],
];
const fail=value=>{throw Error(`UK Geography content integrity failure: ${value}.`);};
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const requireFile=(base,[filename,size,sha256])=>{const bytes=readFileSync(join(base,filename));if(bytes.byteLength!==size||digest(bytes)!==sha256)fail(filename);return bytes;};
for(const item of expectedArtifacts)requireFile(artifacts,item);
for(const item of expectedCompiled)requireFile(content,item);
const source=JSON.parse(readFileSync(join(content,'source-manifest.json'),'utf8'));
for(const [filename,size,sha256] of expectedArtifacts){const entry=source.artifacts.find(item=>item.filename===filename);if(!entry||entry.size!==size||entry.sha256!==sha256)fail(`source manifest ${filename}`);}
const partition=JSON.parse(readFileSync(join(content,'compiled-partition.json'),'utf8')),places=JSON.parse(readFileSync(join(content,'place-identities.json'),'utf8')),placeManifest=JSON.parse(readFileSync(join(content,'place-manifest.json'),'utf8')),continuity=JSON.parse(readFileSync(join(content,'continuity-ledger.json'),'utf8')),report=JSON.parse(readFileSync(join(content,'build-report.json'),'utf8')),manifest=JSON.parse(readFileSync(join(content,'package-manifest.json'),'utf8'));
if(partition.partitionId!=='geography.uk.primary-local-admin-2024-06-30-v1'||partition.fingerprint!=='fnv1a64-v1:3d1a3446a16c58cb'||manifest[partition.partitionId]!==partition.fingerprint)fail('partition manifest');
if(places.places.length!==366||placeManifest.entries.length!==366||continuity.entries.length!==361||partition.nodes.length!==366||partition.nodes.filter(item=>item.populationAllocationCell).length!==361)fail('inventory');
if(report.partitionFingerprint!==partition.fingerprint||report.continuityLedgerFingerprint!==continuity.fingerprint||report.placeManifestFingerprint!==placeManifest.fingerprint||report.populationWorkbookComparison.codeSetEqual!==true)fail('build report');
console.log(`UK Geography content verified: ${partition.partitionId} ${partition.fingerprint}; ${partition.nodes.length} nodes, ${report.allocationCellCount} allocation cells.`);
