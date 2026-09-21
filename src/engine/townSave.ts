import { createTown, townTotal, type Town } from './town';
import { townLenses, townPolicies } from '../data/town';
import type { StorageLike } from './save';
export const TOWN_SAVE_KEY='turning-pages:town:v1';
const record=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const number=(x:unknown,min=-1e12,max=1e12):x is number=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
const integer=(x:unknown,min:number,max:number)=>number(x,min,max)&&Number.isInteger(x);
const strings=(x:Record<string,unknown>,keys:string[])=>keys.every(k=>typeof x[k]==='string'&&(x[k] as string).length<2000);
export function validTown(value:unknown,maxMonths=24):value is Town{
  if(!record(value)||value.version!==1||value.scenario!=='mereford-1'||!integer(value.month,0,maxMonths)||!integer(value.seed,0,4294967295))return false;
  if(!townLenses.some(l=>l.id===value.lens)||!['care','work','future'].includes(value.pledge as string))return false;
  if(!number(value.fund,0)||!number(value.outside)||!number(value.energy,.5,3)||!number(value.orders,.1,2)||!number(value.insulation,0,.3)||!number(value.initialTotal,0))return false;
  const base=createTown();
  if(!Array.isArray(value.households)||value.households.length!==4||!value.households.every((h,i)=>{
    if(!record(h)||h.id!==base.households[i].id||!strings(h,['name','person','story']))return false;
    if(!['count','rent','energy','outsideIncome'].every(k=>h[k]===base.households[i][k as keyof typeof base.households[number]]))return false;
    return ['cash','unmet','income','outgoings'].every(k=>number(h[k],0))&&number(h.wellbeing,0,100);
  }))return false;
  if(!Array.isArray(value.employers)||value.employers.length!==2||!value.employers.every((f,i)=>{
    if(!record(f)||f.id!==base.employers[i].id||f.group!==base.employers[i].group||!strings(f,['name']))return false;
    if(!['capacity','wage','orders','inputs','energy'].every(k=>f[k]===base.employers[i][k as keyof typeof base.employers[number]]))return false;
    return integer(f.jobs,0,base.employers[i].capacity)&&number(f.cash,0)&&number(f.revenue,0)&&number(f.profit);
  }))return false;
  if(!Array.isArray(value.projects)||value.projects.length>5||!value.projects.every(p=>record(p)&&integer(p.due,(value.month as number)+1,maxMonths+3)))return false;
  if(!Array.isArray(value.history)||value.history.length!==value.month||!value.history.every((h,i)=>{
    if(!record(h)||h.month!==i+1||!townPolicies.some(p=>p.id===h.policy)||!number(h.energy,.5,3)||!integer(h.jobs,0,480)||!number(h.wellbeing,0,100)||!number(h.unmet,0)||!number(h.fund,0))return false;
    if(!Array.isArray(h.notes)||h.notes.length>20||!h.notes.every(n=>typeof n==='string'&&n.length<2000))return false;
    return Array.isArray(h.groups)&&h.groups.length===4&&h.groups.every((g,j)=>record(g)&&g.id===base.households[j].id&&['cash','unmet','income','outgoings'].every(k=>number(g[k],0))&&number(g.wellbeing,0,100));
  }))return false;
  const accounts=['fund','outside',...base.households.map(h=>h.id),...base.employers.map(f=>f.id)];
  if(!Array.isArray(value.ledger)||value.ledger.length>maxMonths*60||!value.ledger.every(x=>record(x)&&integer(x.month,1,value.month as number)&&accounts.includes(x.from as string)&&accounts.includes(x.to as string)&&x.from!==x.to&&number(x.amount,.01)&&strings(x,['reason'])))return false;
  const t=value as unknown as Town;
  if(t.initialTotal!==base.initialTotal||Math.abs(townTotal(t)-t.initialTotal)>.05)return false;
  // Reconcile saved balances to the opening accounts and every transaction.
  const balances:Record<string,number>={fund:base.fund,outside:base.outside};
  for(const h of base.households)balances[h.id]=h.cash;for(const f of base.employers)balances[f.id]=f.cash;
  for(const x of t.ledger){balances[x.from]-=x.amount;balances[x.to]+=x.amount;}
  const current:Record<string,number>={fund:t.fund,outside:t.outside};for(const h of t.households)current[h.id]=h.cash;for(const f of t.employers)current[f.id]=f.cash;
  return accounts.every(id=>Math.abs(balances[id]-current[id])<.05);
}
export function readTown(storage:StorageLike):{town:Town|null;error:string|null}{
  try{const raw=storage.getItem(TOWN_SAVE_KEY);if(raw===null)return {town:null,error:null};const parsed:unknown=JSON.parse(raw);if(!validTown(parsed))throw Error();return {town:parsed,error:null};}
  catch{return {town:null,error:'The town save could not be loaded. It has been left untouched. Restore an exported save or explicitly start a new experiment.'};}
}
export function writeTown(storage:StorageLike,town:Town):string|null{
  try{if(!validTown(town))return 'The town failed its consistency check and was not saved.';storage.setItem(TOWN_SAVE_KEY,JSON.stringify(town));return null;}catch{return 'The browser could not save the town. Export a backup before closing this page.';}
}
