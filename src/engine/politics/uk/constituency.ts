import {transferCash} from '../../systems/finance';
import { townPolicies, townShocks, type PolicyId, type LensId } from '../../../data/town';
export type Household = {id:string;name:string;person:string;story:string;count:number;cash:number;rent:number;energy:number;outsideIncome:number;wellbeing:number;unmet:number;income:number;outgoings:number};
export type Employer = {id:string;name:string;group:string;cash:number;jobs:number;capacity:number;wage:number;orders:number;inputs:number;energy:number;revenue:number;profit:number};
export type Transfer = {month:number;from:string;to:string;amount:number;reason:string};
export type MonthReport = {month:number;policy:PolicyId;energy:number;jobs:number;wellbeing:number;unmet:number;fund:number;notes:string[];groups:{id:string;cash:number;wellbeing:number;unmet:number;income:number;outgoings:number}[]};
export type Town = {version:1;scenario:'mereford-1';seed:number;month:number;lens:LensId;pledge:'care'|'work'|'future';fund:number;outside:number;energy:number;orders:number;insulation:number;projects:{due:number}[];households:Household[];employers:Employer[];ledger:Transfer[];history:MonthReport[];initialTotal:number};
const round=(n:number)=>Math.round(n*100)/100 || 0;
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
export function townTotal(t:Town){return round(t.fund+t.outside+t.households.reduce((s,h)=>s+h.cash,0)+t.employers.reduce((s,f)=>s+f.cash,0));}
export function createTown(seed=20260921):Town{
  const t:Town={version:1,scenario:'mereford-1',seed:seed>>>0,month:0,lens:'socratic',pledge:'care',fund:300000,outside:0,energy:1,orders:1,insulation:0,projects:[],ledger:[],history:[],initialTotal:0,
    households:[
      {id:'service',name:'Service workers',person:'Amira, shop assistant',story:'A steady wage supports a rented home. Reduced hours leave little room for surprises.',count:300,cash:300*1100,rent:750,energy:150,outsideIncome:0,wellbeing:68,unmet:0,income:0,outgoings:0},
      {id:'industry',name:'Workshop workers',person:'Dan, machine operator',story:'Overseas orders keep the workshop busy. A family budget depends on the next shift.',count:180,cash:180*2200,rent:800,energy:175,outsideIncome:0,wellbeing:72,unmet:0,income:0,outgoings:0},
      {id:'fixed',name:'Fixed-income renters',person:'June, retired carer',story:'Income arrives regularly. Energy and food prices do not promise the same stability.',count:220,cash:220*600,rent:650,energy:170,outsideIncome:1350,wellbeing:62,unmet:0,income:0,outgoings:0},
      {id:'owners',name:'Property owners',person:'Elliot, landlord',story:'Rent and outside income provide a cushion. Tenants’ ability to pay still matters.',count:100,cash:100*16000,rent:0,energy:240,outsideIncome:2200,wellbeing:80,unmet:0,income:0,outgoings:0},
    ],
    employers:[
      {id:'retail',name:'Mereford shops',group:'service',cash:1200000,jobs:300,capacity:300,wage:2100,orders:400000,inputs:140000,energy:25000,revenue:0,profit:0},
      {id:'works',name:'Riverside workshop',group:'industry',cash:1000000,jobs:180,capacity:180,wage:2600,orders:600000,inputs:80000,energy:45000,revenue:0,profit:0},
    ]};t.initialTotal=townTotal(t);return t;
}
function random(t:Town){t.seed=(Math.imul(t.seed,1664525)+1013904223)>>>0;return t.seed/4294967296;}
function account(t:Town,id:string):{get:()=>number;set:(v:number)=>void}{
  if(id==='fund')return {get:()=>t.fund,set:v=>{t.fund=v;}};
  if(id==='outside')return {get:()=>t.outside,set:v=>{t.outside=v;}};
  const entity=t.households.find(h=>h.id===id)??t.employers.find(f=>f.id===id);if(!entity)throw Error('Unknown account');
  return {get:()=>entity.cash,set:v=>{entity.cash=v;}};
}
function transfer(t:Town,from:string,to:string,requested:number,reason:string){
  const a=account(t,from),b=account(t,to);const amount=transferCash(a,b,requested,from==='outside');
  if(amount===0)return 0;
  t.ledger.push({month:t.month,from,to,amount,reason});
  const recipient=t.households.find(h=>h.id===to),payer=t.households.find(h=>h.id===from);if(recipient)recipient.income=round(recipient.income+amount);if(payer)payer.outgoings=round(payer.outgoings+amount);
  return amount;
}
export function policyReason(t:Town,id:PolicyId,continuous=false):string|null{
  if(t.month>=24&&!continuous)return 'The 24-month experiment is complete.';
  const p=townPolicies.find(p=>p.id===id);if(!p)return 'Unknown policy.';
  if(t.fund<p.cost)return 'The fund cannot afford this commitment.';
  if(id==='retrofit' && t.insulation+t.projects.length*.06>=.299)return 'All five insulation projects are complete or contracted.';
  return null;
}
export type EconomyRules={continuous?:boolean;warmHomes?:boolean;profitShare?:boolean;propertyLevy?:boolean;national?:{energy:number;orders:number;prices:number;rentIndex:number;wageIndex:number;grant:number;pensions:number;welfare:number;wageTaxes:number[]}};
export function advanceTown(state:Town,id:PolicyId,rules:EconomyRules={}):Town{
  if(policyReason(state,id,!!rules.continuous))return state;const t=structuredClone(state);t.month++;
  t.households.forEach(h=>{h.income=0;h.outgoings=0;h.unmet=0;});
  const notes:string[]=[];
  const cycleMonth=rules.continuous?(t.month-1)%24+1:t.month;
  const shock=[...townShocks].reverse().find(s=>s.month<=cycleMonth)!;
  t.energy=round(clamp((rules.national?.energy??shock.energy)*(.98+random(t)*.04),.5,3));t.orders=round(clamp((rules.national?.orders??shock.orders)*(.98+random(t)*.04),.1,2));
  if(rules.national)notes.push('National energy, sterling, orders and fiscal policy now feed into the constituency. There is no repeating local shock timetable.');
  else if(shock.month===cycleMonth)notes.push(`${shock.title}: ${cycleMonth===1&&rules.continuous?'A new economic cycle begins. The constituency carries its existing savings, jobs and investments forward.':shock.body}`);
  if(rules.propertyLevy){const levy=transfer(t,'owners','fund',t.households.reduce((sum,h)=>sum+h.rent*h.count,0)*.05,'Property income levy');notes.push(`The property levy transferred £${Math.round(levy).toLocaleString('en-GB')} from owners to the local programme.`);}
  const completed=t.projects.filter(p=>p.due<=t.month).length;
  t.insulation=round(Math.min(.3,t.insulation+completed*.06));t.projects=t.projects.filter(p=>p.due>t.month);
  if(completed)notes.push(`${completed} insulation project completed. Renters now use ${Math.round(t.insulation*100)}% less energy than the baseline.`);
  if(id==='relief'){
    // Weight by last month's unmet essentials, before resetting their current account.
    const recipients=t.households.filter(h=>h.id!=='owners');const previous=state.households;
    const weights=recipients.map(h=>h.count*(1+(previous.find(p=>p.id===h.id)!.unmet/h.count)/500));const sum=weights.reduce((a,b)=>a+b,0);
    let remaining=45000;recipients.forEach((h,i)=>{const amount=i===recipients.length-1?remaining:round(45000*weights[i]/sum);transfer(t,'fund',h.id,amount,'Household relief');remaining=round(remaining-amount);});
    notes.push('£45,000 reached renting households before their bills. Relief changes this month’s resources, not the price of energy.');
  }
  if(id==='business'){t.employers.forEach(f=>transfer(t,'fund',f.id,20000,'Employer bridge grant'));notes.push('Each employer received £20,000 before setting payroll. The ledger shows whether cash supported wages or remained in reserves.');}
  if(id==='retrofit'){transfer(t,'fund','outside',60000,'Insulation contract');t.projects.push({due:t.month+3});notes.push(`Insulation was commissioned. Energy savings start in month ${t.month+3}${t.month+3>24?', beyond this experiment’s horizon':''}.`);}
  if(id==='hold')notes.push('No new discretionary spending was committed. The fund retained its policy reserve.');
  transfer(t,'outside','fund',110000*(rules.national?.grant??1),'Programme grant');const services=transfer(t,'fund','outside',80000,'Baseline service provision');
  if(rules.warmHomes)transfer(t,'outside','fund',20000,'Warm Homes statutory grant');
  if(services<80000)notes.push('The programme could not fully fund baseline services.');
  for(const f of t.employers){
    const wage=f.wage*(rules.national?.wageIndex??1);
    const before=f.cash;const lastMonth=t.ledger.filter(x=>x.month===t.month-1&&x.to===f.id&&(x.reason==='Local shopping'||x.reason==='External orders')).reduce((s,x)=>s+x.amount,0);
    const external=transfer(t,'outside',f.id,f.orders*t.orders,'External orders');
    const energy=f.energy*t.energy;const inputs=f.inputs;
    // Hiring uses prior demand and current external contracts; payroll cannot exceed available cash.
    const expectedLocal=f.id==='retail'?(t.month===1?480000:Math.max(0,lastMonth-state.employers.find(e=>e.id===f.id)!.revenue)):0;
    const sustainable=Math.floor(Math.max(0,external+expectedLocal-inputs-energy)/wage);
    const reserveBuffer=Math.max(0,f.cash-2*(f.capacity*wage+inputs+energy));
    const target=clamp(sustainable+Math.floor(reserveBuffer/(6*wage)),0,f.capacity);
    const boundedJobs=clamp(target,f.jobs-12,f.jobs+8);
    f.jobs=Math.min(Math.floor(boundedJobs),Math.floor(Math.max(0,f.cash-inputs-energy)/wage));
    f.jobs=Math.max(0,f.jobs);transfer(t,f.id,f.group,f.jobs*wage,'Wages');
    const tax=(rules.national?.wageTaxes[t.employers.indexOf(f)]??0)*f.jobs;
    if(tax>0)transfer(t,f.group,'outside',tax,'National tax change');else if(tax<0)transfer(t,'outside',f.group,-tax,'National tax reduction');
    transfer(t,f.id,'outside',inputs,'Imported business inputs');transfer(t,f.id,'outside',energy,'Business energy');
    f.revenue=external;f.profit=round(f.cash-before);
    if(rules.profitShare){const dividend=transfer(t,f.id,f.group,Math.max(0,state.employers.find(e=>e.id===f.id)!.profit)*.2,'Worker profit share');f.profit=round(f.profit-dividend);}
  }
  for(const h of t.households){
    if(h.outsideIncome)transfer(t,'outside',h.id,h.outsideIncome*h.count*(h.id==='fixed'?(rules.national?.pensions??1):1),'Pensions and outside income');
    const f=t.employers.find(f=>f.group===h.id);if(f)transfer(t,'outside',h.id,(f.capacity-f.jobs)*900*(rules.national?.welfare??1),'Unemployment support');
  }
  // Owners receive all rents before consumption; this avoids household iteration-order effects.
  for(const h of t.households.filter(h=>h.rent>0)){
    const due=h.rent*h.count*(rules.national?.rentIndex??1);const paid=transfer(t,h.id,'owners',due,'Rent');h.unmet+=due-paid;
  }
  for(const h of t.households){
    const energy=h.energy*t.energy*(h.id==='owners'?1:1-t.insulation)*h.count;
    h.unmet+=energy-transfer(t,h.id,'outside',energy,'Household energy');
    const food=360*h.count*(rules.national?.prices??1);h.unmet+=food-transfer(t,h.id,'retail',food,'Local shopping');
    const other=210*h.count*(rules.national?.prices??1);h.unmet+=other-transfer(t,h.id,'outside',other,'Other essentials');
    const desired=(h.id==='owners'?800:260)*h.count;
    transfer(t,h.id,'retail',Math.min(desired,Math.max(0,h.cash-h.count*600)*.2),'Local shopping');
    h.unmet=round(Math.max(0,h.unmet));const pressure=h.unmet/h.count;const buffer=h.cash/h.count;
    h.wellbeing=round(clamp(h.wellbeing+(pressure>0?-Math.min(9,pressure/80):buffer<400?-1.5:.6)-(t.energy>1.3?.7:0),0,100));h.unmet=round(h.unmet);
  }
  for(const f of t.employers){const local=t.ledger.filter(x=>x.month===t.month&&x.to===f.id&&x.reason==='Local shopping').reduce((s,x)=>s+x.amount,0);f.profit=round(f.profit+local);}
  const previousJobs=state.employers.reduce((s,f)=>s+f.jobs,0);const jobs=t.employers.reduce((s,f)=>s+f.jobs,0);
  notes.push(`Employment ${jobs-previousJobs>=0?'+':''}${jobs-previousJobs} this month: employers used recent demand, expected input costs and available reserves. Hiring recovers by at most 8 per employer; cuts are normally limited to 12 unless payroll is unaffordable.`);
  const unmet=round(t.households.reduce((s,h)=>s+h.unmet,0));notes.push(unmet>0?`£${Math.round(unmet).toLocaleString('en-GB')} of essential costs went unmet after available cash was exhausted. This is hardship, not newly created money or debt.`:'Every household group covered its essential costs this month.');
  if(t.energy>1.3)notes.push('Energy pressure raised household and employer costs together. Previous savings and home insulation changed who could absorb it.');
  const wellbeing=round(t.households.reduce((s,h)=>s+h.wellbeing*h.count,0)/800);
  t.history.push({month:t.month,policy:id,energy:t.energy,jobs,wellbeing,unmet,fund:t.fund,notes,groups:t.households.map(h=>({id:h.id,cash:h.cash,wellbeing:h.wellbeing,unmet:h.unmet,income:h.income,outgoings:h.outgoings}))});
  return t;
}
export function townVoice(t:Town,h:Household){
  if(!t.month)return h.story;
  if(h.unmet>0)return `“We were short by £${Math.round(h.unmet/h.count)} on essentials this month. What am I supposed to leave unpaid?”`;
  if(h.id==='owners')return '“Rent arrived, but I can see tenants using up their cushion. My security depends on their ability to keep paying.”';
  const employer=t.employers.find(f=>f.group===h.id);
  if(employer&&employer.jobs<employer.capacity*.85)return '“There are fewer shifts. People who used to come into the shop every Friday have stopped coming.”';
  if(t.insulation>0)return '“The house needs less energy now. It took time, but that change stays with us.”';
  if(t.energy>1.3)return '“We paid the bills. That doesn’t mean we aren’t worried about next month.”';
  return '“This month is manageable. I want to know whether we can count on that lasting.”';
}
