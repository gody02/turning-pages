import {describe,expect,it} from 'vitest';
import {withFormalUnionKindFingerprint,validFormalUnionKind,createFormalUnionKindRegistry,resolveFormalUnionKind} from './kinds';
import {fixtureKindInput,fixtureKinds} from './fixtures';
import type {FormalUnionKindDefinitionV1,FormalUnionKindInputV1} from './types';

describe('Immutable synthetic Formal Union kind contracts',()=>{
  it('builds exact owned versioned content and manifest resolution',()=>{
    const input=fixtureKindInput(),kind=withFormalUnionKindFingerprint(input),registry=createFormalUnionKindRegistry([kind],[{kindId:kind.kindId,fingerprint:kind.fingerprint}]);
    expect(validFormalUnionKind(kind)).toBe(true);expect(kind.fingerprint).toMatch(/^fnv1a64-v1:[0-9a-f]{16}$/);
    expect(Object.isFrozen(kind.limitations)).toBe(true);expect(resolveFormalUnionKind(registry,kind.kindId)).toEqual(kind);
    expect(registry).toEqual({version:1,kinds:[kind],manifest:[{kindId:kind.kindId,fingerprint:kind.fingerprint}]});
  });
  it('normalizes only unordered source/limitation collections and object keys',()=>{
    const input={...fixtureKindInput(),sourceIds:['source.z','source.a'],limitations:['z','a']},a=withFormalUnionKindFingerprint(input),b=withFormalUnionKindFingerprint({...input,sourceIds:['source.a','source.z'],limitations:['a','z']});
    expect(a).toEqual(b);expect(a.fingerprint).toBe(b.fingerprint);
    expect(validFormalUnionKind({...a,sourceIds:[...a.sourceIds].reverse()})).toBe(false);
  });
  it('uses code-point text ordering including supplementary characters',()=>{
    const kind=withFormalUnionKindFingerprint({...fixtureKindInput(),limitations:['\u{1f600}','\ue000']});
    expect(kind.limitations).toEqual(['\ue000','\u{1f600}']);
  });
  it.each([
    {label:'Changed label'},{definition:'Changed semantics'},{jurisdictionId:'synthetic.country'},
    {kindId:'formal-union-kind.synthetic.successor-v2'},{sourceIds:['source.changed']},{limitations:['Changed limitation']},
    {classification:'statutory-institutional-rule' as const,sourceIds:['source.statute']}
  ])('material semantics %j alter fingerprint and cannot reuse expected manifest',change=>{
    const original=withFormalUnionKindFingerprint(fixtureKindInput()),changed=withFormalUnionKindFingerprint({...fixtureKindInput(),...change});
    expect(changed.fingerprint).not.toBe(original.fingerprint);
    expect(()=>createFormalUnionKindRegistry([changed],[{kindId:original.kindId,fingerprint:original.fingerprint}])).toThrow();
  });
  it('rejects fingerprint mismatch without self-recursive hashing',()=>{
    const kind=withFormalUnionKindFingerprint(fixtureKindInput()),bad={...kind,fingerprint:'fnv1a64-v1:0000000000000000'};
    expect(validFormalUnionKind(bad)).toBe(false);expect(()=>createFormalUnionKindRegistry([bad as FormalUnionKindDefinitionV1],[{kindId:kind.kindId,fingerprint:kind.fingerprint}])).toThrow();
    expect(()=>withFormalUnionKindFingerprint(kind as FormalUnionKindInputV1)).toThrow();
  });
  it('requires provenance references for statutory classifications and limitation for authored kinds',()=>{
    expect(()=>withFormalUnionKindFingerprint({...fixtureKindInput(),classification:'statutory-institutional-rule'})).toThrow();
    expect(()=>withFormalUnionKindFingerprint({...fixtureKindInput(),limitations:[]})).toThrow();
    const kind=withFormalUnionKindFingerprint({...fixtureKindInput(),classification:'statutory-institutional-rule',sourceIds:['source.synthetic.statute']});
    expect(kind.classification).toBe('statutory-institutional-rule');
  });
  it('rejects duplicate/missing/extra manifest entries and duplicate kinds',()=>{
    const registry=fixtureKinds(),kind=registry.kinds[0],entry=registry.manifest[0];
    for(const [kinds,manifest] of [[[kind,kind],[entry,entry]],[[kind],[]],[[],[entry]],[[kind],[entry,entry]]])expect(()=>createFormalUnionKindRegistry(kinds as any,manifest as any)).toThrow();
  });
  it('canonicalizes unordered registry factory inputs but rejects noncanonical registered state',()=>{
    const registry=fixtureKinds(),rebuilt=createFormalUnionKindRegistry([...registry.kinds].reverse(),[...registry.manifest].reverse());
    expect(rebuilt).toEqual(registry);expect(()=>resolveFormalUnionKind({...registry,kinds:[...registry.kinds].reverse()},registry.kinds[0].kindId)).toThrow();
  });
  it('rejects unknown version and unresolved kind without latest aliases',()=>{
    const registry=fixtureKinds();
    expect(()=>resolveFormalUnionKind({...registry,version:2} as any,registry.kinds[0].kindId)).toThrow();
    expect(()=>resolveFormalUnionKind(registry,'formal-union-kind.synthetic.missing-v1')).toThrow();expect(()=>resolveFormalUnionKind(registry,'latest')).toThrow();
  });
  it('protects returned registry authority from input and query aliases',()=>{
    const input=fixtureKindInput(),kind=withFormalUnionKindFingerprint(input),manifest=[{kindId:kind.kindId,fingerprint:kind.fingerprint}],registry=createFormalUnionKindRegistry([kind],manifest);
    (input.limitations as string[])[0]='Mutated';manifest[0].kindId='bad';
    expect(registry.manifest[0].kindId).toBe(kind.kindId);expect(registry.kinds[0].limitations[0]).toBe('Synthetic test content only.');
    const resolved=resolveFormalUnionKind(registry,kind.kindId);expect(resolved).not.toBe(registry.kinds[0]);expect(()=>{(resolved.limitations as string[]).push('bad');}).toThrow();
  });
  it.each([
    {kindId:'not-versioned'},{kindId:'formal-union-kind.synthetic.v0'},{jurisdictionId:'Invalid'},
    {classification:'observed'},{label:' '},{definition:''},{label:'\ud800'},{label:'\udc00'},
    {sourceIds:['source.a','source.a']},{limitations:['x','x']},{extra:1}
  ])('rejects malformed descriptor %j',change=>expect(()=>withFormalUnionKindFingerprint({...fixtureKindInput(),...change} as FormalUnionKindInputV1)).toThrow());
  it('rejects accessor/sparse/hidden/symbol/proxy input without invoking getters',()=>{
    let calls=0;const input=fixtureKindInput(),getter={...input,get label(){calls++;return 'name';}},hidden=Object.defineProperty({...input},'hidden',{value:1}),symbol={...input,[Symbol('x')]:1},revoked=Proxy.revocable({},{});revoked.revoke();
    for(const bad of [getter,hidden,symbol,{...input,sourceIds:new Array(1)},new Proxy(input,{}),revoked.proxy])expect(()=>withFormalUnionKindFingerprint(bad as FormalUnionKindInputV1)).toThrow();
    expect(calls).toBe(0);
  });
});
