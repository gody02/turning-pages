import {describe,expect,it} from 'vitest';
import {advanceNational,createNational} from './politics/uk/national';
import {validNational} from './politics/uk/nationalSave';
import {bankAssets,bankLiabilities} from './systems/banking';

describe('UK banking repayment regression',()=>{
 it('repairs the exact month-780 to month-781 deterministic transition',()=>{
  let state=createNational(4_829_914);
  while(state.month<780)state=advanceNational(state,false);
  expect(validNational(state,state.month)).toBe(true);
  const opening=state.institutions!.banks.find(candidate=>candidate.id==='commercial')!;
  expect(opening.mortgages+opening.business).toBeGreaterThan(0);
  expect(opening.mortgages+opening.business).toBeLessThan(1);
  const first=advanceNational(structuredClone(state),false),replay=advanceNational(structuredClone(state),false);
  expect(first).toEqual(replay);expect(first.month).toBe(781);expect(validNational(first,first.month)).toBe(true);
  const bank=first.institutions!.banks.find(candidate=>candidate.id==='commercial')!;
  expect(bank.mortgages).toBeGreaterThanOrEqual(0);expect(bank.business).toBeGreaterThanOrEqual(0);
  expect(bankAssets(bank)).toBeCloseTo(bankLiabilities(bank),6);
 });

 it('continues the known seed beyond the former failure month',()=>{
  let state=createNational(4_829_914);
  while(state.month<900){state=advanceNational(state,false);expect(validNational(state,state.month)).toBe(true);}
  expect(state.month).toBe(900);
 });
});
