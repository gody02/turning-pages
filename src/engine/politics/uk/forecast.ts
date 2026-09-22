import {projectPaths,percentileBand as band} from '../../systems/projections';
import {advanceNational,validBudget,type NationalState} from './national';
import {scenarioRisks,type RiskId} from '../../../data/institutions';
import type {Budget} from '../../../data/national';
import {ensureInstitutions} from './institutions';
export type ForecastPoint={month:number;growth:number[];inflation:number[];unemployment:number[];debt:number[];credit:number[]};
export type Forecast={at:number;horizon:number;samples:number;risk:RiskId;points:ForecastPoint[];draft:Budget};
export function forecast(source:NationalState,budget:Budget,risk:RiskId='baseline',horizon=24,samples=24):Forecast{
 if(!validBudget(budget)||![12,24,36].includes(horizon)||samples<4||samples>40||!Number.isInteger(samples))throw Error('Invalid forecast request');
 const scenario=scenarioRisks.find(s=>s.id===risk);if(!scenario)throw Error('Unknown scenario');
 type Metrics={growth:number;inflation:number;unemployment:number;debt:number;credit:number};
 const paths=projectPaths<NationalState,Metrics>(source,{horizon,samples,prepare:n=>{n.budget=structuredClone(budget);
  n.energy=Math.max(.55,Math.min(2.5,n.energy+scenario.energy));n.foreignDemand=Math.max(.6,Math.min(1.5,n.foreignDemand+scenario.demand));n.confidence=Math.max(5,n.confidence+scenario.confidence);
  if(risk==='credit'){const institutions=ensureInstitutions(n);for(const bank of institutions.banks){const losses=(bank.mortgages+bank.business)*.04;bank.mortgages*=.96;bank.business*=.96;bank.equity-=losses;bank.arrears=Math.min(20,bank.arrears+5);const withdrawal=Math.min(bank.reserves*.8,bank.deposits*.1);bank.reserves-=withdrawal;bank.deposits-=withdrawal;institutions.cashOutside+=withdrawal;}}
 },advance:n=>{const next=advanceNational(n,true);next.history=next.history.slice(-1);next.divisions=[];return next;},observe:n=>({growth:n.growth,inflation:n.inflation,unemployment:n.unemployment,debt:n.debt,credit:n.institutions?.credit??1})});
 return {at:source.month,horizon,samples,risk,draft:structuredClone(budget),points:Array.from({length:horizon},(_,m)=>({month:source.month+m+1,growth:band(paths.map(p=>p[m].growth)),inflation:band(paths.map(p=>p[m].inflation)),unemployment:band(paths.map(p=>p[m].unemployment)),debt:band(paths.map(p=>p[m].debt)),credit:band(paths.map(p=>p[m].credit))}))};
}
