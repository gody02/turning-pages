import {describe,expect,it} from 'vitest';
import {adultStart as coreAdultStart,advanceMonth as advanceCoreMonth,advanceYear,chooseLifeEvent,createLife} from './core/life';
import {addDays,addMonths,addYears,ageOn,compareDates,dateFromOrdinal,dateToOrdinal,daysInMonth,isLeapYear,isMonthPrecisionDate,isSimulationDate,lifeMonth,MAX_SIMULATION_YEAR,MIN_SIMULATION_YEAR,monthsBetween,SIMULATION_START_DATE} from './core/clock';
import {validLife} from './core/validation';
import {adultStart,advanceMonth,ageUp,choose,createGame} from './simulation';
import {advancePoliticalMonth,choosePoliticalEvent,joinPolitics,leavePolitics} from './politics';
import {loadGame,migrateGame,PRE_DAY_PRECISION_SAVE_KEY,PRE_SIMULATION_CLOCK_SAVE_KEY,saveGame,SAVE_KEY} from './save';
import {events} from '../data/events';
import lifeV1 from './fixtures/life-v1.json';
import type {Game,LifeState} from './types';

function resolveLife<T extends LifeState>(g:T):T{const event=events.find(e=>e.id===g.pending);return event?chooseLifeEvent(g,event.choices.findIndex(c=>(c.effects.money??0)>=-Math.max(0,g.money))):g;}
function resolveGame(g:Game){if(!g.pending)return g;const event=events.find(e=>e.id===g.pending),choice=event?.choices.findIndex(c=>(c.effects.money??0)>=-Math.max(0,g.money))??0;return choose(g,choice<0?0:choice);}

describe('universal simulation clock',()=>{
 it('supports the complete bounded proleptic Gregorian calendar without year zero',()=>{
  expect(MIN_SIMULATION_YEAR).toBe(1);expect(MAX_SIMULATION_YEAR).toBe(9999);
  for(const year of [1,4,100,400,999,1000,1899,1900,2024,9999])expect(isSimulationDate({year,month:1,day:1}),String(year)).toBe(true);
  for(const year of [0,-1,10000,1.5,Number.MAX_SAFE_INTEGER])expect(isSimulationDate({year,month:1,day:1}),String(year)).toBe(false);
  expect(isMonthPrecisionDate({year:1,month:1})).toBe(true);expect(isMonthPrecisionDate({year:0,month:1})).toBe(false);
  expect(isLeapYear(4)).toBe(true);expect(isLeapYear(100)).toBe(false);expect(isLeapYear(400)).toBe(true);
  expect(isSimulationDate({year:4,month:2,day:29})).toBe(true);expect(isSimulationDate({year:100,month:2,day:29})).toBe(false);expect(isSimulationDate({year:400,month:2,day:29})).toBe(true);
  expect(isSimulationDate({year:'1',month:1,day:1})).toBe(false);expect(isSimulationDate({year:1,month:1,day:1,extra:true})).toBe(false);expect(isSimulationDate(Object.assign(Object.create({}),{year:1,month:1,day:1}))).toBe(false);
  let reads=0;const accessor={month:1,day:1};Object.defineProperty(accessor,'year',{enumerable:true,get(){reads++;return 1;}});expect(isSimulationDate(accessor)).toBe(false);expect(reads).toBe(0);const revoked=Proxy.revocable({year:1,month:1,day:1},{});revoked.revoke();expect(()=>isSimulationDate(revoked.proxy)).not.toThrow();expect(isSimulationDate(revoked.proxy)).toBe(false);
 });
 it('round trips calendar ordinals and rejects arithmetic beyond either boundary',()=>{
  for(const date of [{year:1,month:1,day:1},{year:4,month:2,day:29},{year:100,month:12,day:31},{year:400,month:3,day:1},{year:999,month:12,day:31},{year:1899,month:1,day:1},{year:9999,month:12,day:31}])expect(dateFromOrdinal(dateToOrdinal(date))).toEqual(date);
  expect(addDays({year:1,month:1,day:1},1)).toEqual({year:1,month:1,day:2});expect(addDays({year:9999,month:12,day:31},-1)).toEqual({year:9999,month:12,day:30});
  expect(()=>addDays({year:1,month:1,day:1},-1)).toThrow('supported calendar');expect(()=>addDays({year:9999,month:12,day:31},1)).toThrow('supported calendar');
  expect(()=>addMonths({year:1,month:1,day:1},-1)).toThrow('supported calendar');expect(()=>addMonths({year:9999,month:12,day:31},1)).toThrow('supported calendar');
  expect(()=>addYears({year:1,month:1,day:1},-1)).toThrow('supported calendar');expect(()=>addYears({year:9999,month:12,day:31},1)).toThrow('supported calendar');
  expect(()=>dateFromOrdinal(0)).toThrow('supported calendar');expect(()=>addDays({year:1,month:1,day:1},0.5)).toThrow('offset');
  expect(ageOn({year:1,month:12,day:31},{year:151,month:12,day:30})).toBe(149);expect(ageOn({year:1,month:12,day:31},{year:151,month:12,day:31})).toBe(150);
 });
 it('validates Gregorian dates and supports leap years, date comparison and day arithmetic',()=>{
  expect(isLeapYear(2024)).toBe(true);expect(isLeapYear(2100)).toBe(false);expect(isLeapYear(2000)).toBe(true);expect(daysInMonth(2024,2)).toBe(29);expect(daysInMonth(2025,2)).toBe(28);
  expect(isSimulationDate({year:2024,month:2,day:29})).toBe(true);expect(isSimulationDate({year:2025,month:2,day:29})).toBe(false);expect(isSimulationDate({year:2026,month:4,day:31})).toBe(false);expect(isSimulationDate({year:2026,month:13,day:1})).toBe(false);
  expect(compareDates({year:2026,month:1,day:1},{year:2025,month:12,day:31})).toBeGreaterThan(0);expect(addDays({year:2024,month:2,day:28},1)).toEqual({year:2024,month:2,day:29});expect(addDays({year:2024,month:2,day:29},1)).toEqual({year:2024,month:3,day:1});
 });
 it('clamps month and year additions at valid month ends',()=>{
  expect(addMonths({year:2025,month:1,day:31},1)).toEqual({year:2025,month:2,day:28});expect(addMonths({year:2024,month:1,day:31},1)).toEqual({year:2024,month:2,day:29});expect(addMonths({year:2026,month:12,day:31},1)).toEqual({year:2027,month:1,day:31});expect(addYears({year:2024,month:2,day:29},1)).toEqual({year:2025,month:2,day:28});
 });
 it('calculates exact age before, on and after a birthday',()=>{
  const birth={year:2000,month:5,day:15};expect(ageOn(birth,{year:2026,month:5,day:14})).toBe(25);expect(ageOn(birth,{year:2026,month:5,day:15})).toBe(26);expect(ageOn(birth,{year:2026,month:5,day:16})).toBe(26);
 });
 it('owns one country-neutral date and derives age from date of birth',()=>{
  const child=createLife('Clock','Non-binary','ca',1),adult=coreAdultStart(child);
  expect(child.clock).toEqual({version:2,date:SIMULATION_START_DATE,cadence:'year'});expect(child.dateOfBirth).toEqual(SIMULATION_START_DATE);
  expect(adult.clock!.date).toEqual(child.clock!.date);expect(adult.dateOfBirth).toEqual(addMonths(adult.clock!.date,-216));expect(ageOn(adult.dateOfBirth!,adult.clock!.date)).toBe(18);
  expect(validLife({...adult,age:17})).toBe(false);
 });
 it('advances the same date by twelve months annually and one month monthly',()=>{
  let yearly=createLife('Yearly','Woman','nz',2);const yearlyBirth=structuredClone(yearly.dateOfBirth);
  yearly=resolveLife(advanceYear(yearly));expect(yearly.clock!.date).toEqual(addMonths(SIMULATION_START_DATE,12));expect(yearly.dateOfBirth).toEqual(yearlyBirth);expect(yearly.age).toBe(1);expect(lifeMonth(yearly)).toBe(12);
  let monthly=coreAdultStart(createLife('Monthly','Man','ca',3));const start=structuredClone(monthly.clock!.date);
  for(let i=0;i<11;i++)monthly=advanceCoreMonth(monthly);expect(monthly.age).toBe(18);expect(monthly.clock!.date).toEqual(addMonths(start,11));
  monthly=advanceCoreMonth(monthly);expect(monthly.age).toBe(19);expect(monthly.clock!.date).toEqual(addMonths(start,12));expect(lifeMonth(monthly)).toBe(228);
 });
 it('advances UK time once on each successful transition without making UK counters the clock',()=>{
  let annual=createGame('Annual','Woman','uk',4);const annualDate=structuredClone(annual.clock!.date),annualWorld=annual.ukWorld!.national.month;
  annual=resolveGame(ageUp(annual));expect(monthsBetween(annualDate,annual.clock!.date)).toBe(12);expect(annual.ukWorld!.national.month-annualWorld).toBe(12);
  let political=joinPolitics(adultStart(createGame('Political','Man','uk',5)),'labour','socratic');political=choosePoliticalEvent(political,0);
  const date=structuredClone(political.clock!.date),world=political.ukWorld!.national.month,tenure=political.politics!.months;
  political=advancePoliticalMonth(political);expect(monthsBetween(date,political.clock!.date)).toBe(1);expect(political.ukWorld!.national.month-world).toBe(1);expect(political.politics!.months-tenure).toBe(1);
 });
 it('attaches and detaches politics without resetting the date or conflating tenure',()=>{
  let g=adultStart(createGame('Later','Woman','uk',6));for(let i=0;i<4;i++)g=advanceMonth(g);const before=structuredClone(g.clock!.date),world=g.ukWorld!.national.month;
  g=joinPolitics(g,'green','smith');expect(g.clock!.date).toEqual(before);expect(g.ukWorld!.national.month).toBe(world);expect(g.politics!.months).toBe(0);
  g=choosePoliticalEvent(g,0);g=advancePoliticalMonth(g);g=leavePolitics(g);const tenure=g.politics!.months,date=structuredClone(g.clock!.date),national=g.ukWorld!.national.month;
  g=advanceMonth(g);expect(monthsBetween(date,g.clock!.date)).toBe(1);expect(g.ukWorld!.national.month).toBe(national+1);expect(g.politics!.months).toBe(tenure);
 });
 it('migrates the old elapsed clock once without resetting UK or political state',()=>{
  let current=adultStart(createGame('Legacy','Man','uk',7));for(let i=0;i<5;i++)current=advanceMonth(current);current=joinPolitics(current,'labour','marx');
  const world=structuredClone(current.ukWorld),politics=structuredClone(current.politics),legacy=structuredClone(current) as unknown as Record<string,unknown>;
  legacy.version=1;delete legacy.people;delete legacy.population;delete legacy.dateOfBirth;legacy.clock={monthOfYear:5,totalMonths:221,cadence:'month'};
  const migrated=migrateGame(legacy)!;expect(migrated.ukWorld).toEqual(world);expect(migrated.politics).toEqual(politics);expect(migrated.age).toBe(18);expect(lifeMonth(migrated)).toBe(221);expect(migrated.clock!.date).toEqual(addMonths(SIMULATION_START_DATE,world!.national.month));expect(migrateGame(migrated)).toEqual(migrated);
 });
 it('migrates version-1 month dates and date of birth to exact day-one dates',()=>{
  let current=adultStart(createGame('V1','Woman','uk',12));for(let i=0;i<5;i++)current=advanceMonth(current);current=joinPolitics(current,'labour','socratic');
  const originalWorld=structuredClone(current.ukWorld),originalPolitics=structuredClone(current.politics),legacy=structuredClone(current) as unknown as Record<string,unknown>;
  legacy.version=1;delete legacy.people;delete legacy.population;legacy.clock={version:1,date:{year:current.clock!.date.year,month:current.clock!.date.month},cadence:'month'};legacy.dateOfBirth={year:current.dateOfBirth!.year,month:current.dateOfBirth!.month};
  const migrated=migrateGame(legacy)!;expect(migrated.clock).toEqual({version:2,date:{...current.clock!.date,day:1},cadence:'month'});expect(migrated.dateOfBirth).toEqual({...current.dateOfBirth!,day:1});expect(migrated.ukWorld).toEqual(originalWorld);expect(migrated.politics).toEqual(originalPolitics);expect(migrateGame(migrated)).toEqual(migrated);
 });
 it('migrates the untouched v1 fixture prospectively and preserves a recovery snapshot',()=>{
  const raw=JSON.stringify(lifeV1),data=new Map([[SAVE_KEY,raw]]),storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};
  const migrated=loadGame(storage).game!;expect(migrated.age).toBe(25);expect(ageOn(migrated.dateOfBirth!,migrated.clock!.date)).toBe(25);expect(migrated.ukWorld!.national.month).toBe(300);expect(saveGame(storage,migrated)).toBeNull();expect(data.get(PRE_SIMULATION_CLOCK_SAVE_KEY)).toBe(raw);expect(JSON.parse(data.get(SAVE_KEY)!)).toEqual(migrated);
 });
 it('keeps the primary save when the pre-clock recovery snapshot cannot be written',()=>{
  const raw=JSON.stringify(lifeV1),migrated=migrateGame(lifeV1)!;
  const storage={getItem:(key:string)=>key===SAVE_KEY?raw:null,setItem:(key:string)=>{if(key===PRE_SIMULATION_CLOCK_SAVE_KEY)throw Error('Quota');}};
  expect(saveGame(storage,migrated)).toBeTruthy();expect(storage.getItem(SAVE_KEY)).toBe(raw);
 });
 it('preserves version-1 bytes before day-precision replacement and refuses overwrite on failure',()=>{
  const current=adultStart(createGame('Recovery','Man','uk',8)),legacy=structuredClone(current) as unknown as Record<string,unknown>;
  legacy.version=1;delete legacy.people;delete legacy.population;legacy.clock={version:1,date:{year:current.clock!.date.year,month:current.clock!.date.month},cadence:'year'};legacy.dateOfBirth={year:current.dateOfBirth!.year,month:current.dateOfBirth!.month};
  const raw=JSON.stringify(legacy),data=new Map([[SAVE_KEY,raw]]),storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};
  const migrated=loadGame(storage).game!;expect(saveGame(storage,migrated)).toBeNull();expect(data.get(PRE_DAY_PRECISION_SAVE_KEY)).toBe(raw);
  const blocked={getItem:(key:string)=>key===SAVE_KEY?raw:null,setItem:(key:string)=>{if(key===PRE_DAY_PRECISION_SAVE_KEY)throw Error('Quota');}};expect(saveGame(blocked,migrated)).toBeTruthy();expect(blocked.getItem(SAVE_KEY)).toBe(raw);
 });
});
