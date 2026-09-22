import { validInstitutions } from './institutionsSave';
import { validDesign } from './institutions';
import { nationalLaws,sectors,budgetStages,legislativeStages } from '../../../data/national';
import { validBudget,type NationalState } from './national';
const rec=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const num=(v:unknown,min=-1e12,max=1e12):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const int=(v:unknown,min=0,max=1200)=>num(v,min,max)&&Number.isInteger(v);
const str=(v:unknown)=>typeof v==='string'&&v.length<3000;
const close=(a:number,b:number)=>Math.abs(a-b)<.002;
export function validNational(v:unknown,month:number):v is NationalState{
 if(!rec(v)||v.version!==1||v.scenario!=='uk-2026-09'||v.month!==month||!int(v.introduced,0,month)||!int(v.seed,0,4294967295)||!validBudget(v.budget))return false;
 for(const k of ['realGDP','prices','growth','inflation','unemployment','bankRate','yield','effectiveRate','debt','openingDebt','bondAssets','energy','foreignDemand','confidence','sterling','productivity','housing','rights','competition','health','skills'])if(!num(v[k]))return false;
 if(!num(v.realGDP,1)||!num(v.prices,.01)||!num(v.growth,-12,10)||!num(v.inflation,-2,20)||!num(v.unemployment,2,20)||!num(v.bankRate,0,15)||!num(v.yield,0,20)||!num(v.effectiveRate,0,20)||!num(v.energy,.55,2.5)||!num(v.foreignDemand,.6,1.5)||!num(v.sterling,.5,1.6)||!num(v.productivity,.2,5)||v.openingDebt!==2950||v.debt!==v.bondAssets)return false;
 if(!['confidence','housing','rights','competition','health','skills'].every(k=>num(v[k],0,100)))return false;
 if(!Array.isArray(v.sectors)||v.sectors.length!==sectors.length||!v.sectors.every((s,i)=>rec(s)&&s.id===sectors[i].id&&num(s.output,0)&&num(s.growth,-12,10)))return false;
 if(!close(v.sectors.reduce((a,s)=>a+s.output,0),v.realGDP as number))return false;
 if(v.institutions!==undefined&&!validInstitutions(v.institutions,month))return false;
 const f=v.fiscal;if(!rec(f)||!['revenue','spending','interest'].every(k=>num(f[k],0))||!num(f.balance)||!Array.isArray(f.flows)||f.flows.length>200||!f.flows.every(x=>rec(x)&&str(x.name)&&str(x.from)&&str(x.to)&&x.from!==x.to&&num(x.amount,0)))return false;
 if(!Array.isArray(v.investmentPipeline)||v.investmentPipeline.length!==6||!v.investmentPipeline.every((x,i)=>rec(x)&&x.due===month+i+1&&num(x.amount,10/12,240/12)))return false;
 if(!close(f.balance as number,(f.spending as number)-(f.revenue as number))||!close(f.revenue as number,f.flows.filter(x=>x.to==='Treasury').reduce((a,x)=>a+x.amount,0))||!close(f.spending as number,f.flows.filter(x=>x.from==='Treasury').reduce((a,x)=>a+x.amount,0)))return false;
 if(!Array.isArray(v.enacted)||v.enacted.length>nationalLaws.length||new Set(v.enacted.map(x=>rec(x)?x.id:null)).size!==v.enacted.length||!v.enacted.every(x=>rec(x)&&nationalLaws.some(l=>l.id===x.id)&&int(x.month,v.introduced as number,month)&&int(x.due,x.month as number,2400)&&[.5,1,1.5].includes(x.intensity as number)&&(x.design===undefined||validDesign(x.design))&&typeof x.delivered==='boolean'&&(!x.delivered||(x.due as number)<=month)))return false;
 const p=v.proposal;if(p!==null){if(!rec(p)||!['law','budget'].includes(p.kind as string)||!int(p.stage,0,p.kind==='budget'?budgetStages.length-2:legislativeStages.length-2)||!int(p.lastMonth,0,month)||!num(p.support,0,35)||![.5,1,1.5].includes(p.intensity as number)||typeof p.consent!=='boolean')return false;if(p.design!==undefined&&!validDesign(p.design))return false;if(p.kind==='budget'?(p.id!=='budget'||p.design!==undefined||!validBudget(p.budget)):(!nationalLaws.some(l=>l.id===p.id)||p.budget!==null||v.enacted.some(l=>l.id===p.id)))return false;}
 if(!Array.isArray(v.news)||v.news.length>1200||!v.news.every(x=>rec(x)&&int(x.month,1,month)&&str(x.id)&&str(x.title)&&str(x.text)))return false;
 if(!Array.isArray(v.divisions)||v.divisions.length>5000||!v.divisions.every(x=>rec(x)&&int(x.month,0,month)&&str(x.title)&&int(x.ayes,0,650)&&int(x.noes,0,650)&&int(x.abstain,0,650)&&(x.ayes as number)+(x.noes as number)+(x.abstain as number)===650&&x.passed===((x.ayes as number)>(x.noes as number))))return false;
 if(!Array.isArray(v.history)||v.history.length!==month-(v.introduced as number))return false;
 let debt=v.openingDebt as number;
 for(const [i,h] of v.history.entries()){
  if(!rec(h)||h.month!==(v.introduced as number)+i+1||!['gdp','growth','inflation','unemployment','openingDebt','debt','borrowing','revenue','spending','bankRate'].every(k=>num(h[k]))||!Array.isArray(h.notes)||h.notes.length>30||!h.notes.every(str))return false;
  if(!close(h.openingDebt as number,debt)||!close(h.borrowing as number,(h.spending as number)-(h.revenue as number))||!close(h.debt as number,debt+(h.borrowing as number)))return false;debt=h.debt as number;
 }
 return close(debt,v.debt as number);
}
