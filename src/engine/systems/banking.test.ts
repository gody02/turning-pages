import {describe,expect,it} from 'vitest';
import {allocateLoanRepayment} from './banking';

describe('bank repayment allocation',()=>{
 it('allocates a sub-1 loan-book repayment from the real outstanding balance',()=>{
  const allocation=allocateLoanRepayment(.5,.0001,.0016675);
  expect(allocation.repaid).toBeCloseTo(.0016675,15);
  expect(allocation.mortgageRepaid+allocation.businessRepaid).toBeCloseTo(allocation.repaid,15);
  expect(allocation.mortgageRepaid).toBeLessThanOrEqual(.5);
  expect(allocation.businessRepaid).toBeLessThanOrEqual(.0001);
 });

 it('handles near-zero mortgage and business exposures symmetrically',()=>{
  const nearBusiness=allocateLoanRepayment(.75,1e-12,.01);
  const nearMortgage=allocateLoanRepayment(1e-12,.75,.01);
  expect(nearBusiness.businessRepaid).toBeLessThanOrEqual(1e-12);
  expect(nearMortgage.mortgageRepaid).toBeLessThanOrEqual(1e-12);
  expect(nearBusiness.mortgageRepaid+nearBusiness.businessRepaid).toBeCloseTo(.01,15);
  expect(nearMortgage.mortgageRepaid+nearMortgage.businessRepaid).toBeCloseTo(.01,15);
 });

 it('applies no repayment to a zero book',()=>{
  expect(allocateLoanRepayment(0,0,10)).toEqual({repaid:0,mortgageRepaid:0,businessRepaid:0});
 });

 it('caps repayment to the outstanding book, including exact full repayment',()=>{
  expect(allocateLoanRepayment(.2,.3,10)).toEqual({repaid:.5,mortgageRepaid:.2,businessRepaid:.3});
  expect(allocateLoanRepayment(.2,.3,.5)).toEqual({repaid:.5,mortgageRepaid:.2,businessRepaid:.3});
 });

 it('preserves proportional allocation for normal-sized books',()=>{
  const allocation=allocateLoanRepayment(70,30,4);
  expect(allocation.repaid).toBe(4);
  expect(allocation.mortgageRepaid).toBeCloseTo(2.8,15);
  expect(allocation.businessRepaid).toBeCloseTo(1.2,15);
 });
});
