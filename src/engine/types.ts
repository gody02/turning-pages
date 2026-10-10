// Application composition. Generic systems import core/model instead.
import type {LifeState} from './core/model';
import type {PoliticalCareer} from './politicsTypes';
import type {UKWorldState} from './ukWorld';
import type {PeopleState} from './human/person';
import type {PopulationState} from './human/population';
import type {ResidenceStateV1} from './residence/types';
import type {HouseholdStateV1} from './household/types';
import type {KinshipStateV1} from './kinship/types';
import type {PartnershipStateV1} from './partnership/types';
import type {FormalUnionStateV1} from './formalUnion/types';
export type * from './core/model';
export type * from './human/person';
export type HistoricalGame=Omit<LifeState,'version'> & {people?:PeopleState;population?:PopulationState;ukWorld?:UKWorldState;politics?:PoliticalCareer} & (
 | {version:1|2|3;residence?:never;household?:never}
 | {version:4;residence:ResidenceStateV1;household?:never}
);
export type GameV4=Extract<HistoricalGame,{version:4}>;
export type GameV5=Omit<GameV4,'version'|'people'|'population'|'household'> & {
 version:5;people:PeopleState;population:PopulationState;household:HouseholdStateV1;
};
export type GameV6=Omit<GameV5,'version'> & {version:6;kinship:KinshipStateV1};
export type GameV7=Omit<GameV6,'version'> & {version:7;partnership:PartnershipStateV1;formalUnion:FormalUnionStateV1};
export type Game=HistoricalGame|GameV5|GameV6|GameV7;
/** Frozen Country Start compatibility alias. Current application roots use CurrentAuthoritativeGame. */
export type CurrentGame=GameV4;
export type CurrentAuthoritativeGame=GameV7;
