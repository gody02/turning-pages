import type {Action,Effects,LifeState} from './model';
import type {SimulationModule} from './contracts';
import {events} from '../../data/events';
import {random} from './random';
import {cadence,initialiseClock,tickMonth} from './clock';
import {countryOf,validCountry} from '../systems/geography';
import {changeAttributes} from '../systems/character';
import {addConnection,changeBonds,connect} from '../systems/relationships';
import {careerReason,careerAction,advanceCareerYear,advanceEducationYear} from '../systems/careers';
import {settleMonth,settleYear,closeFinancialYear,type FinanceTerms} from '../systems/finance';
import {log,remember} from '../systems/history';
import {applyEffects,eventPool,pickEvent,affordableChoice} from '../systems/events';

export function endLife(g:LifeState,cause:string){g.alive=false;g.cause=cause;g.pending=null;log(g,`Your story closes at age ${g.age}. ${cause}`,'milestone');}
export function createLife(name:string,gender:string,country:string,seed=Date.now()>>>0):LifeState{
 const g:LifeState={version:1,name:name.trim().slice(0,40)||'Alex Morgan',gender:gender.trim().slice(0,40)||'Non-binary',country:validCountry(country)?country:'uk',age:0,stats:{health:90,happiness:80,smarts:50,looks:50},money:0,alive:true,seed:seed>>>0,actions:3,pending:null,seen:[],relationships:[{id:'parent',name:'Robin',role:'Parent',bond:80},{id:'sibling',name:'Jamie',role:'Sibling',bond:65}],education:'preschool',studyYears:0,job:null,jobYears:0,level:0,retired:false,earned:0,lastIncome:0,lastExpenses:0,journal:[]};
 g.stats.smarts=35+Math.floor(random(g)*36);g.stats.looks=35+Math.floor(random(g)*36);
 log(g,`Hello, ${g.name}. Your story begins in ${countryOf(g).name}, surrounded by a family ready to meet you.`,'milestone');return g;
}
export function adultStart<T extends LifeState>(state:T):T{if(state.age!==0)return state;const g=structuredClone(state);g.age=18;g.education='secondary';g.money=3000;g.clock={monthOfYear:0,totalMonths:216,cadence:'year'};g.journal=[{age:18,text:`Your adult story begins after secondary school, with 3,000 ${countryOf(g).currency} to find your feet. Your family and future are still part of this life.`,kind:'milestone'}];return g;}
function birthday(g:LifeState,settleCash:boolean){
 g.age++;if(g.clock)g.clock.totalMonths=g.age*12+g.clock.monthOfYear;g.actions=3;changeBonds(g,-2);changeAttributes(g,{health:g.age>60?-4:g.age>40?-2:-1,happiness:-2});
 if(g.age===6){g.education='school';log(g,'Your first school day: a new bag, a new classroom, a much bigger world.','milestone');}
 if(g.age===18){g.education='secondary';g.money+=3000;log(g,'You finish secondary school. A 3,000 graduation gift helps you begin independent life.','milestone');remember(g,'qualification:secondary','qualification','Completed secondary school.');}
 if(g.age===13){addConnection(g,{id:'friend',name:'Casey',role:'Friend',bond:60});log(g,'You become friends with Casey.','milestone');}
 const wasStudying=g.education==='university';advanceCareerYear(g);advanceEducationYear(g);
 if(settleCash){settleYear(g,wasStudying);if(g.age>=18){log(g,`Yearly income ${g.lastIncome.toLocaleString()}; living, tuition and debt costs ${g.lastExpenses.toLocaleString()}.`,'finance');if(g.money<0)changeAttributes(g,{happiness:-4});}}
 if(g.stats.health<=0)endLife(g,'Your health declined. You leave behind the memories you made.');
 else if(g.age>=100||(g.age>=75&&random(g)<(g.age-74)*.012))endLife(g,'A life of ordinary moments, difficult choices and unexpected joys.');
 if(!g.alive)return;
 const selected=eventPool(events,e=>g.age>=e.min&&g.age<=e.max,g.seen);if(selected.reset)g.seen=[];const e=pickEvent(g,selected.pool);if(e){g.pending=e.id;g.seen.push(e.id);}
}
export function advanceYear<T extends LifeState>(state:T):T{if(!state.alive||state.pending||cadence(state)==='month')return state;const g=structuredClone(state);initialiseClock(g);birthday(g,true);return g;}
export function advanceMonth<T extends LifeState>(state:T,modules:readonly SimulationModule<T>[]=[]):T{
 if(!state.alive||state.pending||modules.some(m=>m.pending?.(state)))return state;
 const g=structuredClone(state);for(const m of modules)m.prepare?.(g);initialiseClock(g);
 for(const m of modules)m.beforeMonth?.(g);
 const terms:FinanceTerms={};for(const m of modules){const t=m.finance?.(g);if(!t)continue;if(t.annualIncome!==undefined){if(terms.annualIncome!==undefined)throw Error('Conflicting income replacement providers');terms.annualIncome=t.annualIncome;}terms.incomeAdjustment=(terms.incomeAdjustment??0)+(t.incomeAdjustment??0);terms.livingMultiplier=(terms.livingMultiplier??1)*(t.livingMultiplier??1);}
 settleMonth(g,terms);const anniversary=tickMonth(g);
 for(const m of modules)m.onMonth?.(g,state);
 if(anniversary){closeFinancialYear(g);birthday(g,false);for(const m of modules)m.afterBirthday?.(g);}
 g.actions=3;for(const m of modules)m.afterMonth?.(g);if(!g.alive)for(const m of modules)m.onDeath?.(g);return g;
}
export function chooseLifeEvent<T extends LifeState>(state:T,index:number):T{
 if(!state.alive)return state;const event=events.find(e=>e.id===state.pending),choice=affordableChoice(state,event?.choices,index);if(!event||!choice)return state;
 const g=structuredClone(state);applyEffects(g,choice.effects);g.pending=null;log(g,`${event.title} — ${choice.result}`,'event');remember(g,`choice:${event.id}:${index}`,'decision',choice.result,'life',[event.id]);if(g.stats.health<=0)endLife(g,'Your health declined.');return g;
}
export function actionReason<T extends LifeState>(g:T,action:Action,modules:readonly SimulationModule<T>[]=[]):string|null{
 if(!g.alive)return 'This life has ended.';if(g.pending)return 'Make your yearly choice first.';
 for(const m of modules){const reason=m.pending?.(g);if(reason)return reason;}
 if(g.actions<=0)return `Your time is spent. Begin the next ${cadence(g)}.`;
 for(const m of modules){const reason=m.restrictAction?.(g,action);if(reason)return reason;}
 if(action.startsWith('connect:')&&!g.relationships.some(r=>r.id===action.split(':')[1]))return 'Relationship unavailable.';
 return careerReason(g,action);
}
export function act<T extends LifeState>(state:T,action:Action,modules:readonly SimulationModule<T>[]=[]):T{
 if(actionReason(state,action,modules))return state;const g=structuredClone(state);for(const m of modules)m.prepare?.(g);g.actions--;
 const simple:Partial<Record<Action,[Effects,string]>>={read:[{smarts:5},'You follow your curiosity through a good book.'],exercise:[{health:6,happiness:2},'You make time to move and feel better for it.'],rest:[{happiness:7,health:2},'You take a real break. The world can wait.'],groom:[{looks:5,happiness:1},'A little self-care puts a spring in your step.'],study:[{smarts:8,happiness:-2},'Focused study makes a difficult subject click.']};
 const item=simple[action];if(item){const e=cadence(g)==='month'?Object.fromEntries(Object.entries(item[0]).map(([k,v])=>[k,Math.sign(v)*Math.max(1,Math.round(Math.abs(v)/3))])):item[0];applyEffects(g,e);log(g,item[1]);}
 careerAction(g,action);
 if(action.startsWith('connect:')){const id=action.split(':')[1];connect(g,id);changeAttributes(g,{happiness:4});log(g,`You spend unhurried time with ${g.relationships.find(r=>r.id===id)!.name}.`);remember(g,`connection:${id}`,'relationship','Made time for this relationship.','life',[id]);}
 for(const m of modules)m.afterAction?.(g,action);return g;
}
