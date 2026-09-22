import {describe,it,expect} from 'vitest';
import {createLife,adultStart,advanceMonth,advanceYear,act,chooseLifeEvent} from './core/life';
import type {LifeState} from './core/model';
import type {SimulationModule} from './core/contracts';
import {validLife} from './core/validation';
import {lifeMonth} from './core/clock';
import {events} from '../data/events';
import {eventPool,pickEvent} from './systems/events';
import {hasFact,remember} from './systems/history';
import {setReputation,setSkill,addTrait,changeFame} from './systems/character';
import {salary} from './systems/careers';
import {transferCash} from './systems/finance';
import {bankAssets,bankLiabilities,stepBanks,type BankingBook} from './systems/banking';
import {joinPolitics,choosePoliticalEvent,advancePoliticalMonth} from './politics';
import {politicalSystems} from './simulation';
import {isGame,loadGame,saveGame,SAVE_KEY,PRE_ARCHITECTURE_SAVE_KEY} from './save';
import {architectureScenarios} from './fixtures/architectureScenario';
import golden from './fixtures/architecture-baseline.json';
import legacy from './fixtures/life-v1.json';

function resolve<T extends LifeState>(g:T):T{const event=events.find(e=>e.id===g.pending);return event?chooseLifeEvent(g,event.choices.findIndex(c=>(c.effects.money??0)>=-Math.max(0,g.money))):g;}
describe('independent life systems',()=>{
 it('matches frozen pre-refactor annual life, four-year career, election, banking and Budget outcomes',()=>{expect(JSON.parse(JSON.stringify(architectureScenarios()))).toEqual(golden);},15000);
 it('runs monthly jobs, promotions, qualifications and finances with no politics installed',()=>{
  let g=act(adultStart(createLife('Core','Woman','ca',4)),'job:barista');const initialMoney=g.money;
  for(let m=0;m<36;m++){g=resolve(advanceMonth(g));expect(validLife(g)).toBe(true);expect('politics' in g).toBe(false);}
  expect(g.age).toBe(21);expect(g.jobYears).toBe(3);expect(g.level).toBe(1);expect(g.clock?.totalMonths).toBe(252);expect(g.money).toBeGreaterThan(initialMoney);expect(g.earned).toBeCloseTo(100050.12,2);expect(g.finances!.yearIncome).toBe(0);expect(salary(g)).toBe(40020);
  let student=act(adultStart(createLife('Student','Man','nz',5)),'university');for(let m=0;m<36;m++)student=resolve(advanceMonth(student));expect(student.education).toBe('degree');expect(student.studyYears).toBe(3);expect(hasFact(student,'qualification:degree')).toBe(true);
 });
 it('keeps monthly cash settlement separate from one annual milestone',()=>{let g=adultStart(createLife('Core','Man','uk',9));g.job='barista';g.money=200000;for(let m=0;m<11;m++)g=resolve(advanceMonth(g));const before=structuredClone(g);g=advanceMonth(g);expect(g.age-before.age).toBe(1);expect(g.money-before.money).toBeCloseTo(1916.67-1250,2);expect(g.jobYears).toBe(1);expect(advanceYear(resolve(g))).toEqual(resolve(g));expect(g.finances!.yearIncome).toBe(0);});
 it('injects another life-path policy through hooks without a UK state or a special birthday function',()=>{
  type Apprentice=LifeState&{training:{months:number;pending:boolean}};
  const module:SimulationModule<Apprentice>={id:'test.apprenticeship',pending:g=>g.training.pending?'Resolve training choice':null,finance:()=>({annualIncome:12000}),onMonth:g=>{g.training.months++;},restrictAction:(_g,a)=>a==='job:barista'?'Training contract':null};
  const g:Apprentice={...adultStart(createLife('Learner','Woman','ca',2)),training:{months:0,pending:false}};
  expect(act(g,'job:barista',[module])).toBe(g);const next=advanceMonth(g,[module]);expect(next.training.months).toBe(1);expect(next.finances!.lastIncome).toBe(1000);expect(g.training.months).toBe(0);next.training.pending=true;expect(advanceMonth(next,[module])).toBe(next);
 });
 it('refuses competing replacement-income providers instead of silently double-paying',()=>{const g=adultStart(createLife('Core','Man','ca',1)),before=structuredClone(g);expect(()=>advanceMonth(g,[{id:'a',finance:()=>({annualIncome:12000})},{id:'b',finance:()=>({annualIncome:24000})}])).toThrow('Conflicting income');expect(g).toEqual(before);});
 it('freezes the generic monthly clock after death',()=>{const g=adultStart(createLife('Core','Man','uk',1));g.alive=false;expect(advanceMonth(g)).toBe(g);expect(act(g,'rest')).toBe(g);expect(chooseLifeEvent(g,0)).toBe(g);});
 it('preserves decades-old facts for later event eligibility after save/restore',()=>{
  let g=createLife('Long memory','Non-binary','nz',7);remember(g,'childhood:promise','decision','A promise made early in life.');
  for(let year=0;year<40;year++)g=act(resolve(advanceYear(g)),'exercise');
  const restored=JSON.parse(JSON.stringify(g)) as LifeState;expect(validLife(restored)).toBe(true);expect(restored.facts!.find(f=>f.id==='childhood:promise')!.atMonth).toBe(0);
  const pool=eventPool([{id:'old-promise'},{id:'unrelated'}],e=>e.id==='old-promise'&&restored.age>=40&&hasFact(restored,'childhood:promise'),[]);expect(pickEvent(restored,pool.pool)!.id).toBe('old-promise');expect(hasFact(restored,'childhood:promise')).toBe(true);
 });
 it('keeps traits, skills, fame and other reputations when entering a political career',()=>{const g=adultStart(createLife('Core','Woman','uk',2));setReputation(g,'medicine',72);setSkill(g,'negotiation',68);addTrait(g,'patient');changeFame(g,15);let joined=joinPolitics(g,'labour','smith');joined=choosePoliticalEvent(joined,0);joined=advancePoliticalMonth(joined);expect(joined.development!.reputation.medicine).toBe(72);expect(joined.development!.skills.negotiation).toBe(68);expect(joined.development!.traits).toContain('patient');expect(joined.development!.fame).toBe(15);expect(joined.development!.reputation['politics.uk']).toBe(joined.politics!.reputation);expect(g.development!.reputation['politics.uk']).toBeUndefined();});
 it('enters politics mid-year without resetting the life clock or delaying a birthday',()=>{let g=adultStart(createLife('Core','Man','uk',4));for(let m=0;m<4;m++)g=resolve(advanceMonth(g));let joined=joinPolitics(g,'labour','socratic');expect(joined.politics!.startMonth).toBe(4);for(let m=0;m<8;m++){joined=resolve(joined);joined=choosePoliticalEvent(joined,0);joined=advancePoliticalMonth(joined);}expect(joined.age).toBe(19);expect(joined.politics!.months).toBe(8);expect(lifeMonth(joined)).toBe(228);expect(isGame(joined)).toBe(true);});
 it('reuses transaction and bank accounting outside any political state',()=>{
  const balances={a:80,b:20};const amount=transferCash({get:()=>balances.a,set:v=>{balances.a=v;}},{get:()=>balances.b,set:v=>{balances.b=v;}},100);expect(amount).toBe(80);expect(balances.a+balances.b).toBe(100);
  const book:BankingBook={month:1,credit:1,cashOutside:0,publicCost:0,bankLog:[],banks:[{id:'test',name:'Test lender',mortgages:1400,business:600,reserves:250,gilts:300,deposits:2300,wholesale:100,central:0,equity:150,mortgageRate:4.8,loanRate:6.5,arrears:1.2,newCredit:0,losses:0,status:'Operating'}]};
  stepBanks(book,{bankRate:3.75,confidence:55,unemployment:4.9},{capitalBuffer:11,creditMultiplier:1,bankCreditMultipliers:{},mortgageShares:{test:.7},affordabilityMultiplier:1,lossMultiplier:1,operatingMultiplier:1,withdrawalMultiplier:1},()=>.5,()=>{});expect(bankAssets(book.banks[0])).toBeCloseTo(bankLiabilities(book.banks[0]),8);expect(book.bankLog).toHaveLength(1);
 });
 it('preserves legacy load bytes and refuses the first architecture overwrite if recovery fails',()=>{
  const raw=JSON.stringify(legacy),data=new Map([[SAVE_KEY,raw]]),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);}};expect(loadGame(storage).game).toEqual(legacy);const next=advanceMonth(loadGame(storage).game!);expect(saveGame(storage,next)).toBeNull();expect(data.get(PRE_ARCHITECTURE_SAVE_KEY)).toBe(raw);expect(isGame(loadGame(storage).game)).toBe(true);
  const blocked={getItem:(k:string)=>k===SAVE_KEY?raw:null,setItem:()=>{throw Error('Quota');}};expect(saveGame(blocked,next)).toBeTruthy();expect(blocked.getItem(SAVE_KEY)).toBe(raw);
 });
 it('rejects corrupt generic clocks, future facts, relationship types and character scores',()=>{const g=advanceMonth(adultStart(createLife('Core','Man','uk',2)));expect(validLife({...g,clock:{...g.clock,monthOfYear:12}})).toBe(false);expect(validLife({...g,clock:{...g.clock,totalMonths:0}})).toBe(false);expect(validLife({...g,facts:[{id:'x',atMonth:999,source:'life',kind:'decision',detail:'x',tags:[]}]})).toBe(false);expect(validLife({...g,development:{traits:[],skills:{x:NaN},reputation:{},fame:0}})).toBe(false);expect(validLife({...g,relationships:[{...g.relationships[0],kind:'minister'}]})).toBe(false);});
 it('registers only the implemented UK political system',()=>{expect(politicalSystems.map(s=>[s.id,s.country])).toEqual([['politics.uk','uk']]);});
});
describe('dependency direction',()=>{
 const sources=import.meta.glob<string>(['./core/**/*.ts','./systems/**/*.ts','../data/world.ts','../data/events.ts'],{eager:true,query:'?raw',import:'default'});
 it('keeps shared systems and their data free of UK, app composition, UI and compatibility-facade imports',()=>{
  for(const [path,source] of Object.entries(sources)){
   const imports=[...source.matchAll(/(?:from\s+|import\s*)['"]([^'"]+)['"]/g)].map(m=>m[1]);
   for(const dependency of imports){expect(dependency,`${path} imports ${dependency}`).not.toMatch(/politics|national|institutions|\/types$|\/game$|simulation|\/ui\//);}
  }
 });
 it('keeps the UK adapter from implementing birthdays and personal salary settlement',()=>{const uk=import.meta.glob<string>('./politics/uk/politics.ts',{eager:true,query:'?raw',import:'default'});const source=Object.values(uk)[0];expect(source).not.toMatch(/politicalBirthday|g\.age\+\+|g\.earned\s*=|g\.money\s*=|g\.jobYears\+\+/);});
});
