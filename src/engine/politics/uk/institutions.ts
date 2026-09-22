import {stepBanks,type Bank} from '../../systems/banking';
export {bankAssets,bankLiabilities,capitalRatio,mortgagePayment,type Bank} from '../../systems/banking';
import { nationalLaws,baselineBudget,type NationalLaw,type Budget } from '../../../data/national';
import type { NationalState,Proposal } from './national';
import type { PartyId } from '../../../data/politics';
export type BillDesign={scope:'uk'|'england'|'agreement'|'override';delivery:'standard'|'accelerated';sunset:0|60;scale:.5|1|1.5};
export const defaultDesign:BillDesign={scope:'uk',delivery:'standard',sunset:0,scale:1};
export type Region={id:string;name:string;populationRatio:number;baseGrant:number;grant:number;ownRevenue:number;trust:number;autonomy:number;healthShare:number;educationShare:number;health:number;skills:number;pressure:number;consent:string|null};
export type Faction={id:string;name:string;side:'own'|'opposition';seats:number;priority:string;trust:number;discipline:number;grievance:number;promise:string|null;promiseDue:number;lastAyes:number;lastNoes:number};
export type Institutions={version:1;introduced:number;month:number;banks:Bank[];regions:Region[];factions:Faction[];seatBasis:number;party:PartyId;whip:'free'|'normal'|'three-line';credit:number;cashOutside:number;publicCost:number;bankLog:{month:number;bank:string;created:number;repaid:number;losses:number;support:number}[];minutes:{month:number;text:string}[];evidence:number;consultation:number;judicialRisk:number};
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export function createInstitutions(month:number,seats=0,party:PartyId='labour'):Institutions{
 const i:Institutions={version:1,introduced:month,month,banks:[['highstreet','Mere Bank',.55],['regional','Union Mutual',.3],['commercial','Foundry Commercial',.15]].map(([id,name,weight])=>{const w=Number(weight);return {id:String(id),name:String(name),mortgages:1400*w,business:600*w,reserves:250*w,gilts:300*w,deposits:2300*w,wholesale:100*w,central:0,equity:150*w,mortgageRate:4.8,loanRate:6.5,arrears:1.2,newCredit:0,losses:0,status:'Operating'};}),regions:[
 {id:'scotland',name:'Scotland',populationRatio:.096,baseGrant:50,grant:50,ownRevenue:22,trust:55,autonomy:70,healthShare:.48,educationShare:.26,health:56,skills:57,pressure:25,consent:null},
 {id:'wales',name:'Wales',populationRatio:.055,baseGrant:22,grant:22,ownRevenue:6,trust:60,autonomy:60,healthShare:.5,educationShare:.24,health:52,skills:54,pressure:30,consent:null},
 {id:'ni',name:'Northern Ireland',populationRatio:.034,baseGrant:17,grant:17,ownRevenue:2,trust:50,autonomy:65,healthShare:.49,educationShare:.25,health:50,skills:55,pressure:35,consent:null}],factions:[],seatBasis:seats,party,whip:'normal',credit:1,cashOutside:0,publicCost:0,bankLog:[],minutes:[],evidence:0,consultation:0,judicialRisk:15};
 rebalanceFactions(i,seats,party);return i;
}
const groups=[['pragmatists','Governing pragmatists','Services'],['labour','Organised labour caucus','Work'],['fiscal','Fiscal conservatives','Banking'],['green','Climate and regional reformers','Energy'],['liberties','Civil liberties group','Justice']] as const;
export function rebalanceFactions(i:Institutions,seats:number,party:PartyId){
 if(i.factions.length&&i.seatBasis===seats&&i.party===party)return;
 const weights:Record<PartyId,number[]>={labour:[.34,.28,.13,.15,.10],conservative:[.3,.07,.39,.09,.15],liberal:[.35,.12,.17,.17,.19],green:[.2,.18,.05,.45,.12],assembly:[.2,.45,.04,.21,.10]};
 const previous=i.factions;i.factions=[];
 for(const side of ['own','opposition'] as const){const total=side==='own'?seats:650-seats;let remaining=total;groups.forEach(([id,name,priority],index)=>{const count=index===4?remaining:Math.floor(total*(side==='own'?weights[party][index]:[.27,.17,.26,.15,.15][index]));remaining-=count;const old=previous.find(f=>f.id===`${side}-${id}`);i.factions.push({id:`${side}-${id}`,name:`${side==='opposition'?'Opposition · ':''}${name}`,side,seats:count,priority,trust:old?.trust??(side==='own'?55:35),discipline:old?.discipline??(side==='own'?75:60),grievance:old?.grievance??0,promise:old?.promise??null,promiseDue:old?.promiseDue??0,lastAyes:0,lastNoes:0});});}
 i.seatBasis=seats;i.party=party;
}
export function devolvedLaw(law:NationalLaw){return ['Housing','Services','Transport','Environment','Culture','Justice'].includes(law.area);}
export function consentRegions(law:NationalLaw){return !devolvedLaw(law)?[]:law.area==='Justice'?['scotland','ni']:['scotland','wales','ni'];}
export function designFor(law:NationalLaw,design?:BillDesign):BillDesign{const d={...(design??defaultDesign)};d.scope=devolvedLaw(law)?(design?.scope==='uk'?'agreement':design?.scope??'england'):'uk';return d;}
export function validDesign(d:unknown):d is BillDesign{if(!d||typeof d!=='object')return false;const x=d as BillDesign;return ['uk','england','agreement','override'].includes(x.scope)&&['standard','accelerated'].includes(x.delivery)&&[0,60].includes(x.sunset)&&[.5,1,1.5].includes(x.scale);}
export function lawCost(law:NationalLaw,intensity:number,design?:BillDesign){return law.cost*intensity*(design?.delivery==='accelerated'?1.25:1)*lawExtent(law,design);}
export function lawDelay(law:NationalLaw,design?:BillDesign){return Math.max(2,Math.ceil(law.delay*(design?.delivery==='accelerated'?.65:1)));}
export function lawExtent(law:NationalLaw,design?:BillDesign){return design?.scope==='england'?(law.area==='Justice'?.89:.84):1;}
export function regionGrant(r:Region,b:Budget,prices:number){const comparable=(b.health-baselineBudget.health)+(b.education-baselineBudget.education)+(b.transport-baselineBudget.transport)*.9;return Math.max(r.baseGrant*.5,r.baseGrant*prices+comparable*r.populationRatio);}
export function lawActive(law:{month:number;design?:BillDesign},month:number){return !law.design?.sunset||month<law.month+law.design.sunset;}
export function ensureInstitutions(n:NationalState,seats=0,party:PartyId='labour'){
 n.institutions??=createInstitutions(n.month,seats,party);return n.institutions;
}
function minute(i:Institutions,text:string){i.minutes.unshift({month:i.month,text});i.minutes=i.minutes.slice(0,160);}
export function stepInstitutions(n:NationalState,random:()=>number,notes:string[]){
 const i=ensureInstitutions(n);i.month=n.month;i.publicCost=0;
 const strength=(id:string)=>n.enacted.find(l=>l.id===id&&l.delivered&&lawActive(l,n.month))?.intensity??0;
 stepBanks(i,n,{capitalBuffer:11+3*strength('bankcapital'),creditMultiplier:1+.12*strength('smecredit'),bankCreditMultipliers:{regional:1+.1*strength('mutuals')},mortgageShares:{commercial:.3,regional:.8,highstreet:.7},affordabilityMultiplier:1-.1*strength('consumercredit'),lossMultiplier:1-.25*strength('mortgagecare'),operatingMultiplier:1+.1*strength('digitalfraud'),withdrawalMultiplier:(1-.15*strength('resolution'))*(1-.1*strength('digitalfraud'))},random,event=>{
  if(event.kind==='liquidity')minute(i,`${event.bank} borrows £${event.amount.toFixed(2)}bn against eligible collateral. Liquidity support is a liability, not free capital.`);
  else minute(i,`${event.bank}: creditors absorb £${event.bailIn!.toFixed(2)}bn; statutory resolution support costs £${event.amount.toFixed(2)}bn. Deposits remain available in this simplified resolution model.`);
 });
 for(const r of i.regions){
  r.grant=regionGrant(r,n.budget,n.prices);
  r.ownRevenue=(r.id==='scotland'?22:r.id==='wales'?6:2)*(n.realGDP/3050)*n.prices;
  const total=r.grant+r.ownRevenue;
  // Devolved administrations choose allocation; Westminster cannot prescribe it from a spending slider.
  if(random()<.12){r.healthShare=clamp(r.healthShare+(r.health<55?.005:-.003),.38,.58);r.educationShare=clamp(r.educationShare+(r.skills<55?.003:-.002),.18,.30);}
  const base=r.baseGrant+(r.id==='scotland'?22:r.id==='wales'?6:2);
  r.health=clamp(r.health+((total*r.healthShare)/(base*.49*n.prices)-1)*.45,0,100);
  r.skills=clamp(r.skills+((total*r.educationShare)/(base*.25*n.prices)-1)*.25,0,100);
  r.pressure=clamp(r.pressure+(55-r.health)*.02+(55-r.skills)*.01+(50-r.trust)*.01,0,100);
 }
 for(const f of i.factions){
  f.grievance=clamp(f.grievance+(n.unemployment>7?.2:-.05),0,100);
  if(f.promise&&i.month>=f.promiseDue){const kept=n.enacted.some(l=>nationalLaws.find(x=>x.id===l.id)?.area===f.promise&&l.month>=f.promiseDue-12);f.trust=clamp(f.trust+(kept?8:-12),0,100);f.grievance=clamp(f.grievance+(kept?-5:12),0,100);minute(i,`${f.name}: ${kept?'your legislative commitment was fulfilled':'an unfulfilled commitment damages trust'}.`);f.promise=null;}
 }
 i.evidence=Math.max(0,i.evidence-.2);i.consultation=Math.max(0,i.consultation-.1);
 if(i.credit<.8)notes.push('Capital constraints tighten new lending. Weaker credit will weigh on investment and housing demand.');
 if(i.publicCost>0)notes.push(`Bank resolution adds £${i.publicCost.toFixed(2)}bn to this month’s public outlays.`);
}
export function factionDivision(n:NationalState,proposal:Proposal,context:{seats:number;party:PartyId;caucus:number;integrity:number},controversy:number,random:()=>number){
 const i=ensureInstitutions(n,context.seats,context.party);rebalanceFactions(i,context.seats,context.party);
 const swing=(random()-.5)*.12;let ayes=0,noes=0,abstain=0;
 for(const f of i.factions){f.lastAyes=0;f.lastNoes=0;const own=f.side==='own';const match=factionAssessment(n,proposal,f).adjustment;
  const discipline=i.whip==='three-line'?.11:i.whip==='free'?-.12:.02;
  const chance=clamp((own?.48+context.caucus*.0035+discipline:.13+context.integrity*.001)+f.trust*.0015+(f.discipline-60)*.001+proposal.support*.005+match-controversy*.0018-f.grievance*.002+swing,.02,.98);
  for(let seat=0;seat<f.seats;seat++){if(random()<.025){abstain++;continue;}if(random()<chance){ayes++;f.lastAyes++;}else{noes++;f.lastNoes++;}}
  if(own&&i.whip==='three-line'&&f.lastNoes>0){f.grievance=clamp(f.grievance+3,0,100);f.trust=clamp(f.trust-1,0,100);}
 }
 return {ayes,noes,abstain};
}
export function factionAssessment(n:NationalState,p:Proposal,f:Faction){
 const law=p.kind==='law'?nationalLaws.find(l=>l.id===p.id):undefined;
 let adjustment=f.priority===(law?.area??'Banking')?.1:0;
 const reasons:string[]=[];
 if(adjustment)reasons.push('Addresses their main policy priority');
 if(f.priority==='Banking'&&law){const cost=lawCost(law,p.intensity,p.design);adjustment-=Math.min(.16,cost/150);reasons.push('Concerned about recurring spending and financing');}
 if(f.priority==='Work'&&law?.effect.rights){adjustment+=Math.min(.12,law.effect.rights*p.intensity*.01);reasons.push('Values stronger workplace and social protections');}
 if(f.priority==='Energy'&&law?.effect.energy&&law.effect.energy<0){adjustment+=.1;reasons.push('Supports reducing exposure to energy shortages');}
 if(f.priority==='Justice'&&p.design?.scope==='override'){adjustment-=.18;reasons.push('Opposes proceeding without devolved agreement');}
 if(f.priority==='Services'&&p.design?.delivery==='accelerated'&&n.skills<60){adjustment-=.08;reasons.push('Questions whether delivery capacity can meet the timetable');}
 if(p.kind==='budget'&&p.budget&&f.priority==='Work'){adjustment+=clamp((p.budget.welfare-n.budget.welfare)/200,-.12,.12);reasons.push('Weighs changes to social protection');}
 return {adjustment,reasons:reasons.length?reasons:['Party strategy, relationships and scrutiny shape their position']};
}
