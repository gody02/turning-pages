import { describe,it,expect } from 'vitest';
import { createGame,act,ageUp,choose } from './game';
import { adultStart,joinPolitics,joinPoliticsReason,advancePoliticalMonth,choosePoliticalEvent,politicalTask,politicalTaskReason,roleRank } from './politics';
import { events } from '../data/events';
import { politicalEvents } from '../data/politics';
import { isGame,migrateGame,loadGame,saveGame,SAVE_KEY,PRE_POLITICS_SAVE_KEY } from './save';
import { townTotal } from './town';
import type { Game } from './types';
import legacy from './fixtures/life-v1.json';
function start(seed=7){let g=adultStart(createGame('Robin Test','Non-binary','uk',seed));g.job='barista';return joinPolitics(g,'labour','marx');}
function resolve(g:Game){if(g.pending){const e=events.find(e=>e.id===g.pending)!;g=choose(g,e.choices.findIndex(c=>(c.effects.money??0)>=-Math.max(0,g.money)));}if(g.politics?.pending)g=choosePoliticalEvent(g,0);return g;}
function month(g:Game){return advancePoliticalMonth(resolve(g));}
describe('politics inside one life',()=>{
  it('requires a UK adult and preserves existing life history on entry',()=>{const child=createGame('A','Woman','uk',1);expect(joinPolitics(child,'labour','marx')).toBe(child);expect(joinPoliticsReason(child)).toContain('18');const abroad=adultStart(createGame('A','Man','ca',1));expect(joinPolitics(abroad,'labour','smith')).toBe(abroad);const g=adultStart(createGame('A','Man','uk',2));const entered=joinPolitics(g,'green','socratic');expect(entered.age).toBe(18);expect(entered.money).toBe(g.money);expect(entered.stats).toEqual(g.stats);expect(entered.journal.at(-1)).toEqual(g.journal[0]);expect(isGame(entered)).toBe(true);});
  it('shares activity limits, blocks annual time-skipping and requires choices',()=>{let g=start();expect(ageUp(g)).toBe(g);expect(advancePoliticalMonth(g)).toBe(g);expect(act(g,'read')).toBe(g);g=resolve(g);g=politicalTask(g,'study');g=act(g,'read');expect(g.actions).toBe(0);expect(politicalTask(g,'organise')).toBe(g);const n=advancePoliticalMonth(g);expect(n.actions).toBe(3);expect(n.age).toBe(g.age);expect(n.politics!.months).toBe(1);});
  it('ages once after twelve months without charging cash twice',()=>{let g=start(5);let earned=g.earned;for(let i=0;i<11;i++){g=month(g);earned+=g.politics!.lastIncome;expect(g.age).toBe(18);}g=resolve(g);const before=g;const expectedIncome=23000/12;const expectedCost=15000/12*(1+Math.max(0,g.politics!.economy.energy-1)*.12)*g.ukWorld!.national.prices*(1+(g.ukWorld!.national.budget.vat-20)*.004);g=advancePoliticalMonth(g);expect(g.age).toBe(19);expect(g.money).toBeCloseTo(before.money+Math.round(expectedIncome*100)/100-Math.round(expectedCost*100)/100,2);expect(g.earned).toBeCloseTo(earned+g.politics!.lastIncome,2);expect(g.jobYears).toBe(1);expect(g.pending).toBeTruthy();expect(g.lastExpenses).toBeGreaterThan(0);expect(g.politics!.yearExpenses).toBe(0);});
  it('advances university once per year and charges twelve monthly tuition payments',()=>{let g=start();g.education='university';g.studyYears=0;g.job=null;for(let i=0;i<36;i++)g=month(g);expect(g.age).toBe(21);expect(g.education).toBe('degree');expect(g.studyYears).toBe(3);expect(g.politics!.months).toBe(36);expect(isGame(g)).toBe(true);});
  it('keeps personal money, campaign resources and the public fund separate',()=>{let g=resolve(start());const personal=g.money,publicFund=g.politics!.economy.fund;g=politicalTask(g,'fundraise');expect(g.money).toBe(personal);expect(g.politics!.campaignFunds).toBe(250);expect(g.politics!.economy.fund).toBe(publicFund);expect(politicalTaskReason(g,'motion:relief')).toContain('elected');});
  it('records family trade-offs and connects mentors to political support',()=>{let g=resolve(start());g.politics!.pending='family';const bond=g.relationships[0].bond;g=choosePoliticalEvent(g,1);expect(g.relationships[0].bond).toBeLessThan(bond);expect(g.politics!.memories).toContain('Missed family time for party work.');const caucus=g.politics!.caucus;g=act(g,'connect:political-mentor');expect(g.politics!.caucus).toBe(caucus+3);});
  it('continues the constituency beyond month 24 without resetting savings or investments',()=>{let g=start();for(let i=0;i<30;i++)g=month(g);expect(g.age).toBe(20);expect(g.politics!.economy.month).toBe(30);expect(g.politics!.economy.history).toHaveLength(30);expect(townTotal(g.politics!.economy)).toBe(g.politics!.economy.initialTotal);expect(isGame(g)).toBe(true);});
  it('holds deterministic elections with conserved vote totals and outside-job transition',()=>{let g=start(8);for(let i=0;i<24;i++){g=resolve(g);Object.assign(g.politics!,{support:95,reputation:95,organisation:95,caucus:95,campaignFunds:5000});if(i===2)g=politicalTask(g,'nominateCouncil');if(i===12)g=politicalTask(g,'nominateParliament');g=advancePoliticalMonth(g);}const p=g.politics!;expect(p.elections).toHaveLength(2);expect(p.elections.every(e=>e.votes.reduce((a,b)=>a+b,0)===20000)).toBe(true);expect(p.role).toBe('mp');expect(g.job).toBeNull();expect(p.inGovernment).toBe(true);expect(g.age).toBe(20);});
  it('can lose elections and continue life instead of granting automatic promotion',()=>{let g=start(9);for(let i=0;i<6;i++){g=resolve(g);Object.assign(g.politics!,{support:0,reputation:0,organisation:0,caucus:0,candidacy:'council'});g=advancePoliticalMonth(g);}expect(g.politics!.elections[0].won).toBe(false);expect(g.politics!.role).toBe('activist');expect(g.alive).toBe(true);});
  it('preserves a parliamentary nomination when defending a council seat',()=>{let g=start(7);for(let i=0;i<53;i++)g=month(g);g=resolve(g);Object.assign(g.politics!,{role:'councillor',candidacy:'parliament',support:95,reputation:95,organisation:95});g=advancePoliticalMonth(g);expect(g.politics!.elections.at(-1)!.kind).toBe('council');expect(g.politics!.candidacy).toBe('parliament');expect(isGame(g)).toBe(true);});
  it('gates office, bills and stages, then applies enacted law to the economy',()=>{let g=resolve(start());expect(politicalTask(g,'seekOffice')).toBe(g);expect(politicalTask(g,'bill:warmHomes')).toBe(g);Object.assign(g.politics!,{role:'mp',knowledge:100,caucus:100,integrity:100,seats:400,inGovernment:true});g.job=null;g=politicalTask(g,'bill:warmHomes');expect(g.politics!.laws).toHaveLength(0);expect(politicalTask(g,'advanceBill')).toBe(g);for(let i=0;i<4;i++){g=resolve(month(g));g=politicalTask(g,'advanceBill');}expect(g.politics!.laws).toContain('warmHomes');g=month(g);expect(g.politics!.economy.ledger.some(x=>x.reason==='Warm Homes statutory grant')).toBe(true);expect(isGame(g)).toBe(true);});
  it('supports a playable route to government using ordinary actions',()=>{
    let g=start(7);
    for(let i=0;i<48&&g.alive;i++){
      g=resolve(g);
      for(let action=0;action<3&&g.actions>0;action++){
        const p=g.politics!;
        let task='family';
        if(!politicalTaskReason(g,'leadership'))task='leadership';
        else if(!politicalTaskReason(g,'seekOffice'))task='seekOffice';
        else if(!politicalTaskReason(g,'nominateParliament'))task='nominateParliament';
        else if(!politicalTaskReason(g,'nominateCouncil')&&p.months<6)task='nominateCouncil';
        else if(p.organisation<90)task='organise';
        else if(p.reputation<90||p.support<90)task=g.money>=30?'canvass':'casework';
        else if(p.caucus<90)task='negotiate';
        else if(p.knowledge<80)task='study';
        else if(p.campaignFunds<2000)task='fundraise';
        g=politicalTask(g,task);
      }
      g=advancePoliticalMonth(g);
    }
    expect(g.politics!.role).toBe('premier');expect(g.age).toBe(22);expect(isGame(g)).toBe(true);
  });
  it('profit-sharing and a property levy have balanced counterparties',()=>{let g=start(8);g=month(g);g=resolve(g);g.politics!.laws=['profitShare','propertyLevy'];g=advancePoliticalMonth(g);const flows=g.politics!.economy.ledger.filter(t=>t.month===2);expect(flows.some(t=>t.reason==='Property income levy'&&t.from==='owners'&&t.to==='fund')).toBe(true);expect(flows.some(t=>t.reason==='Worker profit share'&&t.from==='retail'&&t.to==='service')).toBe(true);expect(townTotal(g.politics!.economy)).toBe(g.politics!.economy.initialTotal);expect(isGame(g)).toBe(true);});
  it('remembers an impossible promise when hardship contradicts it',()=>{let g=start();g.politics!.pending='socratic';g=choosePoliticalEvent(g,1);for(let i=0;i<12;i++)g=month(g);expect(g.politics!.log.some(x=>x.text.includes('Residents recall your promise'))).toBe(true);});
  it('freezes the complete career after death',()=>{let g=resolve(start());g.politics!.pending='fatigue';g.stats.health=3;g=choosePoliticalEvent(g,1);expect(g.alive).toBe(false);expect(advancePoliticalMonth(g)).toBe(g);expect(politicalTask(g,'study')).toBe(g);expect(isGame(g)).toBe(true);});
  it('keeps all political dilemmas usable without personal cash',()=>{for(const e of politicalEvents)expect(e.choices.some(c=>(c.effects.money??0)>=0)).toBe(true);});
});
describe('integrated career saves',()=>{
  it('keeps the old life untouched if its recovery snapshot cannot be written',()=>{const raw=JSON.stringify(legacy);const data=new Map([[SAVE_KEY,raw]]);const storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{if(k===PRE_POLITICS_SAVE_KEY)throw Error('Quota');data.set(k,v);}};expect(saveGame(storage,joinPolitics(loadGame(storage).game!,'labour','marx'))).toBeTruthy();expect(data.get(SAVE_KEY)).toBe(raw);});
  it('migrates the original save, preserves a raw recovery snapshot and round trips the career',()=>{const data=new Map([[SAVE_KEY,JSON.stringify(legacy)]]);const storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);}};const original=loadGame(storage).game!;expect(original).toEqual(migrateGame(legacy));let g=joinPolitics(original,'assembly','lenin');expect(saveGame(storage,g)).toBeNull();expect(data.get(PRE_POLITICS_SAVE_KEY)).toBe(JSON.stringify(legacy));g=month(g);expect(saveGame(storage,g)).toBeNull();expect(loadGame(storage).game).toEqual(g);expect(month(loadGame(storage).game!)).toEqual(month(g));});
  it('rejects malformed career data, mismatched clocks and altered public balances',()=>{const g=start();expect(isGame({...g,politics:{...g.politics,months:24}})).toBe(false);expect(isGame({...g,politics:{...g.politics,economy:{...g.politics!.economy,fund:0}}})).toBe(false);expect(isGame({...g,politics:{...g.politics,role:'king'}})).toBe(false);});
  it('saves multiple reproducible six-year political lives with healthy account boundaries',()=>{for(let seed=0;seed<6;seed++){let g=start(seed);for(let i=0;i<72&&g.alive;i++){g=resolve(g);while(g.actions>0)g=politicalTask(g,g.stats.health<75?'family':i%2?'casework':'study');g=advancePoliticalMonth(g);expect(isGame(g),`seed ${seed}, month ${i}`).toBe(true);}expect(g.politics!.months).toBeGreaterThan(24);expect(roleRank(g.politics!.role)).toBeGreaterThanOrEqual(0);}},15000);
});

