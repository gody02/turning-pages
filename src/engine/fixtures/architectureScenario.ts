// Shared deterministic scenario, also run against the untouched fe8c20f archive to produce the golden fixture.
import {createGame,ageUp,act,choose} from '../game';
import {adultStart,joinPolitics,choosePoliticalEvent,advancePoliticalMonth,politicalTask,politicalTaskReason} from '../politics';
import {nationalAction} from '../national';
import {events} from '../../data/events';
import type {Game} from '../types';
function resolve(g:Game){if(g.pending){const e=events.find(e=>e.id===g.pending)!;g=choose(g,e.choices.findIndex(c=>(c.effects.money??0)>=-Math.max(0,g.money)));}if(g.politics?.pending)g=choosePoliticalEvent(g,0);return g;}
export function observable(g:Game){const p=g.politics,n=p?.national,t=p?.economy;return {
 age:g.age,alive:g.alive,seed:g.seed,stats:g.stats,money:g.money,earned:g.earned,lastIncome:g.lastIncome,lastExpenses:g.lastExpenses,education:g.education,studyYears:g.studyYears,job:g.job,jobYears:g.jobYears,level:g.level,retired:g.retired,pending:g.pending,seen:g.seen,actions:g.actions,
 relationships:g.relationships.map(({id,name,role,bond})=>({id,name,role,bond})),
 politics:p?{role:p.role,months:p.months,reputation:p.reputation,integrity:p.integrity,organisation:p.organisation,knowledge:p.knowledge,caucus:p.caucus,unions:p.unions,enterprise:p.enterprise,support:p.support,campaignFunds:p.campaignFunds,seats:p.seats,inGovernment:p.inGovernment,pending:p.pending,seen:p.seen,memories:p.memories,laws:p.laws,lastIncome:p.lastIncome,lastExpenses:p.lastExpenses,yearIncome:p.yearIncome,yearExpenses:p.yearExpenses,elections:p.elections}:null,
 nation:n?{month:n.month,seed:n.seed,realGDP:n.realGDP,prices:n.prices,debt:n.debt,inflation:n.inflation,unemployment:n.unemployment,bankRate:n.bankRate,budget:n.budget,enacted:n.enacted,divisions:n.divisions,banks:n.institutions?.banks,regions:n.institutions?.regions,factions:n.institutions?.factions}:null,
 town:t?{month:t.month,fund:t.fund,outside:t.outside,seed:t.seed,households:t.households,employers:t.employers,insulation:t.insulation,ledgerLength:t.ledger.length}:null,
 };}
export function architectureScenarios(){
 const result=[];let ordinary:Game=createGame('Golden','Non-binary','ca',23);
 for(let i=0;i<35;i++){ordinary=resolve(ageUp(ordinary));if(ordinary.age===18)ordinary=act(ordinary,'job:barista');if(ordinary.alive)ordinary=act(ordinary,'exercise');}result.push(observable(ordinary));
 let g:Game=adultStart(createGame('Golden','Non-binary','uk',7));g.job='barista';g=joinPolitics(g,'labour','marx');
 for(let i=0;i<48&&g.alive;i++){
  g=resolve(g);for(let action=0;action<3&&g.actions>0;action++){
   const p=g.politics!;let task='family';
   if(!politicalTaskReason(g,'leadership'))task='leadership';else if(!politicalTaskReason(g,'seekOffice'))task='seekOffice';else if(!politicalTaskReason(g,'nominateParliament'))task='nominateParliament';else if(!politicalTaskReason(g,'nominateCouncil')&&p.months<6)task='nominateCouncil';else if(p.organisation<90)task='organise';else if(p.reputation<90||p.support<90)task=g.money>=30?'canvass':'casework';else if(p.caucus<90)task='negotiate';else if(p.knowledge<80)task='study';else if(p.campaignFunds<2000)task='fundraise';g=politicalTask(g,task);
  }g=advancePoliticalMonth(g);if([0,11,23,47].includes(i))result.push(observable(g));
 }
 g=resolve(g);g=nationalAction(g,'budget',undefined,{...g.politics!.national!.budget,vat:22});
 for(let i=0;i<5;i++){g=resolve(g);g=nationalAction(g,'lobby');g=resolve(advancePoliticalMonth(g));g=nationalAction(g,'advance');}result.push(observable(g));
 return result;
}
