// Application composition. Generic systems import core/model instead.
import type {LifeState} from './core/model';
import type {PoliticalCareer} from './politicsTypes';
import type {UKWorldState} from './ukWorld';
import type {PeopleState} from './human/person';
import type {PopulationState} from './human/population';
import type {ResidenceStateV1} from './residence/types';
export type * from './core/model';
export type * from './human/person';
export type Game=LifeState & {people?:PeopleState;population?:PopulationState;ukWorld?:UKWorldState;politics?:PoliticalCareer} & (
 | {version:1|2|3;residence?:never}
 | {version:4;residence:ResidenceStateV1}
);
export type CurrentGame=Extract<Game,{version:4}>;
