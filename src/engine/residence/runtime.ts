import type {ResidenceId,ResidenceRecordV1,ResidenceStateV1} from './types';
import {codePointCompare,validResidenceState} from './validation';

export type ResidenceRuntime=Readonly<{
 state:ResidenceStateV1;
 getResidence:(residenceId:ResidenceId)=>ResidenceRecordV1|undefined;
 getResidencesForPerson:(personId:string)=>readonly ResidenceRecordV1[];
 getOccupantsForResidence:(residenceId:ResidenceId)=>readonly string[];
 hasNoFixedAbode:(personId:string)=>boolean;
 listResidences:()=>readonly ResidenceRecordV1[];
}>;

function freezeDeep(value:unknown):void{if(!value||typeof value!=='object'||Object.isFrozen(value))return;for(const key of Reflect.ownKeys(value)){const descriptor=Object.getOwnPropertyDescriptor(value,key);if(descriptor&&'value' in descriptor)freezeDeep(descriptor.value);}Object.freeze(value);}
function immutable<T>(value:T):T{const copy=structuredClone(value);freezeDeep(copy);return copy;}

/** Builds disposable closure-private indexes without decorating canonical Residence state. */
export function createResidenceRuntime(input:ResidenceStateV1):ResidenceRuntime{
 if(!validResidenceState(input))throw Error('Invalid Residence state.');const state=immutable(input),byId=new Map(state.residences.map(item=>[item.id,item])),byPerson=new Map<string,ResidenceRecordV1[]>(),occupantsByResidence=new Map<string,string[]>();
 for(const occupant of state.occupants){const residence=byId.get(occupant.residenceId)!;const homes=byPerson.get(occupant.personId)??[];homes.push(residence);byPerson.set(occupant.personId,homes);const people=occupantsByResidence.get(occupant.residenceId)??[];people.push(occupant.personId);occupantsByResidence.set(occupant.residenceId,people);}
 for(const homes of byPerson.values())homes.sort((a,b)=>a.sequence-b.sequence);for(const people of occupantsByResidence.values())people.sort(codePointCompare);const noFixed=new Set(state.noFixedAbodePersonIds);
 return Object.freeze({state,getResidence:(id)=>byId.get(id),getResidencesForPerson:(id)=>Object.freeze([...(byPerson.get(id)??[])]),getOccupantsForResidence:(id)=>Object.freeze([...(occupantsByResidence.get(id)??[])]),hasNoFixedAbode:(id)=>noFixed.has(id),listResidences:()=>Object.freeze([...state.residences])});
}
