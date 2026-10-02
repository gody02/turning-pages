import {afterAll,beforeAll,describe,expect,it,vi} from 'vitest';
import {createHash} from 'node:crypto';
import {createUkMid2024GeographicResidenceGame,prepareUkMid2024GeographicResidenceStartup,disposeUkCountryStartStartup,ukCountryStartStartupStatus,ukCountryStartStartupDiagnostics} from './countryStartResidence';
import {buildUkMid2024GeographicResidenceGame} from './countryStartResidenceConstruction';
import {serializeGame} from '../../../engine/save';
import baseline from '../../../../research/country-start-v3/baseline-results.json';

const request=(mode:'childhood'|'adult'='adult',rootSeed=73)=>({version:1 as const,mode,rootSeed});
const canonical=(game:Parameters<typeof serializeGame>[0])=>{const value=serializeGame(game);if(!value.ok)throw Error(value.error);return value.raw;};
const memorySamples:unknown[]=[];
beforeAll(async()=>{await prepareUkMid2024GeographicResidenceStartup();},30_000);
afterAll(()=>{console.log(JSON.stringify({gate:'country-start-worker-node-memory',memorySamples}));disposeUkCountryStartStartup();expect(ukCountryStartStartupStatus()).toMatchObject({active:false,ready:false,worker:false});});
describe('actual Node startup worker canonical equivalence',()=>{
 it.each(['childhood','adult'] as const)('returns exact original %s bytes without any entropy',async mode=>{
  let beats=0;const timer=setInterval(()=>beats++,10);
  try{
   const entropy=vi.spyOn(globalThis.crypto,'getRandomValues');
   const game=await createUkMid2024GeographicResidenceGame(request(mode)),sync=buildUkMid2024GeographicResidenceGame(request(mode));
   expect(entropy).not.toHaveBeenCalled();entropy.mockRestore();memorySamples.push({mode,...ukCountryStartStartupDiagnostics()});
   const raw=canonical(game);expect(raw).toBe(canonical(sync));expect(beats).toBeGreaterThan(1);
   const expected=mode==='adult'?'e926ef8d1528356d3bc92abf23934974e9de2a14fc19ed08fb29410f51839a28':'6644f06ebb5aa24360f0c9f1f86c093d2eb0733c5a2661c7486f37a916c752b0';
   expect(createHash('sha256').update(raw).digest('hex')).toBe(expected);expect(game.people!.nextSequence).toBe(2);expect(game.residence.nextSequence).toBe(2);
   expect(game.population!.cohorts.reduce((s,c)=>s+c.count,0)+1).toBe(69_281_437);expect(game.randomness).toEqual(sync.randomness);
  }finally{clearInterval(timer);}
 },30_000);
 it.each(['england','wales','ni','scottish-locality','scottish-admin','london','bradford','leeds','swansea'] as const)('preserves actual worker %s scope/location',async key=>{
  const fixture=baseline.fixtures[key],game=await createUkMid2024GeographicResidenceGame(request('adult',fixture.seed));
  expect(game.population!.memberships[0].areaId).toBe(fixture.area);expect(game.residence.residences[0].location).toEqual(fixture.location);
  expect(canonical(game)).toBe(canonical(buildUkMid2024GeographicResidenceGame(request('adult',fixture.seed))));
  memorySamples.push({fixture:key,...ukCountryStartStartupDiagnostics()});
 },30_000);
 it('preserves name/gender overrides without changing Population/placement/RNG',async()=>{
  const game=await createUkMid2024GeographicResidenceGame({...request(),identity:{name:'  Custom Name  ',genderLabel:'Self-described'}}),sync=buildUkMid2024GeographicResidenceGame(request());
  expect(game.name).toBe('Custom Name');expect(game.gender).toBe('Self-described');expect(game.population).toEqual(sync.population);expect(game.residence).toEqual(sync.residence);expect(game.randomness).toEqual(sync.randomness);
  expect(ukCountryStartStartupStatus()).toMatchObject({active:false,ready:true,worker:true});
 },30_000);
 it('rejects invalid constructor input without fallback and reuses good preparation afterwards',async()=>{
  await expect(createUkMid2024GeographicResidenceGame({...request(),rootSeed:-1})).rejects.toThrow('Invalid');
  await expect(createUkMid2024GeographicResidenceGame({...request(),identity:{name:'x'.repeat(257)}})).rejects.toThrow('Invalid');
  expect(ukCountryStartStartupStatus()).toMatchObject({active:false,ready:true});
 },30_000);
});
