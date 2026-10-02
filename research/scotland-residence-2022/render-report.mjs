/** Text is rendered from the machine research report, not a second geographic aggregation. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const filename='UK-SCOTLAND-RESIDENCE-PLACEMENT-EVIDENCE-CHECK.json';
const raw=fs.readFileSync(path.join(root,filename));
const r=JSON.parse(raw.toString('utf8'));
const sum=r.populationTable.totalPublishedOaPopulation;
const number=n=>String(n).replace(/\B(?=(\d{3})+(?!\d))/g,',');
const percentage=(n,d)=>(100*n/d).toFixed(4)+'%';
const table=(head,rows)=>'\n| '+head.join(' | ')+' |\n| '+head.map(()=> '---').join(' | ')+' |\n'+rows.map(row=>'| '+row.map(v=>String(v).replaceAll('|','\\|')).join(' | ')+' |').join('\n')+'\n';
const localityName=code=>r.localities.find(l=>l.localityCode===code).productionDisplayName;
const councilName=code=>r.councils.find(c=>c.councilCode===code).displayName;
const cityReport=key=>{const city=r.stressCases.cities.find(c=>c.key===key),c=city.council;return `Joined council total **${number(c.population)}**. Principal **${number(city.majorLocality.populationInCouncil)}** (${percentage(city.majorLocality.populationInCouncil,c.population)}), other Localities **${number(city.otherLocalityPopulation)}**, outside Localities **${number(c.outsideLocalityPopulation)}** (${percentage(c.outsideLocalityPopulation,c.population)}). Whole matched principal Locality **${number(city.majorLocality.wholeMatchedLocalityPopulation)}**; do not reuse that whole count as a fragment.\n`+table(['Exact Locality code / Settlement ID','Production display name','Population in this council','Share of joined council'],c.fragments.map(f=>[f.localityCode+' / '+f.settlementId,localityName(f.localityCode),number(f.population),percentage(f.population,c.population)]));};
const islandReport=code=>{const c=r.stressCases.islands.find(c=>c.councilCode===code);return `Joined council total **${number(c.population)}**; **${c.fragments.length}** matched Localities; outside **${number(c.outsideLocalityPopulation)}** (${percentage(c.outsideLocalityPopulation,c.population)}). No final Residence precision or mass is approved.\n`+table(['Exact Locality / Settlement ID','Production display','Population','Share of council'],c.fragments.map(f=>[f.localityCode+' / '+f.settlementId,localityName(f.localityCode),number(f.population),percentage(f.population,c.population)]));};
const councTable=table(['Council / code','Frozen Place ID','Joined source total','Inside Localities','Outside Localities','Outside share','Qualified Localities'],r.councils.map(c=>[c.displayName+' / '+c.councilCode,c.placeId,number(c.population),number(c.insideLocalityPopulation),number(c.outsideLocalityPopulation),percentage(c.outsideLocalityPopulation,c.population),c.fragments.length]));
const crossingTable=table(['Locality / exact code / durable Settlement ID','Whole matched population','Exact council fragments','Conserved'],r.crossBoundaryLocalities.map(l=>[l.productionDisplayName+' / '+l.localityCode+' / '+l.settlementId,number(l.population),l.councilFragments.map(f=>councilName(f.councilCode)+' ('+f.placeId+'): '+number(f.population)).join('; '),'Yes']));
const ending='The narrow Scottish evidence check passes. The official 2022 Census Output\nArea usual-resident population table joins directly to the already-pinned\nScottish locality/council evidence without requiring another population series,\ngeometry or a new crosswalk. Area-qualified locality population and\noutside-locality residual population can therefore inform the Scottish portion\nof the UK Residence placement model. No production placement content was\nimplemented. The next task is UK initial Residence placement content numerical\napproval.';
const text=`# Narrow Scottish 2022 Output Area population compatibility check

**DECISION A — DIRECT EVIDENCE ROUTE PASSES. RESEARCH ONLY.** No production placement package, numerical weight approval, registration, generic schema change or Country Start/New Game change. This report is rendered from ${filename}.

## 1. Official source identified

National Records of Scotland, [2022 Census Geography Products](https://www.nrscotland.gov.uk/publications/2022-census-geography-products/), specifically **Output Area 2022 Total Population**. The page describes usual-resident population per2022 Output Area. Only its linked [official CSV](https://www.nrscotland.gov.uk/media/owpknvgk/outputarea2022_usualresidentpopulation.csv) was newly downloaded. No alternative population or geography series was obtained.

## 2. Release/reference/access dates

The source page labels this individual product **May2024**; no release day is asserted. Its current containing page is dated4November2024, which is distinct from the CSV's release label. Census reference day is **2022-03-20**; world compatibility remains **2024-06-30**. Original bytes downloaded/accessed **2026-10-02**. Publication/access/world dates do not replace observation/reference date.

## 3. Exact source bytes and SHA-256

Filename: **${r.source.filename}**. Byte length: **${number(r.source.byteLength)}**. SHA-256: **${r.source.sha256}**. Original response file retained unchanged at **${r.source.path}**. Research manifest records producer, locator, dates, licence and these integrity pins. Publication page supplies OGLv3.0; retain National Records of Scotland/Crown attribution. Existing index notices remain separate.

## 4. Population table schema

Exactly **OutputArea2022,UsualResidentPopulation**. OA code is OutputArea2022; population is UsualResidentPopulation. Strict parsing validates rectangular CSV, unique headers, canonical OA syntax and exact nonnegative decimal integer cells. No inferred sex, household, age or Settlement count field. Minimum **${r.populationTable.minimumPopulation}**, maximum **${number(r.populationTable.maximumPopulation)}**; every value and aggregate is safely representable. BigInt handles summation before safe-integer conversion.

## 5. OA row count

**${number(r.populationTable.rowCount)}** data rows, excluding header/final line terminator. The table is ordinary UTF-8 text; original bytes, line endings and header are preserved.

## 6. OA uniqueness/missingness

**${number(r.populationTable.uniqueOaCount)}** unique OA codes; **0** duplicates, missing/malformed OA codes, missing population cells, negative/fractional/unsafe values. The pinned index likewise has ${number(r.join.indexUniqueOaCount)} unique OA codes and no duplicate OA key. No blank data row was treated as a person or silently omitted.

## 7. Population total supplied by this table

Exact sum of the published OA cells: **${number(sum)}**. This is the quantity conserved in this research, not a newly acquired/reconciled independent national headline table and not2024 population. Do not replace frozen2024 Scotland population5,546,900 or UK69,281,437 with this source sum.

These are published census statistical counts, not raw enumerated-person truth. Official [census output metadata](https://www.scotlandscensus.gov.uk/documents/scotlands-census-2022-census-outputs-consultation/html) describes the census day/usual-residence basis and disclosure-control arrangements. Published nested-area sums need not reproduce separately published marginals. The product page/CSV does not specify this file's cell-level disclosure treatment; this check does not invent that explanation or fetch another population table. All reported council/Locality totals below are derived sums of these exact source cells, not separately published NRS council/Locality totals.

## 8. Pinned locality-index identity

Existing **${r.index.artifactId}**, source **${r.index.sourceId}**, at ${r.index.path}; **${number(r.index.byteLength)} bytes**, SHA-256 **${r.index.sha256}**. Fresh hash validation passed. Relevant ZIP members:
${table(['Member','Bytes','SHA-256'],r.index.members.map(m=>[m.path,number(m.byteLength),m.sha256]))}
The Locality lookup has656 unique code/name records. The council lookup has32 unique records. The frozen Settlement builder already constructs IDs from CensusLocality2022Code and uses OA CLOC2022/CA2019 to establish relations. Locality names use the frozen explicit Windows-1252 decoding; names are never join keys.

## 9. Direct-join key

**Population.OutputArea2022 === Index.OA2022**, exact unchanged ASCII code equality. The index directly supplies **CA2019**, **CLOC2022** and **CSETT2022**. Locality and council are parallel OA attributes, not a forced one-council-per-Locality chain. No fuzzy matching, name normalization, nearest-place, centroid, spatial operation or new crosswalk.

## 10. Vintage compatibility

Both population and Localities use Census2022. The existing council column is explicitly Council Area2019; all32 exact codes match the frozen2024 Geography council identity entries and allocation nodes. That proves code compatibility for these inputs, without pretending CA2019's vintage is2024. A future model would be **2022 Census-derived geographic weighting used inside mid-2024 world content**, not2024 Locality population or temporal modelling. [Official usual-resident metadata](https://www.scotlandscensus.gov.uk/documents/scotlands-census-2022-census-outputs-consultation/html) identifies20March2022 and includes usual residents beyond private-household arrangements; an ordinary-home initialization prior would remain a disclosed modelling abstraction.

## 11. Matched OA count

**${number(r.join.matchedRows)}** exact matches. Population and index OA code sets are equal. One-to-one OA matching is established before aggregation.

## 12. Unmatched OA count

**0** population OAs unmatched; **0** index OAs unmatched. Both complete mismatch lists are empty in the machine report. No unexplained non-trivial unmatched category.

## 13. Matched population

**${number(r.join.matchedPopulation)}**, exactly100% of the supplied table's population. This percentage describes join coverage, not residence accuracy or empirical2024 completeness.

## 14. Unmatched population

**0**. No missing code/count was interpreted as zero to obtain this result.

## 15. Locality-covered population

**${number(r.coverage.insideLocalityOaCount)}** OAs have a nonempty CLOC2022. Their cells sum to **${number(r.coverage.insideLocalityPopulation)}**. Every referenced code resolves through the pinned Locality lookup to the production package. The CSETT2022 grouping is retained as source context and is not converted into another Residence destination identity.

## 16. Outside-locality population

The index uses an **empty CLOC2022 string** for outside-Locality OAs. **${number(r.coverage.outsideLocalityOaCount)}** such OAs contain **${number(r.coverage.outsideLocalityPopulation)}** people, **${percentage(r.coverage.outsideLocalityPopulation,sum)}** of this table's sum. These still have exact council codes; no missing geographical assignment or inferred nearest Settlement is required. No invented positive residual.

## 17. Every council mapping and conservation

All32 exact council codes resolve through the already pinned Place continuity ledger to UK allocation-cell Places. Every council obeys Locality-qualified sum + outside-Locality sum = joined council sum. Shares below are presentation-only rounded diagnostics; exact numerators/denominators are in JSON.
${councTable}

## 18. Scotland-wide conservation

**${number(r.coverage.insideLocalityPopulation)} + ${number(r.coverage.outsideLocalityPopulation)} = ${number(sum)}**. Sum of all32 council totals also equals${number(sum)}. Every OA counted once, no loss/duplication, no rounded reconciliation, no forced match to2024 totals. Reverse population and index record orders rebuild the same exact aggregates; deterministic canonical report verification passes.

## 19. Production locality count

**656** Scottish production Settlements, all kind settlement.uk.nrs.census-locality, zero synthetic additions. Exact package **${r.dependencies.settlementPackageId}**, fingerprint **${r.dependencies.settlementFingerprint}**, artifact SHA-256 **${r.dependencies.settlementArtifactSha256}**. Frozen national package and authored England/Wales/NI proposals are untouched.

## 20. Exact production matches

**656/656**. Mapping follows the already frozen builder identity rule **settlement.uk.nrs-locality.<lowercase CensusLocality2022Code>**. The lowercasing formats a namespace identity from a source code; it is not fuzzy/name matching. Each ID resolves to UK identity, retained continuity entry, correct NRS source binding and production record. All **662** council-qualified fragments resolve exactly to frozen contained-by/intersects relations in the pinned partition.

## 21. Mapping failures

**0** unmatched Localities, duplicate mappings, ambiguous mappings or unresolved qualified relations. Machine report includes each empty failure list plus the full656-code mapping and662-fragment inventory. Display names are diagnostic only and never rescue a failed code.

## 22. 32-council mapping result

**32/32**, no failures. Frozen Geography partition **${r.dependencies.geographyPartitionId}**, fingerprint **${r.dependencies.geographyFingerprint}**. Source CA2019 codes match the existing officialCode/Place continuity entries; canonical country remains uk. Every target is an explicit populationAllocationCell. No council-country assignment is inferred from a Person or Settlement name.

## 23. Complete cross-boundary locality inventory

Six Localities appear in two councils each; 650 in one council. Thus656 unique Localities produce662 qualified fragments. Full code/Place identities:
${crossingTable}

## 24. Cross-boundary conservation

All six checks pass. Each whole matched Locality total equals its separately summed council pieces. Glasgow617,904 is617,728 in Glasgow City +176 in Renfrewshire; Dundee147,365 is146,638 in Dundee City +727 in Angus. No repeated whole count, inferred geometric split or ratio reconstruction. The source OA rows supply these pieces directly.

## 25. Zero-population cases and distribution

**0** zero-population OAs, **0** zero-population Locality fragments, **0** zero-matched production Localities. Every council has a positive outside residual. No epsilon mass or artificial positive count was introduced.

Whole-Locality minimum **${number(r.distribution.wholeLocalityPopulation.minimum)}**, median **${number(r.distribution.wholeLocalityPopulation.median.numerator/r.distribution.wholeLocalityPopulation.median.denominator)}**, maximum **${number(r.distribution.wholeLocalityPopulation.maximum)}**. Area-qualified fragment minimum **${r.distribution.qualifiedFragmentPopulation.minimum}**, median **4179/2 =2089.5**, maximum **${number(r.distribution.qualifiedFragmentPopulation.maximum)}**. The half-integer median is a descriptive statistic, never an individual count or candidate mass.

## 26. Glasgow City stress case

${cityReport('glasgow')}
The four available Localities are not equally represented in census cells. A uniform1/4 prior would radically differ from this source evidence. This is a diagnostic, not approval of a99.4939% Residence weight.

## 27. City of Edinburgh stress case

${cityReport('edinburgh')}
Uniform1/5 would radically understate the principal's share in this source snapshot. No replacement policy is emitted.

## 28. Aberdeen City stress case

${cityReport('aberdeen')}
Uniform1/7 is not a useful evidence-informed approximation to this source distribution. Both the other Localities and outside residual remain measurable.

## 29. Dundee City stress case

${cityReport('dundee')}
The two locality destinations must retain their exact council fragment identities; neither whole cross-boundary count belongs entirely to Dundee City.

## 30. Orkney Islands stress case

${islandReport('S12000023')}

## 31. Shetland Islands stress case

${islandReport('S12000027')}

## 32. Na h-Eileanan Siar stress case

${islandReport('S12000013')}
These residuals support reviewing mixed Settlement/admin precision instead of forcing everyone into a named Locality or making every island council exclusively coarse. The final choice belongs to numerical approval.

## 33. Admin-only residual compatibility

An administrative-area candidate can represent the measured outside-Locality residual within each exact council scope. All32 residuals are positive safe integers. This does not assert which village/address/home contains a Person and does not mean those residents have no home. No fallback or nearest Locality is needed. It is technically compatible evidence for possible coarse-destination mass, not an approved content decision.

## 34. Frozen generic-schema compatibility

No generic change is required. Existing scope:{version:1,partitionId,placeId}, Settlement-area location with the exact package/Settlement plus that same scope, and integer weight can encode a qualified prior. Existing administrative-area location can encode the outside residual. This offers **662** positive qualified Locality fragments and **32** positive administrative residuals, **694** possible candidates across32 scopes. All references and group totals have been checked from frozen content/schema constraints. No executable placement policy was constructed or registered during this check.

## 35. Provenance recommendation

Retain source counts separately as official2022 published census evidence. Exact OA grouping is derived aggregation. Any future mass must state **placement mass derived from2022 Census usual-resident OA aggregation**, used as a reviewed geographic prior for mid-2024-compatible authored initialization. It is not2024 Settlement population, demographic reassignment, private-household-only evidence, or a person's observed Residence. No new Population totals or uncertainty fields enter runtime state.

## 36. Exact counts as technical mass

Technically yes: every locality fragment/residual is positive and safe; group totals never exceed620,870. Literal count-valued masses preserve the source relative ratios without float conversion. A per-scope common-GCD reduction would preserve the same ratios with potentially smaller integers. These alternatives produce different literal semantics/fingerprints and keyed choices and therefore require an explicit content decision. Neither option is approved here; no arbitrary rounding, forced positivity or small-place smoothing is performed.

## 37. Additional population series

**None required or acquired.** No postcode,2011,mid-year,Data Zone,Settlement estimate or third-party population substituted. Read-only official metadata clarifies reference/source precision; it does not add another population input.

## 38. Additional crosswalk

**None.** Only the existing OA index, frozen Settlement builder/continuity and already pinned council-to-Place identity mapping are used. No manual geographic assignment or substantial vintage reconciliation.

## 39. Geometry

**None.** No coordinates, centroid, polygon, point-in-polygon, spatial join, boundary overlay or postcode approximation. The frozen index is sufficient.

## 40. Production-file changes

**Zero.** Aggregate SHA-256 of all src paths/bytes, sorted ordinally, is unchanged at **5a2c406a6b9d88902e3c8a407062ea07bf08bd71fef2cfd6cdee3daf66beb989**. Frozen domains, schemas, Population packages, Settlement artifact, Country Start and New Game remain unchanged. No placement registration or numerical approval.

## 41. Integrity gates and reproducibility

Allfour existing production content-integrity gates PASS: UK Human, administrative Geography, geographic Population and hybrid Settlement. Research SHA/schema/exact-key/identity/relation/conservation checks PASS. Reversed OA/index order matches canonical aggregate bytes. A repeat check-evidence.mjs --verify reproduces the research JSON exactly. No full Vitest/build/browser/simulation rerun is claimed for this research-only task.

## 42. Research artifacts

- ${r.source.path}: exact downloaded official bytes.
- research/scotland-residence-2022/source-manifest.json: research-only metadata and dependency hashes, no runtime registry.
- research/scotland-residence-2022/check-evidence.mjs: one-file exact-join/conservation verifier; --verify compares deterministic research output.
- research/scotland-residence-2022/render-report.mjs: renders text from this authoritative machine report.
- ${filename}: **${number(raw.length)} bytes**, SHA-256 **${crypto.createHash('sha256').update(raw).digest('hex')}**; all mappings, fragments, residuals, exact shares, zeros, checks and stress cases.
- UK-SCOTLAND-RESIDENCE-PLACEMENT-EVIDENCE-CHECK.md: this report. Project records updated to show compatibility passed, weights still unapproved.

## 43. Unresolved issues

No unresolved direct-join, mapping, conservation or frozen-schema blocker. Numerical approval still must choose raw/GCD masses or another explicitly reviewed transformation, retain the outside-locality option and evaluate how a2022 source prior is used in2024-compatible authored world design. Age-specific/Household/institutional placement is not supplied by this table. Source-cell disclosure precision and lack of a separately reconciled headline total remain stated limitations; neither requires broadening this successful bounded join.

England/Wales/NI authored proposals are unchanged. No Residence, Household, Housing, Presence, Country Start v3 or New Game integration is implemented. Existing saves remain untouched.

## 44. FINAL DECISION

**DECISION A — DIRECT EVIDENCE ROUTE PASSES.** Every requested compatibility condition passes using the sole new population artifact and already pinned locality/council evidence. Evidence compatibility is not numerical-content approval.

## 45. Exact NEXT TASK

**UK INITIAL RESIDENCE PLACEMENT CONTENT NUMERICAL APPROVAL.** Revisit the complete361-area proposed model using these662 Scottish fragments and32 outside-locality residuals. Explicitly approve source-to-relative-mass transformation, Scottish precision/city/island behavior and final immutable content rows. Keep all frozen schemas/packages untouched. Materialize/register production placement only in the later separately authorized implementation task, after numerical approval.

${ending}
`;
const output=path.join(root,'UK-SCOTLAND-RESIDENCE-PLACEMENT-EVIDENCE-CHECK.md');
const sourceManifest={version:1,status:'research-only-not-production-not-registered',source:r.source,index:r.index,productionDependencyPins:r.dependencies,researchResult:{filename,byteLength:raw.length,sha256:'sha256:'+crypto.createHash('sha256').update(raw).digest('hex')},attribution:'Contains National Records of Scotland information licensed under the Open Government Licence v3.0. Crown copyright. The existing geographic index retains its separately recorded attribution/PAF notices.'};
if(process.argv.includes('--verify')){if(fs.readFileSync(output,'utf8')!==text||fs.readFileSync(path.join(root,'research/scotland-residence-2022/source-manifest.json'),'utf8')!==JSON.stringify(sourceManifest,null,2)+'\n')throw Error('Rendered research outputs differ');}
else{fs.writeFileSync(output,text);fs.writeFileSync(path.join(root,'research/scotland-residence-2022/source-manifest.json'),JSON.stringify(sourceManifest,null,2)+'\n');}
console.log('Human report/manifest '+(process.argv.includes('--verify')?'verified':'written')+'; '+Buffer.byteLength(text)+' Markdown bytes.');
