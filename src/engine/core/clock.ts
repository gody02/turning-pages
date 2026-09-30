import type {LifeState,SimulationDate} from './model';

/** A neutral calendar anchor for new stories and migrated saves. */
export const SIMULATION_START_DATE:SimulationDate={year:2026,month:9,day:1};
/** The supported proleptic Gregorian range. There is no year zero. */
export const MIN_SIMULATION_YEAR=1;
export const MAX_SIMULATION_YEAR=9999;
export const isLeapYear=(year:number)=>year%4===0&&(year%100!==0||year%400===0);
export const daysInMonth=(year:number,month:number)=>month===2?(isLeapYear(year)?29:28):[4,6,9,11].includes(month)?30:month>=1&&month<=12?31:0;
export const isSimulationYear=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=MIN_SIMULATION_YEAR&&value<=MAX_SIMULATION_YEAR;
const plainExactData=(value:unknown,names:readonly string[]):value is Record<string,unknown>=>{
 try{
  if(!value||typeof value!=='object'||Array.isArray(value))return false;const prototype=Object.getPrototypeOf(value);if(prototype!==Object.prototype&&prototype!==null)return false;
  const keys=Reflect.ownKeys(value);if(keys.length!==names.length||keys.some(key=>typeof key!=='string'||!names.includes(key)))return false;
  return names.every(name=>{const descriptor=Object.getOwnPropertyDescriptor(value,name);return !!descriptor?.enumerable&&'value' in descriptor;});
 }catch{return false;}
};
export const isSimulationDate=(value:unknown):value is SimulationDate=>{
 if(!plainExactData(value,['year','month','day']))return false;const year=value.year,month=value.month,day=value.day;
 return isSimulationYear(year)&&typeof month==='number'&&Number.isInteger(month)&&typeof day==='number'&&Number.isInteger(day)&&month>=1&&month<=12&&day>=1&&day<=daysInMonth(year,month);
};
export type MonthPrecisionDate={year:number;month:number};
export const isMonthPrecisionDate=(value:unknown):value is MonthPrecisionDate=>plainExactData(value,['year','month'])&&isSimulationYear(value.year)&&typeof value.month==='number'&&Number.isInteger(value.month)&&value.month>=1&&value.month<=12;
export const compareDates=(left:SimulationDate,right:SimulationDate)=>left.year-right.year||left.month-right.month||left.day-right.day;
const daysBeforeYear=(year:number)=>{const y=year-1;return y*365+Math.floor(y/4)-Math.floor(y/100)+Math.floor(y/400);};
const dayOfYear=(date:SimulationDate)=>{let days=date.day;for(let month=1;month<date.month;month++)days+=daysInMonth(date.year,month);return days;};
const MIN_ORDINAL=1;
const MAX_ORDINAL=daysBeforeYear(MAX_SIMULATION_YEAR+1);
const assertDate=(value:SimulationDate)=>{if(!isSimulationDate(value))throw RangeError('Invalid simulation date.');};
const assertOffset=(value:number)=>{if(!Number.isSafeInteger(value))throw RangeError('Invalid simulation date offset.');};
export const dateIndex=(date:SimulationDate)=>{assertDate(date);return date.year*12+date.month-1;};
export const dateToOrdinal=(date:SimulationDate)=>{assertDate(date);return daysBeforeYear(date.year)+dayOfYear(date);};
export const dateFromOrdinal=(value:number):SimulationDate=>{
 assertOffset(value);if(value<MIN_ORDINAL||value>MAX_ORDINAL)throw RangeError('Simulation date arithmetic exceeds the supported calendar.');
 let low=MIN_SIMULATION_YEAR,high=MAX_SIMULATION_YEAR;while(low<high){const middle=Math.ceil((low+high)/2);if(daysBeforeYear(middle)<value)low=middle;else high=middle-1;}
 const year=low;let day=value-daysBeforeYear(year),month=1;while(day>daysInMonth(year,month)){day-=daysInMonth(year,month);month++;}return {year,month,day};
};
export const addDays=(date:SimulationDate,days:number)=>{assertOffset(days);return dateFromOrdinal(dateToOrdinal(date)+days);};
export const addMonths=(date:SimulationDate,months:number):SimulationDate=>{
 assertDate(date);assertOffset(months);const index=dateIndex(date)+months;if(!Number.isSafeInteger(index))throw RangeError('Simulation date arithmetic exceeds the supported calendar.');
 const year=Math.floor(index/12);if(!isSimulationYear(year))throw RangeError('Simulation date arithmetic exceeds the supported calendar.');const month=index-year*12+1;return {year,month,day:Math.min(date.day,daysInMonth(year,month))};
};
export const addYears=(date:SimulationDate,years:number):SimulationDate=>{assertDate(date);assertOffset(years);const year=date.year+years;if(!isSimulationYear(year))throw RangeError('Simulation date arithmetic exceeds the supported calendar.');return {year,month:date.month,day:Math.min(date.day,daysInMonth(year,date.month))};};
export const monthsBetween=(from:SimulationDate,to:SimulationDate)=>dateIndex(to)-dateIndex(from);
export const completedMonthsBetween=(from:SimulationDate,to:SimulationDate)=>{let months=monthsBetween(from,to);if(to.day<from.day)months--;return months;};
export const ageOn=(dateOfBirth:SimulationDate,date:SimulationDate)=>{assertDate(dateOfBirth);assertDate(date);return date.year-dateOfBirth.year-(compareDates({...date,year:dateOfBirth.year},dateOfBirth)<0?1:0);};
export const hasCanonicalClock=(g:LifeState)=>!!g.clock&&g.clock.version===2&&isSimulationDate(g.clock.date)&&isSimulationDate(g.dateOfBirth);
export const monthOfYear=(g:LifeState)=>g.clock&&g.dateOfBirth?completedMonthsBetween(g.dateOfBirth,g.clock.date)%12:0;
export const lifeMonth=(g:LifeState)=>g.clock&&g.dateOfBirth?completedMonthsBetween(g.dateOfBirth,g.clock.date):g.age*12;
export const cadence=(g:LifeState)=>g.clock?.cadence??'year';
/** Mutating helpers are private transaction operations on an already-cloned draft. */
export function initialiseClock(g:LifeState,month=0,mode:'year'|'month'='year'){
 if(hasCanonicalClock(g))return;
 const date=addMonths(SIMULATION_START_DATE,month),elapsed=g.age*12+month;
 g.dateOfBirth=addMonths(date,-elapsed);g.clock={version:2,date,cadence:mode};g.age=ageOn(g.dateOfBirth,date);
}
export function tickMonth(g:LifeState){initialiseClock(g);const previous=g.age;g.clock!.cadence='month';g.clock!.date=addMonths(g.clock!.date,1);g.age=ageOn(g.dateOfBirth!,g.clock!.date);return g.age>previous;}
export function tickYear(g:LifeState){initialiseClock(g);g.clock!.cadence='year';g.clock!.date=addYears(g.clock!.date,1);g.age=ageOn(g.dateOfBirth!,g.clock!.date);}
