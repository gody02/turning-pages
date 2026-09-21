import { ensureInstitutions,rebalanceFactions } from './institutions';
import type { Game } from './types';
import type { PoliticalCareer } from './politicsTypes';
import { bills, billStages, doctrines, parties, politicalEvents, politicalTasks, roleNames, rolePay, type BillId, type DoctrineId, type PartyId, type PoliticalEffects, type PoliticalRole } from '../data/politics';
import { townPolicies, type PolicyId } from '../data/town';
import { advanceTown, createTown, policyReason } from './town';
import { countryOf, politicalBirthday, salary } from './game';
import { createNational,advanceNational,incomeTax,employeeNI } from './national';
import { baselineBudget } from '../data/national';

export const roleRank=(role:PoliticalRole)=>['activist','councillor','mp','minister','premier'].indexOf(role);
const clamp=(n:number)=>Math.max(0,Math.min(100,n));
const cash=(n:number)=>Math.round(n*100)/100;
function random(g:Game){g.seed=(Math.imul(g.seed,1664525)+1013904223)>>>0;return g.seed/4294967296;}
function record(g:Game,text:string){g.politics!.log.unshift({month:g.politics!.months,text});g.journal.unshift({age:g.age,text:`Politics · month ${g.politics!.months}: ${text}`,kind:'action'});}
function affect(g:Game,e:PoliticalEffects){
  const p=g.politics!;
  for(const key of ['reputation','integrity','organisation','knowledge','caucus','unions','enterprise','support'] as const)p[key]=clamp(p[key]+(e[key]??0));
  for(const key of ['health','happiness'] as const)g.stats[key]=clamp(g.stats[key]+(e[key]??0));
  g.relationships.filter(r=>!r.id.startsWith('political-')).forEach(r=>r.bond=clamp(r.bond+(e.family??0)));
  const mentor=g.relationships.find(r=>r.id==='political-mentor');if(mentor)mentor.bond=clamp(mentor.bond+(e.caucus??0)*.25);
  g.money=cash(g.money+(e.money??0));p.campaignFunds=cash(Math.max(0,p.campaignFunds+(e.campaign??0)));
  if(g.stats.health<=0){g.alive=false;g.cause='The strain on your health brought your story to an end.';g.pending=null;p.pending=null;record(g,'Your political career ends with your life.');}
}
export function joinPoliticsReason(g:Game){
  if(!g.alive)return 'This life has ended.';
  if(g.politics)return 'You already belong to political life.';
  if(g.country!=='uk')return 'This career is available to characters living in the United Kingdom.';
  if(g.age<18)return 'Political career entry opens at age 18.';
  if(g.retired)return 'Begin this career before retiring.';
  if(g.pending)return 'Resolve your yearly event first.';
  if(g.actions<1)return 'You need one available activity.';
  return null;
}
export function joinPolitics(state:Game,party:PartyId,doctrine:DoctrineId):Game{
  if(joinPoliticsReason(state)||!parties.some(p=>p.id===party)||!doctrines.some(d=>d.id===doctrine))return state;
  const g=structuredClone(state);g.actions--;
  g.politics={version:1,active:true,party,doctrine,role:'activist',months:0,startAge:g.age,reputation:25,integrity:60,organisation:20,knowledge:Math.round(g.stats.smarts*.6),caucus:35,unions:40,enterprise:40,support:40,campaignFunds:0,candidacy:null,seats:0,inGovernment:false,pending:'purpose',seen:['purpose'],memories:[],motion:null,bill:null,laws:[],economy:createTown(g.seed),log:[],elections:[],lastIncome:0,lastExpenses:0,yearIncome:0,yearExpenses:0};
  record(g,`You join ${parties.find(p=>p.id===party)!.name} in Mereford. Politics now shares your life, your time and your monthly finances.`);
  g.relationships.push({id:'political-mentor',name:'Ruth Ellis',role:'Branch mentor',bond:45});
  g.relationships.push({id:'political-rival',name:'Alex Shaw',role:'Party rival',bond:30});
  return g;
}
export function choosePoliticalEvent(state:Game,index:number):Game{
  const p=state.politics;if(!p||!state.alive||state.pending)return state;
  const event=politicalEvents.find(e=>e.id===p.pending);const choice=event?.choices[index];
  if(!choice||(choice.effects.money??0)<-Math.max(0,state.money))return state;
  const g=structuredClone(state);g.politics!.pending=null;affect(g,choice.effects);
  if(choice.memory)g.politics!.memories.unshift(choice.memory);
  record(g,`${event!.title}: ${choice.result}`);return g;
}
export function electionIn(p:PoliticalCareer,kind:'council'|'parliament'){
  const first=kind==='council'?6:24,interval=kind==='council'?48:60;
  if(p.months<first)return first-p.months;
  return interval-(p.months-first)%interval;
}
export function politicalTaskReason(g:Game,id:string):string|null{
  const p=g.politics;if(!p)return 'Join the UK political career first.';
  if(!g.alive)return 'This life has ended.';
  if(g.pending||p.pending)return 'Resolve the outstanding life or political dilemma first.';
  if(g.actions<1)return 'Your monthly activities are spent.';
  const rank=roleRank(p.role);
  if(id==='canvass'&&g.money<30)return 'You need £30 of personal money for travel.';
  if(id==='nominateCouncil'){
    if(rank>0)return 'You have already progressed beyond local selection.';
    if(p.candidacy)return 'You already have a nomination.';
    if(p.months<2||p.organisation<30||p.caucus<40)return 'Requires 2 months in the party, 30 organisation and 40 party backing.';
  }
  if(id==='nominateParliament'){
    if(rank>=2)return 'You already hold a parliamentary seat.';
    if(p.candidacy)return 'You already have a nomination.';
    if(p.months<12||p.organisation<45||p.reputation<45||p.caucus<50)return 'Requires 12 months, 45 organisation, 45 reputation and 50 party backing.';
    if(p.campaignFunds<500)return 'Requires £500 in campaign funds for the fictional selection campaign.';
  }
  if(id==='seekOffice'&&(p.role!=='mp'||!p.inGovernment||p.knowledge<55||p.caucus<60||p.reputation<55))return 'Requires an MP in a governing majority, 55 knowledge, 60 party backing and 55 reputation.';
  if(id==='leadership'&&(p.role!=='minister'||!p.inGovernment||p.months<36||p.caucus<75||p.reputation<75||p.organisation<65))return 'Requires a minister, 36 months, 75 party backing, 75 reputation and 65 organisation.';
  if(id==='resign'&&rank===0)return 'You do not hold elected office.';
  if(id.startsWith('motion:')){
    const policy=id.split(':')[1] as PolicyId;if(!townPolicies.some(x=>x.id===policy))return 'Unknown programme.';
    if(rank<1)return 'Win elected office before formally sponsoring programme motions.';
    if(p.motion)return 'One motion is already scheduled for this month.';
    const reason=policyReason(p.economy,policy,true);if(reason)return reason;
  }
  if(id.startsWith('bill:')){
    if(p.national?.proposal)return 'Finish or withdraw your national proposal first.';
    const bill=id.split(':')[1] as BillId;if(!bills.some(b=>b.id===bill))return 'Unknown bill.';
    if(rank<2)return 'Only MPs can sponsor bills in this career.';
    if(p.bill)return 'Finish or withdraw the current bill first.';
    if(p.laws.includes(bill))return 'This bill is already law in your timeline.';
    if(p.knowledge<45)return 'Requires 45 policy knowledge.';
  }
  if(id==='advanceBill'){
    if(rank<2||!p.bill)return 'You need a parliamentary seat and a bill.';
    if(p.bill.lastAdvanced===p.months)return 'This bill has already moved this month.';
  }
  if(!politicalTasks.some(a=>a.id===id)&&!['nominateCouncil','nominateParliament','seekOffice','leadership','resign','advanceBill'].includes(id)&&!id.startsWith('motion:')&&!id.startsWith('bill:'))return 'Unknown political activity.';
  return null;
}
export function politicalTask(state:Game,id:string):Game{
  if(politicalTaskReason(state,id))return state;const g=structuredClone(state),p=g.politics!;g.actions--;
  const tasks:Record<string,PoliticalEffects>={canvass:{support:5,reputation:3,money:-30,health:-1},casework:{support:4,integrity:3},organise:{organisation:7,caucus:4,health:-1},study:{knowledge:8},fundraise:{campaign:250,organisation:2},family:{family:5,happiness:4},negotiate:{caucus:6,reputation:2}};
  if(tasks[id]){affect(g,tasks[id]);if(id==='study')g.stats.smarts=clamp(g.stats.smarts+2);record(g,politicalTasks.find(t=>t.id===id)!.name+'.');}
  if(id==='nominateCouncil'){p.candidacy='council';record(g,'Local members select you as their council candidate. The election is not guaranteed: keep building support.');}
  if(id==='nominateParliament'){p.candidacy='parliament';p.campaignFunds-=500;record(g,'Your parliamentary selection campaign succeeds. £500 was spent from campaign funds, not your personal account.');}
  if(id==='seekOffice'){p.role='minister';record(g,'The Prime Minister appoints you to the housing and communities brief. Officials, colleagues and Parliament still constrain what you can deliver.');}
  if(id==='leadership'){p.role='premier';record(g,'Your party backs you as leader. With its Commons majority behind you, you form a government as Prime Minister.');}
  if(id==='resign'){p.role='activist';p.candidacy=null;p.bill=null;p.motion=null;if(p.national)p.national.proposal=null;record(g,'You resign elected office and return to community organising. Your monthly life continues and your record remains.');}
  if(id.startsWith('motion:')){p.motion=id.split(':')[1] as PolicyId;record(g,`You sponsor ${townPolicies.find(x=>x.id===p.motion)!.name.toLowerCase()}. The programme board will vote at month end; you cannot simply order payment.`);}
  if(id.startsWith('bill:')){p.bill={id:id.split(':')[1] as BillId,stage:0,lastAdvanced:p.months};record(g,`${bills.find(b=>b.id===p.bill!.id)!.name} receives its first reading. It is not yet law.`);}
  if(id==='advanceBill'&&p.bill){
    const strength=p.knowledge*.3+p.caucus*.3+p.integrity*.15+(p.inGovernment?20:5);
    p.bill.lastAdvanced=p.months;
    if(strength+random(g)*25>=55){p.bill.stage++;if(p.bill.stage>=4){const name=bills.find(b=>b.id===p.bill!.id)!.name;p.laws.push(p.bill.id);p.bill=null;affect(g,{reputation:5,support:3});record(g,`${name} completes both Houses and receives Royal Assent. Its modelled economic effects start next month.`);}else record(g,`Your bill reaches ${billStages[p.bill.stage]}. Negotiations and scrutiny continue.`);}
    else{affect(g,{reputation:-2});record(g,'Your bill stalls after objections. Build evidence and support before trying again next month.');}
  }
  return g;
}
function election(g:Game,kind:'council'|'parliament'){
  const p=g.politics!,rank=roleRank(p.role);
  if(kind==='parliament'){
    p.seats=Math.round(Math.max(100,Math.min(430,150+p.support*1.5+p.organisation*.9+(random(g)-.5)*60)));
    p.inGovernment=p.seats>=326;
    if(!p.inGovernment&&rank>=3){p.role='mp';record(g,'Your party loses its governing majority. You leave government and return to the backbenches.');}
  }
  const defending=kind==='council'?p.role==='councillor':roleRank(p.role)>=2;
  if(p.candidacy!==kind&&!defending)return;
  const spend=Math.min(p.campaignFunds,kind==='council'?500:1500);p.campaignFunds-=spend;
  const coalition=(p.unions+p.enterprise-80)*.025;
  const share=Math.max(10,Math.min(75,22+p.reputation*.12+p.organisation*.1+p.support*.14+coalition+spend/500+(random(g)-.5)*16));
  const yours=Math.round(20000*share/100),rest=20000-yours,main=Math.round(rest*.62),second=Math.round(rest*.25);
  const votes=[yours,main,second,rest-main-second];const won=yours>Math.max(...votes.slice(1));
  p.elections.unshift({month:p.months,kind,won,votes,seats:p.seats});if(p.candidacy===kind)p.candidacy=null;
  if(won){p.role=kind==='council'?'councillor':roleRank(p.role)>=2?p.role:'mp';if(kind==='parliament'){g.job=null;g.jobYears=0;g.level=0;}affect(g,{reputation:5,happiness:5});record(g,`You win the ${kind==='council'?'council seat':'Mereford parliamentary seat'} with ${yours.toLocaleString()} of 20,000 votes. ${kind==='parliament'?`Your party has ${p.seats} of 650 seats.`:'Authority now brings responsibility.'}`);}
  else{if(defending){p.role='activist';p.bill=null;p.motion=null;if(p.national)p.national.proposal=null;}affect(g,{reputation:-3,happiness:-4});record(g,`You lose the ${kind} election with ${yours.toLocaleString()} votes. The strongest rival received ${Math.max(...votes.slice(1)).toLocaleString()}. ${defending?'You leave office.':'Your current role continues.'} There is still a political life after defeat.`);}
}
export function advancePoliticalMonth(state:Game):Game{
  if(!state.politics||!state.alive||state.pending||state.politics.pending)return state;
  let g=structuredClone(state);let p=g.politics!;
  // Older career saves acquire a dated national layer without rewriting their past.
  p.national??=createNational(g.seed,p.months);
  const national=p.national;
  // Current role earns this month's pay; appointments at the end affect future pay.
  const baseIncome=rolePay[p.role]/12+(roleRank(p.role)<2?(g.retired?12000*countryOf(g).wage:salary(g))/12:0);
  // Legacy salaries are take-home: apply only the change from baseline tax, using an explicit gross proxy.
  const grossProxy=baseIncome*12/.8;
  const taxChange=(incomeTax(grossProxy,national.budget)-incomeTax(grossProxy,baselineBudget)+(g.retired?0:employeeNI(grossProxy,national.budget)-employeeNI(grossProxy,baselineBudget)))/12;
  const ownIncome=Math.max(0,baseIncome-taxChange);
  const living=countryOf(g).living/12*(1+Math.max(0,p.economy.energy-1)*.12)*national.prices*(1+(national.budget.vat-20)*.004);
  const costs=living+(g.education==='university'?countryOf(g).tuition/12:0)+Math.max(0,-g.money)*(.05/12);
  p.lastIncome=cash(ownIncome);p.lastExpenses=cash(costs);p.yearIncome=cash(p.yearIncome+ownIncome);p.yearExpenses=cash(p.yearExpenses+costs);
  g.money=cash(g.money+p.lastIncome-p.lastExpenses);g.earned=cash(g.earned+p.lastIncome);
  p.months++;
  let policy:PolicyId='hold';
  if(p.motion){
    const stakeholder=p.motion==='business'?p.enterprise:p.motion==='relief'?p.unions:(p.unions+p.enterprise)/2;
    const strength=p.caucus*.3+p.support*.3+p.reputation*.2+stakeholder*.2;
    if(!policyReason(p.economy,p.motion,true)&&strength+random(g)*20>=55){policy=p.motion;record(g,`The programme board backs your ${policy} motion. The money comes from the public programme, not your bank account.`);}
    else record(g,'Your programme motion fails to secure support or funding. No discretionary money is spent.');
    p.motion=null;
  }else{
    const hardship=p.economy.households.reduce((s,h)=>s+h.unmet,0);
    const proposed:PolicyId=hardship>5000?'relief':p.months%6===0?'retrofit':'hold';
    policy=policyReason(p.economy,proposed,true)?'hold':proposed;
  }
  rebalanceFactions(ensureInstitutions(national,p.seats,p.party),p.seats,p.party);
  p.national=advanceNational(national,p.inGovernment&&p.role==='premier');
  const nation=p.national;
  const wageTaxes=p.economy.employers.map(f=>{const gross=f.wage*12/.8;return (incomeTax(gross,nation.budget)+employeeNI(gross,nation.budget)-incomeTax(gross,baselineBudget)-employeeNI(gross,baselineBudget))/12;});
  p.economy=advanceTown(p.economy,policy,{continuous:true,warmHomes:p.laws.includes('warmHomes'),profitShare:p.laws.includes('profitShare'),propertyLevy:p.laws.includes('propertyLevy'),national:{energy:nation.energy/nation.sterling,orders:nation.foreignDemand*(1+(nation.growth-1.2)/30),prices:nation.prices*(1+(nation.budget.vat-20)*.004),rentIndex:Math.exp((45-nation.housing)*.002),wageIndex:1+(nation.rights-50)*.001,grant:nation.budget.local/65,pensions:nation.budget.pensions/145,welfare:nation.budget.welfare/165,wageTaxes}});
  // National performance affects incumbents more strongly; opposition does not get blamed for every budget.
  const economyMood=Math.max(-1,Math.min(1,(nation.growth-1.2)*.15-(nation.unemployment-4.9)*.1-(nation.inflation-2)*.04));
  affect(g,{support:p.inGovernment?economyMood:-economyMood*.25});
  const institutions=nation.institutions!,unionPressure=institutions.regions.reduce((sum,r)=>sum+Math.max(0,r.pressure-50),0)/3;
  const partyGrievance=institutions.factions.filter(f=>f.side==='own').reduce((sum,f)=>sum+f.grievance*f.seats,0)/Math.max(1,p.seats);
  affect(g,{support:p.inGovernment?-unionPressure*.006:unionPressure*.0015,caucus:-partyGrievance*.005});
  const report=p.economy.history.at(-1)!;
  const previous=state.politics.economy.history.at(-1)?.wellbeing??68.75;
  affect(g,{support:(report.wellbeing-previous)*.3-(report.unmet>0?.5:0),reputation:p.integrity<35?-1:0,happiness:g.money<0?-1:0});
  if(p.memories.includes('Promised that nobody would lose from your policies.')&&(report.unmet>0||report.jobs<(state.politics.economy.history.at(-1)?.jobs??480))){affect(g,{integrity:-2,support:-1});record(g,'Residents recall your promise that nobody would lose. Hardship or lost jobs now contradict that claim.');}
  const family=g.relationships.filter(r=>!r.id.startsWith('political-'));family.forEach(r=>r.bond=clamp(r.bond-.25));
  if(p.months===6||(p.months>6&&(p.months-6)%48===0))election(g,'council');
  if(p.months===24||(p.months>24&&(p.months-24)%60===0))election(g,'parliament');
  if(p.national?.institutions)rebalanceFactions(p.national.institutions,p.seats,p.party);
  if(p.months%12===0){g.lastIncome=p.yearIncome;g.lastExpenses=p.yearExpenses;g=politicalBirthday(g);p=g.politics!;p.yearIncome=0;p.yearExpenses=0;record(g,`You turn ${g.age}. Twelve political months have passed; your income and living costs have already been settled.`);}
  g.actions=3;
  if(g.alive){let pool=politicalEvents.filter(e=>e.id!=='purpose'&&e.minimum<=roleRank(p.role)&&!p.seen.slice(-6).includes(e.id));if(!pool.length)pool=politicalEvents.filter(e=>e.id!=='purpose'&&e.minimum<=roleRank(p.role));const weights=pool.map(e=>e.id==='wages'?1+Math.max(0,nation.unemployment-4.9):e.id==='rent'?1+Math.max(0,nation.inflation-2):e.id==='budget'?1+Math.max(0,nation.fiscal.balance)/20:e.id==='fatigue'?1+(100-g.stats.health)/30:1);let draw=random(g)*weights.reduce((a,b)=>a+b,0),i=0;while(i<pool.length-1&&draw>weights[i])draw-=weights[i++];const event=pool[i];p.pending=event.id;p.seen.push(event.id);}
  else p.pending=null;
  return g;
}
export function politicalIncome(g:Game){return g.politics?rolePay[g.politics.role]+(roleRank(g.politics.role)<2?salary(g):0):salary(g);}
export function adultStart(g:Game):Game{
  if(g.age!==0||g.politics)return g;
  const next=structuredClone(g);next.age=18;next.education='secondary';next.money=3000;
  next.journal=[{age:18,text:`Your adult story begins after secondary school, with 3,000 ${countryOf(g).currency} to find your feet. Your family and future are still part of this life.`,kind:'milestone'}];return next;
}
