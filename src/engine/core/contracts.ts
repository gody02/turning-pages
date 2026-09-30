import type {Action,LifeState} from './model';
import type {DomainEventHandler} from './domainEvents';
import type {FinanceTerms} from '../systems/finance';
/** Feature hooks operate on a transaction draft; only the life engine owns the clock and settlement. */
export interface SimulationModule<T extends LifeState>{
 id:string;
 pending?:(g:T)=>string|null;
 prepare?:(g:T)=>void;
 restrictAction?:(g:T,action:Action)=>string|null;
 afterAction?:(g:T,action:Action)=>void;
 /** Explicit, deterministic contributions; the coordinator supplies selected modules. */
 domainEventHandlers?:readonly DomainEventHandler<T>[];
 beforeMonth?:(g:T)=>void;
 finance?:(g:T)=>FinanceTerms;
 onMonth?:(g:T,previous:Readonly<T>)=>void;
 afterBirthday?:(g:T)=>void;
 afterMonth?:(g:T)=>void;
 onDeath?:(g:T)=>void;
}
