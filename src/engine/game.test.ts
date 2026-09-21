import { describe, expect, it } from 'vitest';
import { act, ageUp, choose, createGame, salary } from './game';
import { events } from '../data/events';
import { isGame, loadGame, saveGame } from './save';
import type { Game } from './types';
function resolve(g:Game){const e=events.find(e=>e.id===g.pending);return e?choose(g,e.choices.findIndex(c=>(c.effects.money??0)>=-Math.max(g.money,0))):g;}
function toAge(g:Game,age:number){for(let turn=0;g.age<age&&g.alive&&turn<110;turn++)g=resolve(ageUp(g));if(g.alive&&g.age<age)throw Error(`Stalled at ${g.age}, event ${g.pending}`);return g;}
describe('life engine',()=>{
  it('creates reproducible characters and events from a seed',()=>{expect(toAge(createGame('Alex','Non-binary','uk',12),20)).toEqual(toAge(createGame('Alex','Non-binary','uk',12),20));});
  it('does not mutate prior state and clamps stats',()=>{const g=createGame('A','Man','uk',4);g.stats.smarts=99;const before=structuredClone(g);const next=act(g,'read');expect(g).toEqual(before);expect(next.stats.smarts).toBe(100);});
  it('requires an event choice before ageing or taking activities',()=>{const g=ageUp(createGame('A','Woman','uk',1));expect(ageUp(g)).toBe(g);expect(act(g,'read')).toBe(g);expect(choose(g,999)).toBe(g);expect(resolve(g).pending).toBeNull();});
  it('limits actions and refreshes the yearly budget',()=>{let g=createGame('A','Man','uk',1);for(let i=0;i<3;i++)g=act(g,'rest');expect(g.actions).toBe(0);expect(act(g,'rest')).toBe(g);expect(ageUp(g).actions).toBe(3);});
  it('handles school and graduation transitions',()=>{let g=toAge(createGame('A','Woman','ca',1),6);expect(g.education).toBe('school');g=toAge(g,18);expect(g.education).toBe('secondary');expect(g.lastExpenses).toBe(22000);});
  it('enforces job requirements, pays salaries and promotes',()=>{let g=createGame('A','Non-binary','uk',3);expect(act(g,'job:barista')).toBe(g);g=toAge(g,18);expect(act(g,'job:researcher')).toBe(g);g.stats.smarts=80;g=act(g,'job:barista');g=toAge(g,21);expect(g.level).toBe(1);expect(g.lastIncome).toBe(salary(g));expect(g.earned).toBeGreaterThan(0);});
  it('charges three years of tuition and unlocks graduate careers',()=>{let g=toAge(createGame('A','Woman','uk',9),18);g=act(g,'university');expect(act(g,'job:barista')).toBe(g);g=toAge(g,21);expect(g.education).toBe('degree');expect(g.studyYears).toBe(3);g.stats.smarts=100;g=act(g,'job:researcher');expect(g.job).toBe('researcher');g=toAge(g,22);expect(g.lastIncome).toBe(56000);});
  it('blocks purchases without cash and always offers a free choice',()=>{const g=toAge(createGame('A','Man','uk',2),18);g.pending='repair';g.money=0;expect(choose(g,0)).toBe(g);expect(choose(g,1).pending).toBeNull();for(const event of events)expect(event.choices.some(c=>(c.effects.money??0)>=0)).toBe(true);});
  it('spending time improves the selected bond',()=>{const g=createGame('A','Man','uk',2);const next=act(g,'connect:parent');expect(next.relationships[0].bond).toBe(92);expect(next.relationships[1].bond).toBe(65);});
  it('ends a life when health runs out and freezes further play',()=>{let g=createGame('A','Man','uk',2);g.stats.health=1;g=ageUp(g);expect(g.alive).toBe(false);expect(g.pending).toBeNull();expect(act(g,'exercise')).toBe(g);expect(ageUp(g)).toBe(g);expect(choose(g,0)).toBe(g);});
  it('completes 100 seeded lifetimes without invalid states',()=>{for(let seed=0;seed<100;seed++){let g=createGame('A','Non-binary','nz',seed);for(let turn=0;g.alive&&turn<110;turn++){g=resolve(ageUp(g));if(g.alive)g=act(g,'exercise');expect(isGame(g)).toBe(true);}expect(g.age).toBeLessThanOrEqual(100);expect(g.cause,`Seed ${seed}, age ${g.age}, pending ${g.pending}`).toBeTruthy();}});
  it('retires at 65 and pays the pension',()=>{let g=createGame('A','Woman','uk',7);for(let turn=0;g.age<65&&turn<70;turn++){g=resolve(ageUp(g));g=act(g,'exercise');}g=act(g,'retire');expect(g.retired).toBe(true);g=resolve(ageUp(g));expect(g.lastIncome).toBe(12000);expect(act(g,'job:barista')).toBe(g);});
});
describe('save boundary',()=>{
  it('round trips a pending event and preserves future outcomes',()=>{let raw:string|null=null;const storage={getItem:()=>raw,setItem:(_k:string,v:string)=>{raw=v;}};const g=ageUp(createGame('A','Man','uk',22));expect(saveGame(storage,g)).toBeNull();const loaded=loadGame(storage).game!;expect(loaded).toEqual(g);expect(ageUp(resolve(loaded))).toEqual(ageUp(resolve(g)));});
  it('rejects corrupt, outdated and structurally invalid saves',()=>{for(const raw of ['{','null','{}',JSON.stringify({...createGame('A','Man','uk'),version:2}),JSON.stringify({...createGame('A','Man','uk'),relationships:[null]})]){expect(loadGame({getItem:()=>raw,setItem:()=>{}}).error).toBeTruthy();}});
  it('handles unavailable browser storage',()=>{const storage={getItem:()=>{throw Error();},setItem:()=>{throw Error();}};expect(loadGame(storage).error).toBeTruthy();expect(saveGame(storage,createGame('A','Man','uk'))).toBeTruthy();});
});
