import {describe,expect,it} from 'vitest';
import {createGame} from './game';
import {PRE_DETERMINISTIC_RNG_SAVE_KEY,SAVE_KEY,loadGame,migrateGame,saveGame} from './save';
import {COMPATIBILITY_LIFE_STREAM,COMPATIBILITY_NATIONAL_STREAM} from './core/rng';
import {random} from './core/random';
import {adultStart} from './simulation';
import {advancePoliticalMonth,choosePoliticalEvent,joinPolitics} from './politics';

describe('randomness persistence',()=>{
 it('migrates legacy seed projections once without consuming their sequences',()=>{const legacy=createGame('A','Woman','uk',31),lifeSeed=legacy.seed,nationalSeed=legacy.ukWorld!.national.seed;delete legacy.randomness;const migrated=migrateGame(legacy)!;expect(migrated.seed).toBe(lifeSeed);expect(migrated.ukWorld!.national.seed).toBe(nationalSeed);expect(migrated.randomness!.streams[COMPATIBILITY_LIFE_STREAM].state).toBe(lifeSeed);expect(migrated.randomness!.streams[COMPATIBILITY_NATIONAL_STREAM].state).toBe(nationalSeed);expect(migrateGame(migrated)).toEqual(migrated);});
 it('creates a recovery copy before replacing a legacy save',()=>{const legacy=createGame('A','Woman','uk',32),nationalSeed=legacy.ukWorld!.national.seed;delete legacy.randomness;const raw=JSON.stringify(legacy),data=new Map([[SAVE_KEY,raw]]),storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};expect(saveGame(storage,legacy)).toBeNull();expect(data.get(PRE_DETERMINISTIC_RNG_SAVE_KEY)).toBe(raw);expect(JSON.parse(data.get(SAVE_KEY)!).randomness.streams[COMPATIBILITY_NATIONAL_STREAM].state).toBe(nationalSeed);});
 it('keeps the primary save when RNG recovery cannot be written',()=>{const legacy=createGame('A','Woman','uk',33);delete legacy.randomness;const raw=JSON.stringify(legacy);const storage={getItem:(key:string)=>key===SAVE_KEY?raw:null,setItem:(key:string)=>{if(key===PRE_DETERMINISTIC_RNG_SAVE_KEY)throw Error('Quota');}};expect(saveGame(storage,legacy)).toBeTruthy();expect(storage.getItem(SAVE_KEY)).toBe(raw);});
 it('preserves the next compatibility draw across save and load',()=>{const game=createGame('A','Woman','uk',34),data=new Map<string,string>(),storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};expect(saveGame(storage,game)).toBeNull();const loaded=loadGame(storage).game!;expect(random(loaded)).toBe(random(structuredClone(game)));});
 it('treats national and Mereford seed fields as projections of canonical streams',()=>{let canonical=choosePoliticalEvent(joinPolitics(adultStart(createGame('A','Woman','uk',35)),'labour','socratic'),0),altered=structuredClone(canonical);altered.ukWorld!.national.seed=1;altered.politics!.economy.seed=2;canonical=advancePoliticalMonth(canonical);altered=advancePoliticalMonth(altered);expect(altered).toEqual(canonical);});
});
