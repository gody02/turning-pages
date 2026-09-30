import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {createRandomness} from '../../../../engine/core/rng';
import {compilePopulationCalibration,renderPopulationCalibrationReport} from '../../../../engine/human/calibration/compiler';
import {initializePopulationFromCalibration} from '../../../../engine/human/calibration/integration';
import {validateCalibrationRegistry} from '../../../../engine/human/calibration/package';
import {createPlayerPopulation} from '../../../../engine/human/population';
import {createPeople} from '../../../../engine/human/person';
import {
  ONS_MID_2024_EVIDENCE_MANIFEST,
  ONS_MID_2024_PACKAGE_ID,
  ONS_MID_2024_PACKAGE_V2_ID,
  ONS_MID_2024_PACKAGE_MANIFEST,
  ONS_MID_2024_SUCCESSOR_PACKAGE_MANIFEST,
  ONS_MID_2024_PENDING_PROFILE_ID,
  adaptOnsMid2024Workbook,
  adaptOnsVeryOld2024Csv,
  createUkMid2024CalibrationPackage,
  createUkMid2024CalibrationPackageV2,
  loadUkMid2024ProductionPackage,
  renderUkMid2024V2ModelReport,
  sha256,
  validateOnsMid2024Manifest,
  verifyOnsArtifact,
} from './adapter';

const bytes=(name:string)=>new Uint8Array(readFileSync(new URL(name,import.meta.url)));
const workbook=()=>bytes('./mye24tablesuk.xlsx');
const veryOld=()=>bytes('./ukevo2024.csv');

describe('pinned ONS mid-2024 evidence',()=>{
  it('validates the deterministic source manifest and all pinned byte identities',async()=>{
    expect(validateOnsMid2024Manifest(ONS_MID_2024_EVIDENCE_MANIFEST)).toBe(true);
    for(const artifact of ONS_MID_2024_EVIDENCE_MANIFEST.artifacts){
      const data=bytes(`./${artifact.filename}`);
      expect(data.byteLength).toBe(artifact.size);
      expect(await sha256(data)).toBe(artifact.sha256);
      await expect(verifyOnsArtifact(data,artifact.id)).resolves.toEqual(artifact);
    }
  });

  it('rejects wrong or altered artifacts before parsing any workbook content',async()=>{
    const altered=workbook();altered[altered.length-1]^=1;
    await expect(adaptOnsMid2024Workbook(altered)).rejects.toThrow('integrity validation');
    await expect(adaptOnsMid2024Workbook(veryOld())).rejects.toThrow('integrity validation');
  });

  it('strictly extracts the approved MYE1 and MYE2 Persons cells from release MYE24UK',async()=>{
    const result=await adaptOnsMid2024Workbook(workbook());
    expect(result.releaseId).toBe('MYE24UK');
    expect(result.referenceDate).toEqual({year:2024,month:6,day:30});
    expect(result.authoritativeTotal).toBe('69281437');
    expect(result.ageSum).toBe(result.authoritativeTotal);
    expect(result.ages).toHaveLength(90);
    expect(result.ages[0]).toMatchObject({minimumAge:0,maximumAge:0,value:'667994',series:'MYE2 - Persons!E9'});
    expect(result.ages[89]).toMatchObject({minimumAge:89,maximumAge:89,value:'167231',series:'MYE2 - Persons!CP9'});
    expect(result.openAge90Plus).toBe('625236');
    expect(result.constituentTotals).toEqual({englandAndWales:'61806682',scotland:'5546900',northernIreland:'1927855'});
  });

  it('strictly extracts rounded provisional ages 90 to 104 and preserves the open 105+ tail',async()=>{
    const result=await adaptOnsVeryOld2024Csv(veryOld());
    expect(result.ages).toHaveLength(15);
    expect(result.ages[0]).toMatchObject({minimumAge:90,maximumAge:90,value:'136960'});
    expect(result.ages[14]).toMatchObject({minimumAge:104,maximumAge:104,value:'890'});
    expect(result.openAge105Plus).toBe('610');
    expect(result.closedAgeSum).toBe('624640');
    expect(result.publishedAge90Plus).toBe('625240');
    expect(result.ages.every(item=>item.roundingNote?.includes('nearest 10'))).toBe(true);
  });
});

describe('UK mid-2024 candidate package',()=>{
  it('normalizes official evidence without replacing the unified total or hiding source precision',async()=>{
    const main=await adaptOnsMid2024Workbook(workbook()),oldAge=await adaptOnsVeryOld2024Csv(veryOld()),pkg=createUkMid2024CalibrationPackage(main,oldAge);
    expect(pkg.id).toBe(ONS_MID_2024_PACKAGE_ID);
    expect(pkg.effectiveDate).toEqual({year:2024,month:6,day:30});
    expect(pkg.measures).toHaveLength(107);
    expect(pkg.measures.find(item=>item.id==='measure.ons.uk-total-mid-2024-v1')?.value).toBe('69281437');
    expect(pkg.measures.find(item=>item.id==='measure.ons.uk-age-90-mid-2024-v1')).toMatchObject({value:'136960',classification:'estimated',roundingNote:expect.stringContaining('nearest 10')});
    expect(pkg.measures.find(item=>item.id==='measure.ons.uk-age-105-plus-mid-2024-v1')?.dimensions).toEqual({kind:'completed-age-band',minimumAge:105,maximumAge:null});
    expect(pkg.sources.map(item=>item.bundledArtifact)).toEqual(['artifact.ons.mye24uk-workbook-v1','artifact.ons.ukevo2024-csv-v1']);
    expect(pkg.universes[0].description).toContain('whatever their nationality');
  });

  it('has immutable package identity and deterministic compilation independent of input reuse',async()=>{
    const main=await adaptOnsMid2024Workbook(workbook()),oldAge=await adaptOnsVeryOld2024Csv(veryOld()),first=createUkMid2024CalibrationPackage(main,oldAge),second=createUkMid2024CalibrationPackage(main,oldAge);
    expect(first).toEqual(second);expect(first.fingerprint).toBe('fnv1a64-v1:0ef6dda53a4ef2f4');expect(Object.isFrozen(first.measures)).toBe(true);
    expect(validateCalibrationRegistry([first],ONS_MID_2024_PACKAGE_MANIFEST)).toBe(true);
    expect(validateCalibrationRegistry([{...first,gaps:[...first.gaps,{id:'gap.changed-v1',description:'Changed.',blocking:true}]}],ONS_MID_2024_PACKAGE_MANIFEST)).toBe(false);
  });

  it('compiles deterministically to a truthful partial result with exact blockers and no invented tail',async()=>{
    const main=await adaptOnsMid2024Workbook(workbook()),oldAge=await adaptOnsVeryOld2024Csv(veryOld()),pkg=createUkMid2024CalibrationPackage(main,oldAge),randomness=createRandomness(27),before=structuredClone(randomness),clock={year:2024,month:6,day:30};
    const compile=()=>compilePopulationCalibration(pkg,{profileExists:id=>id===ONS_MID_2024_PENDING_PROFILE_ID});
    const first=compile(),second=compile();
    expect(first).toEqual(second);expect(first.coverage).toBe('partial');expect(first.cohorts).toHaveLength(106);expect(first.report.finalCohortSum).toBe(69280841);
    expect(first.report.authoritativeTotal.value).toBe(69281437);expect(first.report.absoluteDiscrepancy).toBe('596');expect(first.report.unsupportedCategories).toEqual(['open-ended-age-band']);
    expect(first.report.gaps.map(item=>item.id)).toEqual(expect.arrayContaining(['gap.uk.mid-2024.open-105-plus-v1','gap.uk.mid-2024.pre-1900-birth-years-v1','gap.uk.mid-2024.generation-profile-v1']));
    expect(first.report.completenessDenialReasons.join(' ')).toContain('Open-ended');expect(renderPopulationCalibrationReport(first.report)).toContain('granted partial');
    expect(randomness).toEqual(before);expect(clock).toEqual({year:2024,month:6,day:30});
  });

  it('does not permit partial evidence to initialize complete PopulationState or enter saves',async()=>{
    const main=await adaptOnsMid2024Workbook(workbook()),oldAge=await adaptOnsVeryOld2024Csv(veryOld()),pkg=createUkMid2024CalibrationPackage(main,oldAge),result=compilePopulationCalibration(pkg,{profileExists:id=>id===ONS_MID_2024_PENDING_PROFILE_ID});
    const people=createPeople({name:'Evidence Player',dateOfBirth:{year:2000,month:1,day:1},genderLabel:'Person',lifeStatus:'living',traits:[],temperament:{},aptitudes:{}}),population=createPlayerPopulation(people,'uk');
    expect(()=>initializePopulationFromCalibration(population,people,pkg,result,[{personId:people.playerId,birthYear:2000,areaId:null}])).toThrow('matching complete calibration');
    expect(population.coverage[0].source).not.toBe(pkg.id);expect(JSON.stringify(population)).not.toContain(pkg.fingerprint);
  });
});

describe('UK mid-2024 immutable successor package',()=>{
  it('closes the modeled tail, emits conserved birth-year cohorts and preserves v1 identity',async()=>{
    const main=await adaptOnsMid2024Workbook(workbook()),oldAge=await adaptOnsVeryOld2024Csv(veryOld()),v1=createUkMid2024CalibrationPackage(main,oldAge),successor=createUkMid2024CalibrationPackageV2(main,oldAge),pkg=successor.package;
    expect(v1.fingerprint).toBe('fnv1a64-v1:0ef6dda53a4ef2f4');
    expect(pkg.id).toBe(ONS_MID_2024_PACKAGE_V2_ID);
    expect(pkg.fingerprint).not.toBe(v1.fingerprint);
    expect(pkg.partition).toEqual({areaPartitionId:null,birthYearFrom:1906,birthYearThrough:2024});
    expect(pkg.gaps).toEqual([]);
    expect(pkg.measures.filter(item=>item.dimensions.kind==='birth-year')).toHaveLength(119);
    expect(successor.modelReport.tail.canonicalTail105To119.map(item=>item.count)).toEqual([235,144,89,55,34,21,13,8,5,3,2,1,1,0,0]);
    expect(successor.modelReport.tail.canonical90PlusTotal).toBe(625236);
    expect(successor.modelReport.fullBirthYearOutputs.reduce((sum,item)=>sum+item.count,0)).toBe(69281437);
    expect(successor.modelReport.fullBirthYearOutputs[0].birthYear).toBe(1906);
    expect(successor.modelReport.fullBirthYearOutputs.at(-1)?.birthYear).toBe(2024);
    expect(renderUkMid2024V2ModelReport(successor.modelReport)).toContain('Person-generation readiness: not-ready');
    expect(loadUkMid2024ProductionPackage()).toEqual(pkg);
  });

  it('grants demographic COMPLETE independently of unresolved production generation content',async()=>{
    const main=await adaptOnsMid2024Workbook(workbook()),oldAge=await adaptOnsVeryOld2024Csv(veryOld()),{package:pkg}=createUkMid2024CalibrationPackageV2(main,oldAge),result=compilePopulationCalibration(pkg,{profileExists:()=>false});
    expect(result.coverage).toBe('complete');
    expect(result.report.grantedCoverage).toBe('complete');
    expect(result.generationReadiness).toBe('not-ready');
    expect(result.report.generationReadiness).toBe('not-ready');
    expect(result.report.finalCohortSum).toBe(69281437);
    expect(result.cohorts).toHaveLength(119);
    expect(renderPopulationCalibrationReport(result.report)).toContain('Person-generation readiness: not-ready');
    const people=createPeople({name:'Evidence Player',dateOfBirth:{year:2000,month:1,day:1},genderLabel:'Person',lifeStatus:'living',traits:[],temperament:{},aptitudes:{}}),population=createPlayerPopulation(people,'uk');
    expect(()=>initializePopulationFromCalibration(population,people,pkg,result)).toThrow('generation-ready');
  });

  it('initializes complete Population only when generation content resolves and membership is reserved',async()=>{
    const main=await adaptOnsMid2024Workbook(workbook()),oldAge=await adaptOnsVeryOld2024Csv(veryOld()),{package:pkg}=createUkMid2024CalibrationPackageV2(main,oldAge),people=createPeople({name:'Evidence Player',dateOfBirth:{year:2000,month:1,day:1},genderLabel:'Person',lifeStatus:'living',traits:[],temperament:{},aptitudes:{}}),population=createPlayerPopulation(people,'uk'),result=compilePopulationCalibration(pkg,{profileExists:id=>id===ONS_MID_2024_PENDING_PROFILE_ID,livingMemberships:[{birthYear:2000,areaId:null,count:1}]});
    expect(result.generationReadiness).toBe('ready');expect(result.report.finalCohortSum+result.report.livingMembershipReservations).toBe(69281437);
    const initialized=initializePopulationFromCalibration(population,people,pkg,result,[{personId:people.playerId,birthYear:2000,areaId:null}]);
    expect(initialized.coverage).toEqual([{countryId:'uk',status:'complete',source:pkg.id,areaPartitionId:null}]);
    expect(initialized.cohorts.reduce((sum,item)=>sum+item.count,0)+1).toBe(69281437);
  });

  it('registers both immutable package identities and fingerprints material successor semantics',async()=>{
    const main=await adaptOnsMid2024Workbook(workbook()),oldAge=await adaptOnsVeryOld2024Csv(veryOld()),v1=createUkMid2024CalibrationPackage(main,oldAge),v2=createUkMid2024CalibrationPackageV2(main,oldAge).package;
    const registry={...ONS_MID_2024_PACKAGE_MANIFEST,...ONS_MID_2024_SUCCESSOR_PACKAGE_MANIFEST};
    expect(validateCalibrationRegistry([v1,v2],registry)).toBe(true);
    const modelSource=v2.sources.find(item=>item.releaseId==='uk-old-age-tail.geometric-adjacent-v1')!;
    const changed={...v2,sources:v2.sources.map(item=>item.id===modelSource.id?{...item,methodologyNote:`${item.methodologyNote} changed`}:item)};
    expect(validateCalibrationRegistry([v1,changed],registry)).toBe(false);
  });
});

describe('UK evidence adapter dependency boundary',()=>{
  const sources=import.meta.glob<string>(['./adapter.ts'],{eager:true,query:'?raw',import:'default'});
  it('keeps country content outside generic calibration and has no React, politics, mutable RNG, or wall-clock dependency',()=>{for(const [path,source] of Object.entries(sources)){expect(source,path).not.toMatch(/from\s+['"][^'"]*(?:react|politics|ukWorld|national|institutions)/);expect(source,path).not.toMatch(/Math\.random|Date\.now/);}});
});
