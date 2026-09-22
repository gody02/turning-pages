import type { PoliticalCareer } from './politicsTypes';
import { parties, doctrines, politicalEvents, bills, roleNames } from '../../../data/politics';
import { townPolicies } from '../../../data/town';
import { validTown } from './constituencySave';
import { validNational } from './nationalSave';
const rec=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const n=(v:unknown,min=0,max=1e12):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const int=(v:unknown,min=0,max=1200)=>n(v,min,max)&&Number.isInteger(v);
export function validPolitics(v:unknown,age:number,country:string):v is PoliticalCareer{
  if(!rec(v)||v.version!==1||v.active!==true||country!=='uk'||!int(v.startAge,18,99)||!int(v.months)||(v.startMonth!==undefined&&!int(v.startMonth,0,11))||age!==(v.startAge as number)+Math.floor(((v.startMonth as number??0)+(v.months as number))/12))return false;
  if(!parties.some(p=>p.id===v.party)||!doctrines.some(d=>d.id===v.doctrine)||!Object.hasOwn(roleNames,v.role as string))return false;
  if(!['reputation','integrity','organisation','knowledge','caucus','unions','enterprise','support'].every(k=>n(v[k],0,100)))return false;
  if(!['campaignFunds','lastIncome','lastExpenses','yearIncome','yearExpenses'].every(k=>n(v[k])))return false;
  if(![null,'council','parliament'].includes(v.candidacy as null)||!int(v.seats,0,650)||typeof v.inGovernment!=='boolean'||v.inGovernment!==((v.seats as number)>=326))return false;
  if(v.pending!==null&&!politicalEvents.some(e=>e.id===v.pending))return false;
  if(!Array.isArray(v.seen)||v.seen.length>1201||!v.seen.every(id=>politicalEvents.some(e=>e.id===id)))return false;
  if(!Array.isArray(v.memories)||v.memories.length>2000||!v.memories.every(m=>typeof m==='string'&&m.length<1000))return false;
  if(v.motion!==null&&!townPolicies.some(p=>p.id===v.motion))return false;
  const bill=v.bill;
  if(bill!==null&&(!rec(bill)||!bills.some(b=>b.id===bill.id)||!int(bill.stage,0,3)||!int(bill.lastAdvanced,0,v.months as number)))return false;
  if(!Array.isArray(v.laws)||new Set(v.laws).size!==v.laws.length||!v.laws.every(id=>bills.some(b=>b.id===id)))return false;
  if(!validTown(v.economy,1200)||v.economy.month!==v.months)return false;
  if(v.national!==undefined&&!validNational(v.national,v.months as number))return false;
  if(!Array.isArray(v.log)||v.log.length>20000||!v.log.every(l=>rec(l)&&int(l.month,0,v.months as number)&&typeof l.text==='string'&&l.text.length<3000))return false;
  if(!Array.isArray(v.elections)||v.elections.length>100||!v.elections.every(e=>rec(e)&&int(e.month,1,v.months as number)&&['council','parliament'].includes(e.kind as string)&&typeof e.won==='boolean'&&int(e.seats,0,650)&&Array.isArray(e.votes)&&e.votes.length===4&&e.votes.every(x=>int(x,0,20000))&&e.votes.reduce((a:number,b:number)=>a+b,0)===20000))return false;
  return true;
}
