import {describe,it,expect} from 'vitest';
import {baselineBudget,nationalLaws} from '../data/national';
import {createNational,advanceNational,costBudget,nationalAction,nationalReason} from './national';
import {createInstitutions,ensureInstitutions,bankAssets,bankLiabilities,capitalRatio,mortgagePayment,regionGrant,rebalanceFactions,factionDivision,factionAssessment,designFor,defaultDesign,lawCost,lawDelay,lawExtent,lawActive,stepInstitutions,consentRegions} from './institutions';
import {institutionAction,institutionReason} from './institutionActions';
import {validInstitutions} from './institutionsSave';
import {validNational} from './nationalSave';
import {forecast} from './forecast';
import {createGame} from './game';
import {adultStart,joinPolitics,choosePoliticalEvent,advancePoliticalMonth} from './politics';
import {isGame,saveGame,loadGame,SAVE_KEY,PRE_INSTITUTIONS_SAVE_KEY} from './save';
function member(){let g=choosePoliticalEvent(joinPolitics(adultStart(createGame('Sam','Woman','uk',22)),'labour','socratic'),0);Object.assign(g.politics!,{role:'premier',seats:410,inGovernment:true,knowledge:90,caucus:90,integrity:90});g.actions=3;g.politics!.national=createNational(22);return g;}
const law=(id:string)=>nationalLaws.find(l=>l.id===id)!;
describe('banking and devolved institutions',()=>{
 it('balances bank books across rates, credit stress and long seeded histories',()=>{
  for(let seed=1;seed<=5;seed++){let n=createNational(seed);ensureInstitutions(n,350,'labour');if(seed%2){n.confidence=10;n.unemployment=15;n.bankRate=12;}
   for(let m=0;m<120;m++){n=advanceNational(n,true);for(const b of n.institutions!.banks){expect(bankAssets(b)).toBeCloseTo(bankLiabilities(b),6);expect(b.equity).toBeGreaterThanOrEqual(0);expect(b.deposits).toBeGreaterThanOrEqual(0);}expect(validNational(n,n.month)).toBe(true);}
  }
 });
 it('records credit creation and repayment and makes constrained capital reduce lending',()=>{
  const n=createNational(1),i=ensureInstitutions(n);const b=i.banks[0],loss=b.equity*.55;b.equity-=loss;b.mortgages-=loss;
  stepInstitutions(n,()=>.5,[]);expect(i.bankLog).toHaveLength(3);expect(i.bankLog.every(x=>x.repaid>0)).toBe(true);expect(i.bankLog[0].created).toBe(0);expect(i.bankLog[1].created).toBeGreaterThan(0);expect(i.credit).toBeLessThan(1);expect(bankAssets(b)).toBeCloseTo(bankLiabilities(b),8);
 });
 it('funds liquidity with a matching central-bank liability and capital with creditor conversion and public cost',()=>{
  const n=createNational(2),i=ensureInstitutions(n),b=i.banks[0];const withdrawal=b.reserves-1;b.reserves-=withdrawal;b.deposits-=withdrawal;i.cashOutside+=withdrawal;
  b.deposits+=b.wholesale-10;b.wholesale=10;const loss=b.equity*.9;b.equity-=loss;b.mortgages-=loss;
  stepInstitutions(n,()=>.5,[]);expect(b.central).toBeGreaterThan(0);expect(i.publicCost).toBeGreaterThan(0);expect(b.wholesale).toBe(0);expect(capitalRatio(b)).toBeCloseTo(10,5);expect(bankAssets(b)).toBeCloseTo(bankLiabilities(b),7);
  const flow=costBudget(n,n.budget).flows.find(f=>f.name==='Statutory bank resolution support')!;expect(flow.amount).toBeCloseTo(i.publicCost,3);
 });
 it('uses a repayment mortgage calculation including zero interest',()=>{expect(mortgagePayment(200000,5)).toBeCloseTo(1169.18,2);expect(mortgagePayment(120000,0,10)).toBe(1000);});
 it('transmits the scale of delivered banking legislation to credit and loan losses',()=>{const base=createNational(3),tight=structuredClone(base),care=structuredClone(base);tight.enacted=[{id:'bankcapital',month:0,due:0,intensity:1.5,delivered:true}];care.enacted=[{id:'mortgagecare',month:0,due:0,intensity:1,delivered:true}];for(const n of [base,tight,care])stepInstitutions(n,()=>.5,[]);expect(tight.institutions!.credit).toBeLessThan(base.institutions!.credit);expect(care.institutions!.banks[0].losses).toBeLessThan(base.institutions!.banks[0].losses);});
 it('does not double count opening grants and costs Barnett-like changes in a draft',()=>{
  const n=createNational(3),before=costBudget(n,n.budget);const i=ensureInstitutions(n);expect(costBudget(n,n.budget).spending).toBeCloseTo(before.spending,3);
  const b={...n.budget,health:n.budget.health+10};for(const r of i.regions)expect(regionGrant(r,b,1)-regionGrant(r,n.budget,1)).toBeCloseTo(10*r.populationRatio,8);
  expect(costBudget(n,b).spending-before.spending).toBeCloseTo(10*(1+.096+.055+.034)/12,3);
  const next=advanceNational(n,true);for(const r of next.institutions!.regions)expect(next.fiscal.flows.find(f=>f.name===`${r.name} block grant`)!.amount*12).toBeCloseTo(r.grant,2);
 });
 it('lets devolved allocations change autonomously and distinguishes the justice jurisdiction',()=>{const n=createNational(1),i=ensureInstitutions(n),r=i.regions[1],old=r.healthShare;stepInstitutions(n,()=>0,[]);expect(r.healthShare).not.toBe(old);expect(consentRegions(law('courts'))).toEqual(['scotland','ni']);expect(consentRegions(law('nurses'))).toHaveLength(3);expect(consentRegions(law('bankcapital'))).toHaveLength(0);});
 it('rejects malformed institutional imports without throwing',()=>{const i=createInstitutions(0);const bad=structuredClone(i);bad.banks[0].deposits++;expect(validInstitutions(bad,0)).toBe(false);expect(validInstitutions({...i,factions:[null,...i.factions.slice(1)]},0)).toBe(false);expect(validInstitutions({...i,regions:i.regions.map(r=>({...r,consent:'unknown'}))},0)).toBe(false);expect(validInstitutions(i,0)).toBe(true);const n=createNational(1);n.proposal={kind:'budget',id:'budget',stage:0,lastMonth:0,support:0,intensity:1,consent:true,budget:{...baselineBudget},design:{...defaultDesign,scope:'agreement'}};expect(validNational(n,0)).toBe(false);});
});
describe('legislation, consent and caucus memory',()=>{
 it('provides unique templates and preserves costs of laws enacted before configurable designs',()=>{expect(nationalLaws.length).toBe(72);expect(new Set(nationalLaws.map(l=>l.id)).size).toBe(nationalLaws.length);const l=law('nurses'),d=designFor(l,{...defaultDesign,scale:1.5,scope:'england',delivery:'accelerated',sunset:60});expect(lawCost(l,1)).toBe(l.cost);expect(lawCost(l,1.5,d)).toBeCloseTo(l.cost*1.5*.84*1.25);expect(lawExtent(l)).toBe(1);expect(lawDelay(l,d)).toBeLessThan(l.delay);expect(lawActive({month:10,design:d},69)).toBe(true);expect(lawActive({month:10,design:d},70)).toBe(false);});
 it('freezes a designed bill without mutating its caller and supports half-scale amendments',()=>{let g=member();const d={...defaultDesign,scope:'agreement' as const,scale:1.5 as const,delivery:'accelerated' as const};const original=structuredClone(d);g=nationalAction(g,'law','bankcapital',undefined,d);expect(d).toEqual(original);expect(g.politics!.national!.proposal!.design!.scope).toBe('uk');expect(g.politics!.national!.institutions!.judicialRisk).toBe(23);g=nationalAction(g,'amend');expect(g.politics!.national!.proposal!.design!.scale).toBe(.5);expect(isGame(g)).toBe(true);});
 it('requires only relevant consent for an agreement and prices a unilateral override in relationships',()=>{
  let g=nationalAction(member(),'law','courts',undefined,{...defaultDesign,scope:'agreement'});const p=g.politics!,n=p.national!;n.proposal!.stage=5;n.proposal!.lastMonth=-1;expect(nationalReason(g,'advance')).toContain('consent');
  for(const r of n.institutions!.regions.filter(r=>r.id!=='wales'))r.consent='courts';expect(nationalReason(g,'advance')).toBeNull();expect(institutionReason(g,'consent','wales')).toContain('does not request');expect(institutionReason(g,'consent','scotland')).toContain('already');
  g=nationalAction(member(),'law','courts',undefined,{...defaultDesign,scope:'override'});expect(g.politics!.national!.institutions!.regions.map(r=>r.trust)).toEqual([40,60,35]);
 });
 it('changes consent outcomes with relationship and consultation without consuming actions on invalid requests',()=>{
  const g=nationalAction(member(),'law','nurses',undefined,{...defaultDesign,scope:'agreement'});g.politics!.national!.seed=1;const next=institutionAction(g,'consent','scotland');expect(next.actions).toBe(g.actions-1);expect(next.politics!.national!.institutions!.regions[0].consent).toBe('nurses');expect(g.politics!.national!.institutions!.regions[0].consent).toBeNull();expect(institutionAction(next,'consent','scotland')).toBe(next);
 });
 it('allocates 650 seats by party, preserves relationships across elections and counts every vote',()=>{
  const n=createNational(1),i=ensureInstitutions(n,410,'labour'),old=i.factions[1].seats;i.factions[0].trust=77;rebalanceFactions(i,330,'conservative');expect(i.factions.reduce((s,f)=>s+f.seats,0)).toBe(650);expect(i.factions[1].seats).not.toBe(old);expect(i.factions[0].trust).toBe(77);
  const p={kind:'law' as const,id:'grid',stage:0,lastMonth:0,support:10,intensity:1,consent:true,budget:null};i.whip='three-line';let seed=11;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};const vote=factionDivision(n,p,{seats:330,party:'conservative',caucus:40,integrity:60},50,rng);expect(vote.ayes+vote.noes+vote.abstain).toBe(650);expect(i.factions.filter(f=>f.side==='own').some(f=>f.grievance>0)).toBe(true);expect(validInstitutions(i,0)).toBe(true);
 });
 it('remembers both kept and broken twelve-month commitments',()=>{
  const g=institutionAction(member(),'promise','own-labour');const n=g.politics!.national!,f=n.institutions!.factions.find(f=>f.id==='own-labour')!;expect(f.promise).toBe('Work');const fulfilled=structuredClone(n);fulfilled.enacted.push({id:'bargaining',month:6,due:12,intensity:1,delivered:false});n.month=12;fulfilled.month=12;stepInstitutions(n,()=>.5,[]);stepInstitutions(fulfilled,()=>.5,[]);expect(f.promise).toBeNull();expect(f.grievance).toBe(12);expect(fulfilled.institutions!.factions.find(x=>x.id==='own-labour')!.trust).toBeGreaterThan(f.trust);expect(n.institutions!.minutes[0].text).toContain('unfulfilled');
 });
 it('ends recurring funding at sunset without deleting completed capacity or rewriting historical Acts',()=>{const n=createNational(1);n.month=59;n.enacted=[{id:'nurses',month:0,due:24,intensity:1,delivered:true,design:{...defaultDesign,sunset:60}}];const active=costBudget(n,n.budget);n.month=60;expect(costBudget(n,n.budget).spending).toBeCloseTo(active.spending-8/12,3);expect(n.enacted).toHaveLength(1);expect(n.health).toBe(55);});
 it('uses role and shared-choice locks for every institutional action',()=>{const g=member();g.politics!.role='activist';expect(institutionAction(g,'bank')).toBe(g);g.politics!.role='mp';expect(institutionAction(g,'whip','three-line')).toBe(g);g.actions=0;expect(institutionAction(g,'region','wales')).toBe(g);g.actions=3;g.politics!.pending='purpose';expect(institutionAction(g,'bank')).toBe(g);});
 it('gives caucuses policy-specific concerns rather than only different names',()=>{const n=createNational(1),i=ensureInstitutions(n,400,'labour'),p={kind:'law' as const,id:'nurses',stage:0,lastMonth:0,support:0,intensity:1,consent:true,budget:null,design:{...defaultDesign,scope:'override' as const}};const liberty=i.factions.find(f=>f.id==='own-liberties')!,fiscal=i.factions.find(f=>f.id==='own-fiscal')!;expect(factionAssessment(n,p,liberty).adjustment).toBeLessThan(factionAssessment(n,{...p,design:{...p.design,scope:'agreement'}},liberty).adjustment);expect(factionAssessment(n,{...p,intensity:1.5},fiscal).adjustment).toBeLessThan(factionAssessment(n,{...p,intensity:.5},fiscal).adjustment);});
 it('feeds intergovernmental pressure and party grievances back into the political career',()=>{const g=member(),i=ensureInstitutions(g.politics!.national!,410,'labour'),tense=structuredClone(g);for(const r of tense.politics!.national!.institutions!.regions)r.pressure=95;for(const f of tense.politics!.national!.institutions!.factions)f.grievance=80;const ordinary=advancePoliticalMonth(g),strained=advancePoliticalMonth(tense);expect(strained.politics!.support).toBeLessThan(ordinary.politics!.support);expect(strained.politics!.caucus).toBeLessThan(ordinary.politics!.caucus);expect(i.regions[0].pressure).toBe(25);expect(isGame(strained)).toBe(true);});
});
describe('conditional outlooks and existing lives',()=>{
 it('keeps forecasts pure, reproducible, ordered and separate from the actual future',()=>{const n=createNational(22),original=structuredClone(n),result=forecast(n,n.budget,'baseline',12,8);expect(n).toEqual(original);expect(forecast(n,n.budget,'baseline',12,8)).toEqual(result);for(const p of result.points)for(const k of ['growth','inflation','unemployment','debt','credit'] as const)expect(p[k][0]<=p[k][1]&&p[k][1]<=p[k][2]).toBe(true);expect(result.points[0].growth[1]).not.toBe(advanceNational(n,true).growth);});
 it('transmits energy and credit stress and rejects invalid policy assumptions',()=>{const n=createNational(22),base=forecast(n,n.budget,'baseline',12,8),energy=forecast(n,n.budget,'energy',12,8),credit=forecast(n,n.budget,'credit',12,8);expect(energy.points[0].inflation[1]).toBeGreaterThan(base.points[0].inflation[1]);expect(credit.points[0].credit[1]).toBeLessThan(base.points[0].credit[1]);expect(credit.points.at(-1)!.growth[1]).toBeLessThan(base.points.at(-1)!.growth[1]);expect(()=>forecast(n,{...baselineBudget,vat:99})).toThrow();});
 it('preserves the exact pre-institutions save before first overwrite and refuses overwrite if recovery fails',()=>{
  const g=member(),raw=JSON.stringify(g,null,2),data=new Map([[SAVE_KEY,raw]]);const storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);}};expect(loadGame(storage).game).toEqual(g);const next=institutionAction(g,'bank');expect(saveGame(storage,next)).toBeNull();expect(data.get(PRE_INSTITUTIONS_SAVE_KEY)).toBe(raw);expect(isGame(loadGame(storage).game)).toBe(true);
  const blocked={getItem:(k:string)=>k===SAVE_KEY?raw:null,setItem:()=>{throw Error('Quota');}};expect(saveGame(blocked,next)).toBeTruthy();expect(blocked.getItem(SAVE_KEY)).toBe(raw);expect(g.politics!.national!.institutions).toBeUndefined();
 });
});
