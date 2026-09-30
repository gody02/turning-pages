/** UK national simulation ownership. No political-career or transition implementation is imported here. */
import type {NationalState} from './politics/uk/national';

export type UKWorldState={version:1;country:'uk';national:NationalState};

export function createUKWorld(national:NationalState):UKWorldState{
 return {version:1,country:'uk',national};
}

export function validUKWorld(value:unknown,validateNational:(value:unknown,month:number)=>boolean):value is UKWorldState{
 if(!value||typeof value!=='object')return false;
 const v=value as Partial<UKWorldState>;
 return v.version===1&&v.country==='uk'&&!!v.national&&validateNational(v.national,v.national.month);
}

/** Reuse the established national transition exactly once per elapsed world month. */
export function advanceUKWorldMonth(world:UKWorldState,transition:(state:NationalState,playerGoverns:boolean)=>NationalState,playerGoverns=false):UKWorldState{
 return {...world,national:transition(world.national,playerGoverns)};
}
