import type {PeopleState} from '../person';
import {initializeCompleteCountryPopulation,populationCohortId,type PopulationState} from '../population';
import {validatePopulationCalibrationPackage} from './package';
import type {CalibrationResult,PopulationCalibrationPackageV1} from './types';

export type CalibratedLivingMembership=Readonly<{personId:string;birthYear:number;areaId:string|null}>;

/** Applies only an already-compiled COMPLETE partition. Evidence and reports remain outside saves. */
export function initializePopulationFromCalibration(population:PopulationState,people:PeopleState,pkg:PopulationCalibrationPackageV1,result:CalibrationResult,livingMemberships:readonly CalibratedLivingMembership[]=[]):PopulationState{
 if(!validatePopulationCalibrationPackage(pkg)||result.coverage!=='complete'||result.report.grantedCoverage!=='complete'||result.generationReadiness!=='ready'||result.report.generationReadiness!=='ready'||result.report.packageId!==pkg.id||result.report.fingerprint!==pkg.fingerprint||result.report.countryId!==pkg.countryId)throw Error('Only a matching complete calibration that is generation-ready may initialize complete population coverage.');
 const allocations=result.cohorts.map(item=>({cohortId:populationCohortId(item),count:item.count}));
 if(result.report.finalCohortCount!==result.cohorts.length||result.report.finalCohortSum!==result.cohorts.reduce((sum,item)=>sum+item.count,0)||JSON.stringify(allocations)!==JSON.stringify(result.report.allocations))throw Error('Calibration result does not match its machine report.');
 const expected=new Map(result.report.membershipReservations.map(item=>[`${item.areaId??''}|${item.birthYear}`,item.count])),actual=new Map<string,number>(),seen=new Set<string>();
 for(const assignment of livingMemberships){const person=people.people.find(item=>item.id===assignment.personId),membership=population.memberships.find(item=>item.personId===assignment.personId);if(!person||person.lifeStatus!=='living'||person.dateOfBirth.year!==assignment.birthYear||!membership||membership.countryId!==pkg.countryId||membership.areaId!==assignment.areaId||seen.has(assignment.personId))throw Error('Calibrated living membership assignment is invalid.');seen.add(assignment.personId);const key=`${assignment.areaId??''}|${assignment.birthYear}`;actual.set(key,(actual.get(key)??0)+1);}
 if(seen.size!==result.report.livingMembershipReservations||expected.size!==actual.size||[...expected].some(([key,count])=>actual.get(key)!==count))throw Error('Calibrated living membership reservations do not match compilation.');
 for(const membership of population.memberships){const person=people.people.find(item=>item.id===membership.personId);if(person?.lifeStatus==='living'&&membership.countryId===pkg.countryId&&!seen.has(person.id))throw Error('Every living Person in the calibrated country must be reserved exactly once.');}
 return initializeCompleteCountryPopulation(population,people,{countryId:pkg.countryId,source:pkg.id,areaPartitionId:pkg.partition.areaPartitionId,cohorts:result.cohorts});
}
