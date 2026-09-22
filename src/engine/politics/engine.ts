import type {LifeState} from '../core/model';
import type {SimulationModule} from '../core/contracts';
/** Country modules implement this contract; the registry contains only implemented systems. */
export interface PoliticalSystem<T extends LifeState>{id:string;country:string;active:(g:T)=>boolean;hooks:SimulationModule<T>}
export function activePoliticalSystems<T extends LifeState>(g:T,systems:readonly PoliticalSystem<T>[]){return systems.filter(s=>s.country===g.country&&s.active(g));}
