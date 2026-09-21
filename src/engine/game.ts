import { events } from '../data/events';
import { countries, jobs } from '../data/world';
import type { Action, Effects, Game, Stats } from './types';
export const statKeys = ['health', 'happiness', 'smarts', 'looks'] as const;
const clamp = (n: number) => Math.max(0, Math.min(100, n));
const copy = (g: Game): Game => structuredClone(g);
export const countryOf = (g: Game) => countries.find(c => c.id === g.country)!;
export const jobOf = (g: Game) => jobs.find(j => j.id === g.job);
export const salary = (g: Game) => Math.round((jobOf(g)?.salary ?? 0) * countryOf(g).wage * (1 + g.level * .2));
function log(g: Game, text: string, kind: Game['journal'][number]['kind'] = 'action') { g.journal.unshift({ age:g.age, text, kind }); }
function random(g: Game) { g.seed = (Math.imul(g.seed, 1664525) + 1013904223) >>> 0; return g.seed / 4294967296; }
function effects(g: Game, e: Effects) {
  for (const key of statKeys) g.stats[key] = clamp(g.stats[key] + (e[key] ?? 0));
  g.money += e.money ?? 0;
  g.relationships.forEach(r => r.bond = clamp(r.bond + (e.bond ?? 0)));
}
function die(g: Game, cause: string) { g.alive = false; g.cause = cause; g.pending = null; log(g, `Your story closes at age ${g.age}. ${cause}`, 'milestone'); }
export function createGame(name: string, gender: string, country: string, seed = Date.now() >>> 0): Game {
  const g: Game = { version:1, name:name.trim().slice(0,40) || 'Alex Morgan', gender:gender.trim().slice(0,40) || 'Non-binary', country:countries.some(c=>c.id===country)?country:'uk', age:0,
    stats:{health:90,happiness:80,smarts:50,looks:50}, money:0, alive:true, seed:seed>>>0, actions:3, pending:null, seen:[],
    relationships:[{id:'parent',name:'Robin',role:'Parent',bond:80},{id:'sibling',name:'Jamie',role:'Sibling',bond:65}],
    education:'preschool', studyYears:0, job:null, jobYears:0, level:0, retired:false, earned:0, lastIncome:0,lastExpenses:0,journal:[] };
  g.stats.smarts = 35 + Math.floor(random(g)*36); g.stats.looks = 35 + Math.floor(random(g)*36);
  log(g, `Hello, ${g.name}. Your story begins in ${countryOf(g).name}, surrounded by a family ready to meet you.`, 'milestone'); return g;
}
export function ageUp(state: Game): Game {
  if(state.politics?.active)return state;
  return advanceLifeYear(state,true);
}
// Political months settle cash themselves; this performs exactly one birthday.
export function politicalBirthday(state:Game):Game{return advanceLifeYear(state,false);}
function advanceLifeYear(state:Game,settleCash:boolean):Game{
  if (!state.alive || state.pending) return state;
  const g = copy(state); g.age++; g.actions=3;
  g.relationships.forEach(r=>r.bond=clamp(r.bond-2));
  effects(g,{health:g.age>60?-4:g.age>40?-2:-1,happiness:-2});
  if(g.age===6){g.education='school';log(g,'Your first school day: a new bag, a new classroom, a much bigger world.','milestone');}
  if(g.age===18){g.education='secondary';g.money+=3000;log(g,'You finish secondary school. A 3,000 graduation gift helps you begin independent life.','milestone');}
  if(g.age===13){g.relationships.push({id:'friend',name:'Casey',role:'Friend',bond:60});log(g,'You become friends with Casey.','milestone');}
  if(settleCash){g.lastIncome=0;g.lastExpenses=0;}
  if(g.age>=18){
    if(g.job && !g.retired){g.jobYears++;if(g.jobYears%3===0 && g.stats.smarts>=40 && g.level<5){g.level++;log(g,`Your work earns a promotion to career level ${g.level+1}.`,'milestone');}if(settleCash)g.lastIncome=salary(g);}
    else if(g.retired&&settleCash)g.lastIncome=Math.round(12000*countryOf(g).wage);
    if(settleCash)g.lastExpenses=countryOf(g).living;
    if(g.education==='university'){if(settleCash)g.lastExpenses+=countryOf(g).tuition;g.studyYears++;effects(g,{smarts:5});if(g.studyYears>=3){g.education='degree';log(g,'Three years of study pay off: you graduate from university.','milestone');}}
    if(settleCash){const interest=Math.round(Math.max(0,-g.money)*.05);g.lastExpenses+=interest;g.money+=g.lastIncome-g.lastExpenses;g.earned+=g.lastIncome;log(g,`Yearly income ${g.lastIncome.toLocaleString()}; living, tuition and debt costs ${g.lastExpenses.toLocaleString()}.`,'finance');if(g.money<0)effects(g,{happiness:-4});}
  }
  if(g.stats.health<=0)die(g,'Your health declined. You leave behind the memories you made.');
  else if(g.age>=100 || (g.age>=75 && random(g)<(g.age-74)*.012))die(g,'A life of ordinary moments, difficult choices and unexpected joys.');
  if(!g.alive)return g;
  let pool=events.filter(e=>g.age>=e.min && g.age<=e.max && !g.seen.includes(e.id));
  if(!pool.length){g.seen=[];pool=events.filter(e=>g.age>=e.min && g.age<=e.max);}
  const e=pool[Math.floor(random(g)*pool.length)];g.pending=e.id;g.seen.push(e.id);return g;
}
export function choose(state: Game, index: number): Game {
  if(!state.alive)return state;
  const event=events.find(e=>e.id===state.pending);const choice=event?.choices[index];
  if(!event || !choice || (choice.effects.money ?? 0)<-Math.max(state.money,0))return state;
  const g=copy(state);effects(g,choice.effects);g.pending=null;log(g,`${event.title} — ${choice.result}`,'event');if(g.stats.health<=0)die(g,'Your health declined.');return g;
}
export function actionReason(g: Game, action: Action): string | null {
  if(!g.alive)return 'This life has ended.';
  if(g.pending)return 'Make your yearly choice first.';
  if(g.politics?.pending)return 'Resolve your political dilemma first.';
  if(g.actions<=0)return 'Your time is spent. Begin the next year.';
  if(action==='university' && (g.age<18 || g.education!=='secondary'))return 'Requires completion of secondary school.';
  if(action==='university'&&g.politics&&['mp','minister','premier'].includes(g.politics.role))return 'Resign parliamentary office before full-time university study.';
  if(action==='study' && !['school','university'].includes(g.education))return 'Available while enrolled in school.';
  if(action==='retire' && (g.age<65 || g.retired))return 'Retirement is available from age 65.';
  if(action==='retire'&&g.politics&&g.politics.role!=='activist')return 'Resign your elected office before retiring.';
  if(action.startsWith('connect:') && !g.relationships.some(r=>r.id===action.split(':')[1]))return 'Relationship unavailable.';
  if(action.startsWith('job:')){
    if(g.politics&&['mp','minister','premier'].includes(g.politics.role))return 'Resign your parliamentary office before taking outside employment.';
    const j=jobs.find(j=>j.id===action.split(':')[1]);if(!j)return 'Unknown career.';
    if(g.age<18)return 'Careers open at age 18.';
    if(g.retired)return 'You have retired.';
    if(g.education==='university')return 'Complete university before a full-time career.';
    if(g.job===j.id)return 'Your current career.';
    if(g.stats.smarts<j.smarts)return `Requires ${j.smarts} smarts.`;
    if(j.degree && g.education!=='degree')return 'Requires a university degree.';
  }
  return null;
}
export function act(state: Game, action: Action): Game {
  if(actionReason(state,action))return state;const g=copy(state);g.actions--;
  const simple: Partial<Record<Action,[Effects,string]>>={read:[{smarts:5},'You follow your curiosity through a good book.'],exercise:[{health:6,happiness:2},'You make time to move and feel better for it.'],rest:[{happiness:7,health:2},'You take a real break. The world can wait.'],groom:[{looks:5,happiness:1},'A little self-care puts a spring in your step.'],study:[{smarts:8,happiness:-2},'Focused study makes a difficult subject click.']};
  const item=simple[action];if(item){const e=g.politics?Object.fromEntries(Object.entries(item[0]).map(([k,v])=>[k,Math.sign(v)*Math.max(1,Math.round(Math.abs(v)/3))])):item[0];effects(g,e);log(g,item[1]);}
  if(action==='university'){g.education='university';g.studyYears=0;g.job=null;g.level=0;g.jobYears=0;log(g,'You enrol at university. Tuition will be charged for the next three years.','milestone');}
  if(action==='retire'){g.retired=true;g.job=null;log(g,'You retire. A modest annual pension begins next year.','milestone');}
  if(action.startsWith('job:')){g.job=action.split(':')[1];g.jobYears=0;g.level=0;log(g,`You begin a new chapter as a ${jobOf(g)!.name.toLowerCase()}.`,'milestone');}
  if(action.startsWith('connect:')){const r=g.relationships.find(r=>r.id===action.split(':')[1])!;r.bond=clamp(r.bond+12);effects(g,{happiness:4});if(g.politics&&r.id==='political-mentor'){g.politics.caucus=clamp(g.politics.caucus+3);g.politics.knowledge=clamp(g.politics.knowledge+2);}if(g.politics&&r.id==='political-rival')g.politics.caucus=clamp(g.politics.caucus+2);log(g,`You spend unhurried time with ${r.name}.`);}
  return g;
}
export function averageStats(g: Game) { return Math.round(Object.values(g.stats).reduce((a,b)=>a+b,0)/4); }
