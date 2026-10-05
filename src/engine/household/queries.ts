import type {HouseholdId,HouseholdPersonId,HouseholdRecordV1,HouseholdStateV1} from './types';
import {validHouseholdState} from './validation';

function ownQuery(state:HouseholdStateV1,id:unknown,prefix:'person:'|'household:'):HouseholdStateV1{
  try{
    if(!validHouseholdState(state)||typeof id!=='string'||id.length>prefix.length+16||!id.startsWith(prefix)||! /^[1-9]\d*$/.test(id.slice(prefix.length))||!Number.isSafeInteger(Number(id.slice(prefix.length)))||id!==prefix+String(Number(id.slice(prefix.length))))throw Error();
    return structuredClone(state);
  }catch{throw Error('Invalid Household query.');}
}
const ownedRecords=(records:readonly HouseholdRecordV1[]):readonly HouseholdRecordV1[]=>Object.freeze(records.map(item=>Object.freeze({id:item.id,sequence:item.sequence})));

export function getHousehold(state:HouseholdStateV1,householdId:HouseholdId):HouseholdRecordV1|undefined{
  const record=ownQuery(state,householdId,'household:').households.find(item=>item.id===householdId);
  return record?Object.freeze({id:record.id,sequence:record.sequence}):undefined;
}
export function getPersonHouseholds(state:HouseholdStateV1,personId:HouseholdPersonId):readonly HouseholdRecordV1[]{
  const owned=ownQuery(state,personId,'person:'),ids=new Set(owned.memberships.filter(item=>item.personId===personId).map(item=>item.householdId));
  return ownedRecords(owned.households.filter(item=>ids.has(item.id)));
}
export function getHouseholdMembers(state:HouseholdStateV1,householdId:HouseholdId):readonly HouseholdPersonId[]{
  const owned=ownQuery(state,householdId,'household:');
  return Object.freeze(owned.memberships.filter(item=>item.householdId===householdId).map(item=>item.personId));
}
