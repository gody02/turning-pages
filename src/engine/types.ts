// Application composition. Generic systems import core/model instead.
import type {LifeState} from './core/model';
import type {PoliticalCareer} from './politicsTypes';
export type * from './core/model';
export type Game=LifeState & {politics?:PoliticalCareer};
