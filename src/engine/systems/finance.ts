import type {LifeState} from '../core/model';
import {countryOf} from './geography';
import {salary} from './careers';
export const cash=(n:number)=>Math.round(n*100)/100;
export const canAfford=(g:Pick<LifeState,'money'>,change=0)=>change>=-Math.max(0,g.money);
export function changeMoney(g:LifeState,delta:number,round=false){g.money=round?cash(g.money+delta):g.money+delta;}
export type FinanceTerms={annualIncome?:number;incomeAdjustment?:number;livingMultiplier?:number};
export function regularIncome(g:LifeState){return g.retired?Math.round(12000*countryOf(g).wage):salary(g);}
export function monthlyQuote(g:LifeState,terms:FinanceTerms={}){if(g.age<18)return {income:0,expenses:0};return {income:Math.max(0,(terms.annualIncome??regularIncome(g))/12+(terms.incomeAdjustment??0)),expenses:countryOf(g).living/12*(terms.livingMultiplier??1)+(g.education==='university'?countryOf(g).tuition/12:0)+Math.max(0,-g.money)*.05/12};}
export function settleMonth(g:LifeState,terms:FinanceTerms={}){const q=monthlyQuote(g,terms),f=g.finances??={lastIncome:0,lastExpenses:0,yearIncome:0,yearExpenses:0};f.lastIncome=cash(q.income);f.lastExpenses=cash(q.expenses);f.yearIncome=cash(f.yearIncome+q.income);f.yearExpenses=cash(f.yearExpenses+q.expenses);g.money=cash(g.money+f.lastIncome-f.lastExpenses);g.earned=cash(g.earned+f.lastIncome);}
export function closeFinancialYear(g:LifeState){if(!g.finances)return;g.lastIncome=g.finances.yearIncome;g.lastExpenses=g.finances.yearExpenses;g.finances.yearIncome=0;g.finances.yearExpenses=0;}
export function settleYear(g:LifeState,wasStudying:boolean){g.lastIncome=g.age>=18?regularIncome(g):0;g.lastExpenses=g.age>=18?countryOf(g).living+(wasStudying?countryOf(g).tuition:0)+Math.round(Math.max(0,-g.money)*.05):0;g.money+=g.lastIncome-g.lastExpenses;g.earned+=g.lastIncome;}
export type CashAccount={get:()=>number;set:(amount:number)=>void};
export function transferCash(from:CashAccount,to:CashAccount,requested:number,allowOverdraft=false){const amount=cash(Math.max(0,allowOverdraft?requested:Math.min(requested,from.get())));if(amount){from.set(cash(from.get()-amount));to.set(cash(to.get()+amount));}return amount;}
