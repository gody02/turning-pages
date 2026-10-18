import {beforeEach,afterEach,describe,expect,it,vi} from 'vitest';
import type {ReactElement} from 'react';
import type {Game} from '../engine/types';
import {syntheticGuardianshipCareGame} from '../engine/testing/guardianshipCareRootFixture';
import {syntheticResidenceGame} from '../engine/testing/residenceFixture';
import {LifeApp} from './LifeApp';
import {GamePersistence} from '../persistence/service';

// Execute the actual component/effect/event closures with deterministic hook
// storage. No DOM, replacement host implementation or production test seam.
const h=vi.hoisted(()=>({states:[] as any[],refs:[] as any[],effects:[] as (()=>unknown)[],state:0,ref:0,effect:0,
  accept:vi.fn(),build:vi.fn(),save:vi.fn(),recoveries:vi.fn(),close:vi.fn()}));
vi.mock('react',async original=>({...await original<typeof import('react')>(),
  useState:(initial:unknown)=>{const i=h.state++;if(!(i in h.states))h.states[i]=typeof initial==='function'?(initial as ()=>unknown)():initial;return [h.states[i],(next:unknown)=>{h.states[i]=typeof next==='function'?(next as (old:unknown)=>unknown)(h.states[i]):next;}];},
  useRef:(value:unknown)=>{const i=h.ref++;return h.refs[i]??(h.refs[i]={current:value});},
  useEffect:(effect:()=>unknown)=>{h.effects[h.effect++]=effect;}
}));
vi.mock('./gameContent',()=>({acceptApplicationGame:(...args:unknown[])=>h.accept(...args),lifecycleContent:()=>undefined,applicationResolversReady:()=>true}));
vi.mock('./newGame',async original=>({...await original<typeof import('./newGame')>(),createProductionUkNewGame:(...args:unknown[])=>h.build(...args)}));
vi.mock('../persistence/capabilities',()=>({storagePersistenceState:async()=>'persistent',requestPersistentStorage:async()=>'persistent'}));

const render=()=>{h.state=h.ref=h.effect=0;return LifeApp();};
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
function elements(node:unknown):ReactElement<any>[] {
 if(Array.isArray(node))return node.flatMap(elements);
 if(!node||typeof node!=='object'||!('props' in node))return [];
 const element=node as ReactElement<any>;return [element,...elements(element.props.children)];
}
const text=(node:unknown):string=>Array.isArray(node)?node.map(text).join(''):node&&typeof node==='object'&&'props' in node?text((node as ReactElement<any>).props.children):typeof node==='string'?node:'';
const button=(tree:unknown,label:string)=>{const found=elements(tree).find(e=>e.type==='button'&&text(e.props.children).includes(label));if(!found)throw Error('Missing button '+label);return found;};
async function start(raw:Game|null){
 const service={initialize:vi.fn(async()=>({game:raw,revision:raw?1:null,status:raw?'loaded':'no-save',recoveries:[],staleLegacy:null,error:null,markerWarning:null})),save:h.save,recoveries:h.recoveries,close:h.close};
 vi.spyOn(GamePersistence,'open').mockResolvedValue(service as unknown as GamePersistence);
 render();const cleanup=h.effects[0]() as ()=>void;await flush();return {service,cleanup};
}
beforeEach(()=>{
 h.states=[];h.refs=[];h.effects=[];h.state=h.ref=h.effect=0;h.accept.mockReset();h.build.mockReset();h.save.mockReset();h.recoveries.mockReset();h.close.mockReset();
 h.accept.mockImplementation(async(game:Game)=>structuredClone(game));h.save.mockResolvedValue(2);h.recoveries.mockResolvedValue([]);
 vi.stubGlobal('location',{hash:'#life'});vi.stubGlobal('localStorage',{});vi.stubGlobal('addEventListener',vi.fn());vi.stubGlobal('removeEventListener',vi.fn());
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('LifeApp authoritative accepted snapshot propagation',()=>{
 it('activates the accepted startup object and retains no mutable input alias',async()=>{
  const raw=syntheticGuardianshipCareGame(),before=structuredClone(raw);await start(raw);
  const accepted=await h.accept.mock.results[0].value;expect(h.states[2]).toBe(accepted);expect(accepted).toEqual(before);expect(accepted).not.toBe(raw);expect(accepted.people).not.toBe(raw.people);
  raw.name='Caller mutation';expect(h.states[2]).toEqual(before);expect(h.save).not.toHaveBeenCalled();
 });
 it('publishes no startup state on failed acceptance, then retries with the accepted result',async()=>{
  const raw=syntheticGuardianshipCareGame();h.accept.mockRejectedValueOnce(Error('unavailable'));await start(raw);
  expect(h.states[0]).toBe('content-failed');expect(h.states[2]).toBeNull();expect(h.save).not.toHaveBeenCalled();
  await button(render(),'Retry loading').props.onClick();await flush();const accepted=await h.accept.mock.results[1].value;
  expect(h.states[2]).toBe(accepted);expect(accepted).toEqual(raw);expect(accepted).not.toBe(raw);expect(h.states[1]).toBeNull();expect(h.states[0]).toBe('ready');
 });
 it('uses accepted recovery selection and the same replacement snapshot for save and activation',async()=>{
  await start(syntheticGuardianshipCareGame());const recovery=syntheticGuardianshipCareGame();h.states[3]=true;h.states[8]=[{slotId:'previous',key:'previous',label:'Restore previous successful save',game:recovery}];
  await button(render(),'Restore previous successful save').props.onClick();await flush();const selected=await h.accept.mock.results[1].value;
  expect(h.states[14]).toBe(selected);expect(selected).not.toBe(recovery);expect(h.save).not.toHaveBeenCalled();
  await button(render(),'Restore this life').props.onClick();await flush();const accepted=await h.accept.mock.results[2].value;
  expect(h.save).toHaveBeenCalledWith(accepted,1);expect(h.save.mock.calls[0][0]).toBe(accepted);expect(h.states[2]).toBe(accepted);expect(accepted).not.toBe(selected);expect(accepted).toEqual(selected);
 });
 it('keeps active state exact on failed replacement commit',async()=>{
  await start(syntheticGuardianshipCareGame());const active=h.states[2];h.states[14]=syntheticGuardianshipCareGame();h.save.mockRejectedValueOnce(Error('commit failed'));
  await button(render(),'Restore this life').props.onClick();await flush();expect(h.states[2]).toBe(active);expect(h.states[14]).not.toBeNull();
 });
 it('new-game creation saves and activates only the accepted current-root snapshot',async()=>{
  await start(null);const direct=syntheticResidenceGame();h.build.mockResolvedValue(direct);
  const form=elements(render()).find(e=>e.type==='form')!;form.props.onSubmit({preventDefault:()=>{}});await flush();
  const accepted=await h.accept.mock.results[0].value;
  expect(accepted.version).toBe(8);expect(accepted).not.toBe(h.accept.mock.calls[0][0]);expect(h.save.mock.calls[0][0]).toBe(accepted);expect(h.states[2]).toBe(accepted);expect(direct.version).toBe(4);
 });
 it('suppresses late startup acceptance after unmount',async()=>{
  let resolve!:(game:Game)=>void;h.accept.mockImplementationOnce(()=>new Promise<Game>(yes=>{resolve=yes;}));const {cleanup}=await start(syntheticGuardianshipCareGame());
  cleanup();resolve(syntheticGuardianshipCareGame());await flush();expect(h.states[2]).toBeNull();expect(h.save).not.toHaveBeenCalled();expect(h.close).toHaveBeenCalled();
 });
 it('does not save or activate when new-game content acceptance fails',async()=>{
  await start(null);h.build.mockResolvedValue(syntheticResidenceGame());h.accept.mockRejectedValueOnce(Error('content unavailable'));vi.spyOn(console,'error').mockImplementation(()=>{});
  elements(render()).find(e=>e.type==='form')!.props.onSubmit({preventDefault:()=>{}});await flush();expect(h.save).not.toHaveBeenCalled();expect(h.states[2]).toBeNull();expect(h.states[4]).toBe('idle');
 });
 it('leaves the current life and recovery selection unchanged when recovery acceptance fails',async()=>{
  await start(syntheticGuardianshipCareGame());const active=h.states[2];h.states[3]=true;h.states[8]=[{slotId:'previous',key:'previous',label:'Restore previous successful save',game:syntheticGuardianshipCareGame()}];h.accept.mockRejectedValueOnce(Error('unavailable'));
  await button(render(),'Restore previous successful save').props.onClick();await flush();expect(h.states[2]).toBe(active);expect(h.states[14]).toBeNull();expect(h.save).not.toHaveBeenCalled();
 });
 it('suppresses stale replacement preparation before commit',async()=>{
  await start(syntheticGuardianshipCareGame());const active=h.states[2];h.states[14]=syntheticGuardianshipCareGame();let resolve!:(g:Game)=>void;h.accept.mockImplementationOnce(()=>new Promise<Game>(yes=>{resolve=yes;}));
  const pending=button(render(),'Restore this life').props.onClick();await flush();h.refs[1].current++;resolve(syntheticGuardianshipCareGame());await pending;await flush();expect(h.states[2]).toBe(active);expect(h.save).not.toHaveBeenCalled();
 });
});
