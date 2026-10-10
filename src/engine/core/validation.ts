import type {LifeState} from './model';
import {countries,jobs} from '../../data/world';
import {events} from '../../data/events';
import {ageOn,completedMonthsBetween,isMonthPrecisionDate,isSimulationDate,monthsBetween} from './clock';
import {validRandomness} from './rng';
import {validScheduler} from './scheduler';
import {validHistory} from './history';
import {validPersonDisplayName} from '../shared/personDisplayName';
const record=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const num=(x:unknown,min=-1e12,max=1e12):x is number=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
const int=(x:unknown,min:number,max:number)=>num(x,min,max)&&Number.isInteger(x);
const str=(x:unknown,max=3000):x is string=>typeof x==='string'&&x.length<=max;
const scores=(x:unknown)=>record(x)&&Object.entries(x).every(([key,value])=>key.length>0&&key.length<=100&&num(value,0,100));
export function validLife(x:unknown):x is LifeState{
 if(!record(x)||(x.version!==1&&x.version!==2&&x.version!==3&&x.version!==4&&x.version!==5&&x.version!==6&&x.version!==7)||!validPersonDisplayName(x.name)||!str(x.gender,40)||!countries.some(c=>c.id===x.country))return false;
 if(!int(x.age,0,100)||typeof x.alive!=='boolean'||typeof x.retired!=='boolean'||!int(x.seed,0,4294967295)||!int(x.actions,0,3))return false;
 if(x.randomness!==undefined&&!validRandomness(x.randomness))return false;
 if(x.scheduler!==undefined&&!validScheduler(x.scheduler))return false;
 if(x.history!==undefined&&!validHistory(x.history,record(x.clock)&&x.clock.version===2&&isSimulationDate(x.clock.date)?x.clock.date:undefined))return false;
 if(!record(x.stats)||!['health','happiness','smarts','looks'].every(k=>num((x.stats as Record<string,unknown>)[k],0,100)))return false;
 if(!['money','earned','lastIncome','lastExpenses'].every(k=>num(x[k]))||!int(x.level,0,5)||!int(x.studyYears,0,3)||!int(x.jobYears,0,100))return false;
 if(!['preschool','school','secondary','university','degree'].includes(x.education as string)||!(x.job===null||jobs.some(j=>j.id===x.job)))return false;
 if(!(x.pending===null||events.some(e=>e.id===x.pending&&(x.age as number)>=e.min&&(x.age as number)<=e.max))||(!x.alive&&x.pending!==null))return false;
 if(x.cause!==undefined&&!str(x.cause))return false;
 if(!Array.isArray(x.seen)||!x.seen.every(id=>events.some(e=>e.id===id)))return false;
 if(!Array.isArray(x.relationships)||!x.relationships.every(r=>record(r)&&str(r.id)&&str(r.name)&&str(r.role)&&num(r.bond,0,100)&&(r.kind===undefined||['family','friend','professional'].includes(r.kind as string))))return false;
 if(!Array.isArray(x.journal)||!x.journal.every(e=>record(e)&&num(e.age,0,100)&&str(e.text)&&['milestone','event','action','finance'].includes(e.kind as string)))return false;
 let elapsed=(x.age as number)*12;
 if(x.clock!==undefined||x.dateOfBirth!==undefined){
  const c=x.clock;
  if(record(c)&&c.version===2){
   if(!isSimulationDate(c.date)||!isSimulationDate(x.dateOfBirth)||!['year','month'].includes(c.cadence as string))return false;
   elapsed=completedMonthsBetween(x.dateOfBirth,c.date);if(!int(elapsed,0,1211)||ageOn(x.dateOfBirth,c.date)!==x.age||(c.cadence==='year'&&elapsed%12!==0))return false;
  }else if(record(c)&&c.version===1){
   if(!isMonthPrecisionDate(c.date)||!isMonthPrecisionDate(x.dateOfBirth)||!['year','month'].includes(c.cadence as string))return false;
   elapsed=monthsBetween({...x.dateOfBirth,day:1},{...c.date,day:1});if(!int(elapsed,0,1211)||Math.floor(elapsed/12)!==x.age||(c.cadence==='year'&&elapsed%12!==0))return false;
  }else{
   if(x.dateOfBirth!==undefined||!record(c)||!int(c.monthOfYear,0,11)||!int(c.totalMonths,0,1211)||c.totalMonths!==(x.age as number)*12+(c.monthOfYear as number)||!['year','month'].includes(c.cadence as string)||(c.cadence==='year'&&c.monthOfYear!==0))return false;
   elapsed=c.totalMonths as number;
  }
 }
 if(x.finances!==undefined){const f=x.finances;if(!record(f)||!['lastIncome','lastExpenses','yearIncome','yearExpenses'].every(k=>num(f[k],0)))return false;}
 if(x.development!==undefined){const d=x.development;if(!record(d)||!num(d.fame,0,100)||!scores(d.skills)||!scores(d.reputation)||!Array.isArray(d.traits)||d.traits.length>1000||new Set(d.traits).size!==d.traits.length||!d.traits.every(t=>str(t,100)&&!!t))return false;}
 if(x.facts!==undefined&&(!Array.isArray(x.facts)||!x.facts.every(f=>record(f)&&str(f.id,200)&&str(f.source,100)&&str(f.kind,100)&&str(f.detail)&&Array.isArray(f.tags)&&f.tags.length<=50&&f.tags.every(t=>str(t,100))&&(f.atMonth===null||int(f.atMonth,0,elapsed)))))return false;
 return true;
}
