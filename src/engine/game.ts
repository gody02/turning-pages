// Stable public facade for existing callers. Generic implementations live below the composition root.
export {createGame,adultStart,ageUp,advanceTime,advanceMonth,act,actionReason,choose} from './simulation';
export {statKeys,averageStats} from './systems/character';
export {countryOf} from './systems/geography';
export {jobOf,salary} from './systems/careers';
