import {prepareUK,syncUKCharacter} from './bridge';
import { baselineBudget, budgetFields, nationalIncidents, nationalLaws, sectors, type Budget, type BudgetKey, type LawEffect } from '../../../data/national';
import type { Game } from '../../types';
import { ensureInstitutions,stepInstitutions,factionDivision,lawCost,lawDelay,lawExtent,lawActive,designFor,validDesign,devolvedLaw,consentRegions,regionGrant,type Institutions,type BillDesign } from './institutions';
export type FiscalFlow={name:string;from:string;to:string;amount:number};
export type Fiscal={revenue:number;spending:number;interest:number;balance:number;flows:FiscalFlow[]};
export type NationalReport={month:number;gdp:number;growth:number;inflation:number;unemployment:number;debt:number;openingDebt:number;borrowing:number;revenue:number;spending:number;bankRate:number;notes:string[]};
export type Proposal={kind:'law'|'budget';id:string;stage:number;lastMonth:number;support:number;intensity:number;consent:boolean;budget:Budget|null;design?:BillDesign};
export type NationalState={
 version:1;scenario:'uk-2026-09';introduced:number;month:number;seed:number;
 realGDP:number;prices:number;growth:number;inflation:number;unemployment:number;bankRate:number;yield:number;effectiveRate:number;debt:number;openingDebt:number;bondAssets:number;
 energy:number;foreignDemand:number;confidence:number;sterling:number;productivity:number;housing:number;rights:number;competition:number;health:number;skills:number;
 budget:Budget;proposal:Proposal|null;institutions?:Institutions;investmentPipeline:{due:number;amount:number}[];enacted:{id:string;month:number;due:number;intensity:number;delivered:boolean;design?:BillDesign}[];
 sectors:{id:string;output:number;growth:number}[];fiscal:Fiscal;history:NationalReport[];news:{month:number;id:string;title:string;text:string}[];divisions:{month:number;title:string;ayes:number;noes:number;abstain:number;passed:boolean}[];
};
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const round=(n:number)=>Math.round(n*10000)/10000;
function random(n:NationalState){n.seed=(Math.imul(n.seed,1664525)+1013904223)>>>0;return n.seed/4294967296;}
export function createNational(seed:number,month=0):NationalState{
 const n:NationalState={version:1,scenario:'uk-2026-09',introduced:month,month,seed:(seed^0x5f3759df)>>>0,realGDP:3050,prices:1,growth:1.2,inflation:3.1,unemployment:4.9,bankRate:3.75,yield:4.5,effectiveRate:3.7,debt:2950,openingDebt:2950,bondAssets:2950,energy:1,foreignDemand:1,confidence:55,sterling:1,productivity:1,housing:45,rights:50,competition:50,health:55,skills:55,budget:{...baselineBudget},proposal:null,investmentPipeline:Array.from({length:6},(_,i)=>({due:month+i+1,amount:100/12})),enacted:[],sectors:sectors.map(s=>({id:s.id,output:3050*s.share,growth:1.2})),fiscal:{revenue:0,spending:0,interest:0,balance:0,flows:[]},history:[],news:[],divisions:[]};n.fiscal=costBudget(n,n.budget);return n;
}
// England/Wales/NI non-savings employment schedule; Scottish and special relief schedules are not modelled.
export function incomeTax(gross:number,b:Budget){
 const allowance=Math.max(0,b.allowance-Math.max(0,gross-100000)/2),taxable=Math.max(0,gross-allowance);
 const basic=Math.min(taxable,37700),higher=Math.min(Math.max(0,taxable-37700),Math.max(0,125140-allowance-37700));
 return (basic*b.basic+higher*b.higher+Math.max(0,taxable-basic-higher)*b.additional)/100;
}
export function employeeNI(gross:number,b:Budget){return Math.max(0,Math.min(gross,50270)-12570)*b.ni/100+Math.max(0,gross-50270)*.02;}
const earners=[{name:'Lower earners',gross:22000,millions:10},{name:'Middle earners',gross:38000,millions:14},{name:'Higher earners',gross:70000,millions:7},{name:'Top earners',gross:180000,millions:1.5}];
export function distribution(n:NationalState,b=n.budget){return earners.map(e=>{const gross=e.gross*(n.realGDP/3050)*n.prices;const tax=incomeTax(gross,b),ni=employeeNI(gross,b);return {...e,gross,tax,ni,net:gross-tax-ni,realNet:(gross-tax-ni)/(n.prices*(1+(b.vat-20)*.004))};});}
export function costBudget(n:NationalState,b:Budget):Fiscal{
 const flows:FiscalFlow[]=[];const add=(name:string,from:string,to:string,amount:number)=>flows.push({name,from,to,amount:round(Math.max(0,amount)/12)});
 const gdp=n.realGDP*n.prices,employment=(100-n.unemployment)/95.1,people=distribution(n,b);
 add('Income Tax','Households','Treasury',people.reduce((s,e)=>s+e.tax*e.millions/1000,0)*employment);
 add('Employee National Insurance','Households','Treasury',people.reduce((s,e)=>s+e.ni*e.millions/1000,0)*employment);
 add('Employer National Insurance','Employers','Treasury',people.reduce((s,e)=>s+Math.max(0,e.gross-5000)*b.employerNI/100*e.millions/1000,0)*employment);
 add('VAT (taxable consumption proxy)','Households','Treasury',gdp*.29*b.vat/100);
 add('Corporation Tax (profit-base proxy)','Firms','Treasury',gdp*.13*b.corporation/100*clamp(n.confidence/55,.5,1.4));
 add('Other taxes & non-tax receipts','Private and external sectors','Treasury',gdp*.11);
 const spendingKeys:BudgetKey[]=['health','education','welfare','pensions','defence','justice','local','transport','investment'];
 for(const key of spendingKeys){const stabiliser=key==='welfare'?1+Math.max(0,n.unemployment-4.9)*.055:1;add(budgetFields[key].label,'Treasury',key==='welfare'||key==='pensions'?'Households':'Public services & suppliers',b[key]*stabiliser);}
 add('Other primary expenditure','Treasury','Public services & suppliers',(n.institutions?101:190)*n.prices);
 if(n.institutions){for(const r of n.institutions.regions){add(`${r.name} block grant`,'Treasury',`${r.name} administration`,regionGrant(r,b,n.prices));}add('Statutory bank resolution support','Treasury','Bank equity',n.institutions.publicCost*12);}
 for(const law of n.enacted.filter(l=>lawActive(l,n.month))){const data=nationalLaws.find(l=>l.id===law.id)!;add(data.name,'Treasury','Programme staff & suppliers',lawCost(data,law.intensity,law.design));}
 const interest=Math.max(0,n.debt)*n.effectiveRate/100/12;flows.push({name:'Debt interest',from:'Treasury',to:'Bondholders',amount:round(interest)});
 const revenue=round(flows.filter(f=>f.to==='Treasury').reduce((s,f)=>s+f.amount,0)),spending=round(flows.filter(f=>f.from==='Treasury').reduce((s,f)=>s+f.amount,0));
 return {revenue,spending,interest:round(interest),balance:round(spending-revenue),flows};
}
export function validBudget(v:unknown):v is Budget{
 if(!v||typeof v!=='object'||Array.isArray(v))return false;const b=v as Budget;
 return Object.entries(budgetFields).every(([k,f])=>typeof b[k as BudgetKey]==='number'&&Number.isFinite(b[k as BudgetKey])&&b[k as BudgetKey]>=f.min&&b[k as BudgetKey]<=f.max)&&b.basic<=b.higher&&b.higher<=b.additional;
}
export function nationalReason(g:Game,action:string,id?:string){
 const p=g.politics;if(!p)return 'Enter the UK political career first.';
 if(!g.alive)return 'This life has ended.';
 if(g.pending||p.pending)return 'Resolve your outstanding life and political choices first.';
 if(g.actions<1)return 'Your monthly activities are spent.';
 const n=p.national;
 if(!['mp','minister','premier'].includes(p.role))return 'Win a parliamentary seat first. You can examine and draft policy now.';
 if(action==='budget'&&(p.role!=='premier'||!p.inGovernment))return 'As Prime Minister, commission the Treasury and secure Commons approval. This ministerial brief cannot set national taxes.';
 if(action==='law'&&!nationalLaws.some(l=>l.id===id))return 'Unknown proposal.';
 if((action==='budget'||action==='law')&&(n?.proposal||p.bill))return 'Finish or withdraw the current bill before introducing another.';
 if(action==='law'&&n?.enacted.some(l=>l.id===id))return 'This law is already in your timeline.';
 if(['advance','lobby','amend','withdraw'].includes(action)&&!n?.proposal)return 'Introduce a proposal first.';
 if(action==='advance'&&n?.proposal?.lastMonth===p.months)return 'The next legislative stage needs another month.';
 if(action==='advance'&&n?.proposal?.kind==='budget'&&(p.role!=='premier'||!p.inGovernment))return 'Your government no longer controls this Budget. Withdraw the proposal.';
 if(action==='advance'&&n?.proposal?.kind==='law'&&!n.proposal.consent&&n.proposal.stage>=1)return 'This spending bill needs government support for a money resolution. Negotiate support first.';
 if(action==='advance'&&n?.proposal?.kind==='law'&&n.proposal.design?.scope==='agreement'&&n.proposal.stage>=5&&(!n.institutions||n.institutions.regions.some(r=>consentRegions(nationalLaws.find(l=>l.id===n.proposal!.id)!).includes(r.id)&&r.consent!==n.proposal!.id)))return 'Seek legislative consent from the affected devolved administrations before completing this agreement-based bill.';
 if(action==='amend'&&n?.proposal?.kind==='budget')return 'Withdraw and redraft a Budget package; the submitted tax and supply measures are fixed.';
 if(action==='amend'&&n?.proposal?.intensity===.5)return 'The bill has already been narrowed to a half-scale programme.';
 if(!['budget','law','advance','lobby','amend','withdraw'].includes(action))return 'Unknown action.';
 return null;
}
export function nationalAction(state:Game,action:string,id?:string,budget?:Budget,design?:BillDesign):Game{
 if(nationalReason(state,action,id)||(action==='budget'&&!validBudget(budget))||(design!==undefined&&!validDesign(design)))return state;
 const g=structuredClone(state),p=g.politics!;p.national??=createNational(g.seed,p.months);const n=p.national;prepareUK(g);const institutions=ensureInstitutions(n,p.seats,p.party);g.actions--;
 const log=(text:string)=>{p.log.unshift({month:p.months,text});g.journal.unshift({age:g.age,kind:'action',text:`Westminster · ${text}`});};
 if(action==='law'||action==='budget'){n.proposal={kind:action,id:action==='budget'?'budget':id!,stage:0,lastMonth:p.months,support:0,intensity:1,consent:p.inGovernment&&['minister','premier'].includes(p.role),budget:action==='budget'?structuredClone(budget!):null};log(action==='budget'?'The Treasury publishes your proposed tax and spending package. Existing rates remain until approval.':`${nationalLaws.find(l=>l.id===id)!.name} is introduced. Funding, scrutiny and votes are still required.`);}
 const proposal=n.proposal;
 if(!proposal)return syncUKCharacter(g);
 if(action==='law'){const law=nationalLaws.find(l=>l.id===id)!;proposal.design=designFor(law,design);if(proposal.design.delivery==='accelerated')institutions.judicialRisk=clamp(institutions.judicialRisk+8,0,100);proposal.intensity=proposal.design.scale;for(const r of institutions.regions)r.consent=null;if(proposal.design.scope==='override'){for(const r of institutions.regions.filter(r=>consentRegions(law).includes(r.id)))r.trust=clamp(r.trust-15,0,100);institutions.judicialRisk=clamp(institutions.judicialRisk+12,0,100);log('You propose to legislate without devolved consent. Westminster retains legal power, but relations deteriorate.');}}
 if(action==='withdraw'){log('You withdraw the proposal. No tax, spending or law changes take effect.');n.proposal=null;}
 if(action==='lobby'){proposal.support=clamp(proposal.support+6+p.knowledge*.04,0,35);if(!proposal.consent&&random(n)<clamp((p.caucus+p.knowledge)/250,.1,.85)){proposal.consent=true;log('Negotiations secure government support for the spending resolution. This does not guarantee passage.');}else log('You negotiate amendments and backing across the House. Support grows, but divisions remain.');}
 if(action==='amend'){proposal.intensity=.5;if(proposal.design)proposal.design.scale=.5;proposal.support=clamp(proposal.support+10,0,35);log('You narrow the programme to half scale: lower cost and smaller eventual benefits, with broader support.');}
 if(action==='advance'){
  proposal.lastMonth=p.months;
  const last=proposal.kind==='budget'?4:7;
  // Introduction, scrutiny and assent are not random royal vetoes. Political votes happen in the Commons.
  const voteStage=proposal.kind==='budget'?proposal.stage<3:[0,2,3,5].includes(proposal.stage);
  let passed=true;
  if(voteStage){
   const law=nationalLaws.find(l=>l.id===proposal.id),f=proposal.budget?costBudget(n,proposal.budget):n.fiscal;
   const controversy=law?law.controversy*proposal.intensity:clamp(Math.abs(f.balance-n.fiscal.balance)*4,10,75);
   const {ayes,noes,abstain}=factionDivision(n,proposal,{seats:p.seats,party:p.party,caucus:p.caucus,integrity:p.integrity},controversy,()=>random(n));
   passed=ayes>noes;n.divisions.unshift({month:p.months,title:proposal.kind==='budget'?'Treasury package':law!.name,ayes,noes,abstain,passed});
   log(`Commons division: ${ayes} Ayes, ${noes} Noes, ${abstain} not voting. ${passed?'The measure advances.':'The measure is defeated; it must be redrafted.'}`);
   if(!passed){p.reputation=clamp(p.reputation-3,0,100);n.proposal=null;return syncUKCharacter(g);}
  }else if(proposal.kind==='law'&&proposal.stage===4&&random(n)<.35){proposal.support=clamp(proposal.support+3,0,35);log('The Lords request revisions and evidence. Scrutiny continues next month; the bill has not passed.');return syncUKCharacter(g);}
  proposal.stage++;
  if(proposal.stage>=last){
   if(proposal.kind==='budget'){n.budget=structuredClone(proposal.budget!);log('The tax and supply measures receive Royal Assent. The approved package applies from next month.');}
   else{const law=nationalLaws.find(l=>l.id===proposal.id)!;n.enacted.push({id:law.id,month:p.months,due:p.months+lawDelay(law,proposal.design),intensity:proposal.intensity,delivered:false,design:proposal.design});log(`${law.name} receives Royal Assent. Spending starts next month; delivery remains subject to capacity and scrutiny.`);}
   n.proposal=null;p.reputation=clamp(p.reputation+3,0,100);
  }
 }
 return syncUKCharacter(g);
}
export function advanceNational(state:NationalState,playerGoverns:boolean):NationalState{
 const n=structuredClone(state);n.month++;const notes:string[]=[];
 ensureInstitutions(n);stepInstitutions(n,()=>random(n),notes);
 for(const law of n.enacted.filter(l=>!l.delivered&&l.due<=n.month&&lawActive(l,n.month))){
  const data=nationalLaws.find(l=>l.id===law.id)!;
  // Delivery can slip because capacity is scarce, rather than always hitting a scripted date.
  const legalRisk=(n.institutions?.judicialRisk??15)/1000;
  if(random(n)<clamp((60-n.skills)/180+legalRisk-(n.institutions?.evidence??0)/2000,.03,.4)){law.due++;notes.push(`${data.name}: capacity or implementation scrutiny delays delivery by a month.`);continue;}
  for(const [key,value] of Object.entries(data.effect) as [keyof LawEffect,number][]){const k=key==='trade'?'foreignDemand':key;n[k]+=value*law.intensity*lawExtent(data,law.design);}
  law.delivered=true;notes.push(`${data.name}: delivery begins. Benefits now enter the economy.`);
  if(data.id==='devolutiondeal')for(const r of n.institutions!.regions)r.trust=clamp(r.trust+8*law.intensity,0,100);
  if(devolvedLaw(data)&&law.design&&['agreement','override'].includes(law.design.scope))for(const r of n.institutions!.regions.filter(r=>consentRegions(data).includes(r.id))){r.health=clamp(r.health+(data.effect.health??0)*law.intensity,0,100);r.skills=clamp(r.skills+(data.effect.skills??0)*law.intensity,0,100);}
 }
 const eligible=nationalIncidents.filter(e=>!n.news.some(x=>x.id===e.id&&n.month-x.month<8));
 if(eligible.length&&random(n)<.27+Math.max(0,50-n.confidence)/250){
  const weights=eligible.map(e=>e.id==='strike'?1+Math.max(0,n.inflation-2)*.8+Math.max(0,50-n.rights)/20:e.id==='credit'?1+Math.max(0,n.debt/(n.realGDP*n.prices)-.9)*5+Math.max(0,n.yield-5):1);
  let draw=random(n)*weights.reduce((a,b)=>a+b,0),index=0;while(index<weights.length-1&&draw>weights[index])draw-=weights[index++];
  const e=eligible[index];n.energy+=e.energy;n.foreignDemand+=e.demand;n.confidence+=e.confidence;
  if(e.id==='innovation')n.productivity+=.15;
  n.news.unshift({month:n.month,id:e.id,title:e.title,text:e.text});notes.push(`${e.title}: ${e.text}`);
 }
 const delivered=n.enacted.filter(l=>l.delivered&&lawActive(l,n.month));
 const energyTarget=1+delivered.reduce((a,l)=>a+(nationalLaws.find(x=>x.id===l.id)!.effect.energy??0)*l.intensity*lawExtent(nationalLaws.find(x=>x.id===l.id)!,l.design),0);
 const tradeTarget=1+delivered.reduce((a,l)=>a+(nationalLaws.find(x=>x.id===l.id)!.effect.trade??0)*l.intensity*lawExtent(nationalLaws.find(x=>x.id===l.id)!,l.design),0);
 n.energy=clamp(n.energy+(energyTarget-n.energy)*.025+(random(n)-.5)*.035,.55,2.5);
 n.foreignDemand=clamp(n.foreignDemand+(tradeTarget-n.foreignDemand)*.025+(random(n)-.5)*.025,.6,1.5);
 // Non-player government reacts to conditions, rather than leaving policy frozen until the player wins.
 if(!playerGoverns&&random(n)<.07){
  if(n.unemployment>6)n.budget.welfare=clamp(n.budget.welfare+5,60,300);
  else if(n.debt/(n.realGDP*n.prices)>1.05)n.budget.basic=clamp(n.budget.basic+1,0,Math.min(40,n.budget.higher));
  else n.budget.health=clamp(n.budget.health+5,100,400);
  notes.push('The incumbent government secures a fiscal adjustment in response to conditions. This is an abstracted non-player parliamentary process.');
 }
 const b=n.budget,base=baselineBudget;
 const taxDrag=(b.basic-base.basic)*.035+(b.higher-base.higher)*.012+(b.additional-base.additional)*.005-(b.allowance-base.allowance)*.000002+(b.ni-base.ni)*.025+(b.vat-base.vat)*.04+(b.employerNI-base.employerNI)*.025+(b.corporation-base.corporation)*.015;
 const programmeSpending=n.enacted.filter(l=>lawActive(l,n.month)).reduce((sum,l)=>sum+lawCost(nationalLaws.find(x=>x.id===l.id)!,l.intensity,l.design),0);
 const stimulus=(b.welfare-base.welfare)*.004+(b.health-base.health)*.002+(b.investment-base.investment)*.003+(b.pensions-base.pensions)*.003+(b.education-base.education)*.002+(b.defence-base.defence)*.001+(b.justice-base.justice)*.001+(b.local-base.local)*.002+(b.transport-base.transport)*.002+programmeSpending*.002;
 const deliveredCapital=n.investmentPipeline.filter(x=>x.due<=n.month).reduce((a,x)=>a+x.amount,0);
 n.investmentPipeline=n.investmentPipeline.filter(x=>x.due>n.month);
 n.investmentPipeline.push({due:n.month+6,amount:b.investment/12});
 n.productivity=clamp(n.productivity+(deliveredCapital/(100/12)-1)*.001+(n.skills-55)*.00002,.2,5);
 const rateDrag=(n.bankRate-3)*.16+(1-(n.institutions?.credit??1))*.8;
 const target=1.2+(n.productivity-1)*.6+stimulus-taxDrag+(n.foreignDemand-1)*3-(n.energy-1)*1.3-rateDrag+(n.confidence-55)*.012+(n.competition-50)*.006+(n.health-55)*.004;
 let total=0;
 n.sectors=n.sectors.map((s,i)=>{const spec=sectors[i];const growth=clamp(s.growth*.6+(target+(n.foreignDemand-1)*spec.trade*4-(n.energy-1)*spec.energy*2+(random(n)-.5)*1.5)*.4,-12,10);const output=s.output*(1+growth/1200);total+=output;return {...s,growth,output};});
 n.growth=clamp((total/n.realGDP-1)*1200,-12,10);n.realGDP=total;
 n.unemployment=clamp(n.unemployment+(1.1-n.growth)*.035+(b.employerNI-15)*.002+(random(n)-.5)*.07,2,20);
 n.inflation=clamp(n.inflation*.93+(2+(n.energy-1)*5+(n.growth-1.5)*.2+(b.vat-20)*.10-(n.bankRate-3)*.18)*.07+(random(n)-.5)*.09,-2,20);
 n.prices*=1+n.inflation/1200;
 const oldRate=n.bankRate;
 if(random(n)<.67){const desired=clamp(2.5+(n.inflation-2)*.65+(n.growth-1)*.15,0,15);n.bankRate=clamp(n.bankRate+(desired>n.bankRate+.2?.25:desired<n.bankRate-.2?-.25:0),0,15);}
 if(n.bankRate!==oldRate)notes.push(`The independent MPC ${n.bankRate>oldRate?'raises':'cuts'} Bank Rate to ${n.bankRate.toFixed(2)}%, weighing inflation and activity.`);
 n.yield=clamp(n.bankRate+.7+Math.max(0,n.debt/(n.realGDP*n.prices)-.9)*2+(55-n.confidence)*.015,0,20);
 n.effectiveRate+=(n.yield-n.effectiveRate)/120; // refinancing only a fraction of outstanding debt each month
 n.sterling=clamp(n.sterling+((n.bankRate-3.75)*.001+(n.confidence-55)*.0002)+(random(n)-.5)*.012,.5,1.6);
 n.health=clamp(n.health+((b.health/n.prices)/230-1)*.35,0,100);n.skills=clamp(n.skills+((b.education/n.prices)/120-1)*.15,0,100);
 n.housing=clamp(n.housing+(b.investment/100-1)*.035-.025,0,100);n.rights=clamp(n.rights,0,100);n.competition=clamp(n.competition,0,100);
 n.confidence=clamp(n.confidence+(n.growth-1)*.18-(n.inflation-2)*.04+(random(n)-.5)*.6,5,95);
 for(const r of n.institutions!.regions)r.grant=regionGrant(r,b,n.prices);
 n.fiscal=costBudget(n,b);const openingDebt=n.debt;n.debt=round(n.debt+n.fiscal.balance);n.bondAssets=round(n.bondAssets+n.fiscal.balance);
 notes.push(`Demand: tax changes ${(-taxDrag).toFixed(2)}pp, spending changes ${stimulus.toFixed(2)}pp; financing pressure ${(-rateDrag).toFixed(2)}pp in the growth target. Actual output also depends on capacity, energy, exports and uncertainty.`);
 notes.push(`£${n.fiscal.revenue.toFixed(1)}bn receipts and £${n.fiscal.spending.toFixed(1)}bn outlays: ${n.fiscal.balance>=0?'borrowing':'repayment'} of £${Math.abs(n.fiscal.balance).toFixed(1)}bn. Debt interest reprices gradually, not all at once.`);
 n.history.push({month:n.month,gdp:n.realGDP*n.prices,growth:n.growth,inflation:n.inflation,unemployment:n.unemployment,openingDebt,debt:n.debt,borrowing:n.fiscal.balance,revenue:n.fiscal.revenue,spending:n.fiscal.spending,bankRate:n.bankRate,notes});
 return n;
}
