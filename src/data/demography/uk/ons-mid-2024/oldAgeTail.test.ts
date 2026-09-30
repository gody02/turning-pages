import {describe,expect,it} from 'vitest';
import {allocateCompletedAgePopulationToBirthYears,compileUkOldAgeTail,renderUkOldAgeTailReport,UK_OLD_AGE_TAIL_MODEL_ID,type UkOldAgeTailInput} from './oldAgeTail';

const counts=[136960,114880,95850,76860,59550,44020,31760,22670,15650,10390,6720,4260,2620,1560,890];
const input=():UkOldAgeTailInput=>({referenceDate:{year:2024,month:6,day:30},authoritative90Plus:625236,published90Plus:625240,published105Plus:610,ages90To104:counts.map((count,index)=>({age:90+index,count})),sourceReleaseIds:['MYE24UK','UK-EVO-2002-2024']});

describe('UK old-age-tail geometric-adjacent v1',()=>{
  it('derives the exact approved ratio, powers and canonical closed tail',()=>{
    const report=compileUkOldAgeTail(input());
    expect(report.modelId).toBe(UK_OLD_AGE_TAIL_MODEL_ID);
    expect(report.ratio).toEqual({numerator:'933',denominator:'1516',value:'933/1516'});
    expect(report.rawTailWeights).toHaveLength(15);
    expect(report.rawTailWeights[0]).toEqual({age:105,weight:'1'});
    expect(report.rawTailWeights[14].weight).toBe('378741602550906142415558165507837174716329/338679428413105585182065169364312331634343936');
    expect(report.canonicalTail105To119.map(item=>item.count)).toEqual([235,144,89,55,34,21,13,8,5,3,2,1,1,0,0]);
    expect(report.canonicalTailTotal).toBe(611);
    expect(report.canonical90PlusTotal).toBe(625236);
    expect(report.canonicalAges90To119.some(item=>item.age===120)).toBe(false);
  });

  it('uses rounded 610 as an input weight and reconciles the whole rounded 90+ vector',()=>{
    const report=compileUkOldAgeTail(input());
    expect(report.preReconciliationTailTotal).toBe(610);
    expect(report.reconciliation.inputTotal).toBe('625250');
    expect(report.reconciliation.target).toBe(625236);
    expect(report.unsupportedResidualBeforeModel).toBe(596);
    expect(report.canonicalAges90To119.reduce((sum,item)=>sum+item.count,0)).toBe(625236);
    for(const item of report.canonicalAges90To119.filter(item=>item.age<=104))expect(Math.abs(item.count-counts[item.age-90])).toBeLessThanOrEqual(5);
    expect(Math.abs(report.canonicalTailTotal-610)).toBeLessThanOrEqual(5);
  });

  it('is input-order independent and rejects missing, duplicate, invalid and incompatible inputs',()=>{
    const canonical=compileUkOldAgeTail(input()),reversed=compileUkOldAgeTail({...input(),ages90To104:[...input().ages90To104].reverse()});
    expect(reversed).toEqual(canonical);
    expect(()=>compileUkOldAgeTail({...input(),ages90To104:input().ages90To104.slice(1)})).toThrow('Invalid UK old-age-tail');
    expect(()=>compileUkOldAgeTail({...input(),ages90To104:[...input().ages90To104.slice(0,-1),input().ages90To104[0]]})).toThrow('Invalid UK old-age-tail');
    expect(()=>compileUkOldAgeTail({...input(),authoritative90Plus:620000})).toThrow('Invalid UK old-age-tail');
    const zero=input().ages90To104.map(item=>item.age>=101?{...item,count:0}:item);
    expect(()=>compileUkOldAgeTail({...input(),ages90To104:zero})).toThrow('between zero and one');
    const excessive=input().ages90To104.map(item=>item.age===104?{...item,count:20000}:item);
    expect(()=>compileUkOldAgeTail({...input(),ages90To104:excessive,authoritative90Plus:644346,published90Plus:644350})).toThrow('between zero and one');
  });

  it('produces deterministic diagnostics without changing the canonical result',()=>{
    const report=compileUkOldAgeTail(input()),ids=report.sensitivity.map(item=>item.id);
    expect(ids).toEqual(expect.arrayContaining(['canonical.pooled-adjacent','rounding.lower-bound','rounding.upper-bound','estimator.median-adjacent','estimator.endpoint-geometric','estimator.log-linear','stress.last-adjacent-ratio','reconciliation.preserve-90-104-allocate-residual','envelope.minimum-adjacent-ratio','envelope.maximum-adjacent-ratio']));
    expect(report.sensitivity.find(item=>item.id==='rounding.lower-bound')?.ratio).toBe('931/1515');
    expect(report.sensitivity.find(item=>item.id==='rounding.upper-bound')?.ratio).toBe('935/1517');
    expect(report.sensitivity.find(item=>item.id==='reconciliation.preserve-90-104-allocate-residual')?.postReconciliationTailTotal).toBe(596);
    expect(report.sensitivity.every(item=>item.authoritative90Plus===625236&&item.authoritativePopulation===69281437)).toBe(true);
    expect(report.canonicalTail105To119.map(item=>item.count)).toEqual([235,144,89,55,34,21,13,8,5,3,2,1,1,0,0]);
  });

  it('converts each completed-age count to exact Gregorian birth years with per-age conservation and pre-1900 support',()=>{
    const report=compileUkOldAgeTail(input()),birthYears=report.canonicalBirthYears;
    expect(birthYears[0].birthYear).toBe(1906);
    expect(birthYears.at(-1)?.birthYear).toBe(1934);
    expect(birthYears.reduce((sum,item)=>sum+item.count,0)).toBe(625236);
    const historical=allocateCompletedAgePopulationToBirthYears({year:2024,month:6,day:30},[{age:125,count:10}]);
    expect(historical[0].birthYear).toBe(1898);
    expect(historical.reduce((sum,item)=>sum+item.count,0)).toBe(10);
  });

  it('retains explicit false-precision lineage and renders only from the machine report',()=>{
    const report=compileUkOldAgeTail(input()),text=renderUkOldAgeTailReport(report);
    expect(report.lineage).toHaveLength(15);
    expect(report.lineage.every(item=>item.assumedTailShape&&item.calibratedIntegerAllocation&&!item.directlyObserved)).toBe(true);
    expect(report.lineage[3].statement).toContain('not an ONS single-age estimate');
    expect(report.terminalAgeAssumption.classification).toBe('official-method-assumption');
    expect(text).toContain('Exact continuation ratio: 933/1516');
    expect(text).toContain('not an ONS single-age estimate');
    expect(Object.isFrozen(report)).toBe(true);
  });
});
