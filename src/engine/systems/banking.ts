import {clamp} from '../core/random';
export type Bank={id:string;name:string;mortgages:number;business:number;reserves:number;gilts:number;deposits:number;wholesale:number;central:number;equity:number;mortgageRate:number;loanRate:number;arrears:number;newCredit:number;losses:number;status:string};

/** 'gilts' is the v1 serialized name for the government-securities asset bucket. */
export type BankingBook={month:number;banks:Bank[];credit:number;cashOutside:number;publicCost:number;bankLog:{month:number;bank:string;created:number;repaid:number;losses:number;support:number}[]};
export type BankingPolicy={capitalBuffer:number;creditMultiplier:number;bankCreditMultipliers:Record<string,number>;mortgageShares:Record<string,number>;affordabilityMultiplier:number;lossMultiplier:number;operatingMultiplier:number;withdrawalMultiplier:number};
export type BankingNotice={kind:'liquidity'|'resolution';bank:string;amount:number;bailIn?:number};
export const bankAssets=(b:Bank)=>b.mortgages+b.business+b.reserves+b.gilts;
export const bankLiabilities=(b:Bank)=>b.deposits+b.wholesale+b.central+b.equity;
export const capitalRatio=(b:Bank)=>b.equity/Math.max(1,b.mortgages*.35+b.business*.8+b.gilts*.05)*100;
export function mortgagePayment(principal:number,annualRate:number,years=25){const r=annualRate/1200,m=years*12;return r===0?principal/m:principal*r/(1-Math.pow(1+r,-m));}

/** Apply double-entry changes to a transaction draft. Country policy and messages are injected. */
export function stepBanks(i:BankingBook,conditions:{confidence:number;unemployment:number;bankRate:number},policy:BankingPolicy,random:()=>number,notice:(e:BankingNotice)=>void){
 i.publicCost=0;
 let supply=0;
 for(const b of i.banks){
  const capital=capitalRatio(b);const buffer=policy.capitalBuffer;
  const desired=(b.mortgages+b.business)*.0048*clamp(conditions.confidence/55,.3,1.4)*policy.creditMultiplier*(policy.bankCreditMultipliers[b.id]??1);
  const mortgageShare=policy.mortgageShares[b.id]??.7;
  const capacity=Math.max(0,(b.equity/(buffer/100)-(b.mortgages*.35+b.business*.8+b.gilts*.05))/(mortgageShare*.35+(1-mortgageShare)*.8));
  const created=Math.min(desired,capacity)*policy.affordabilityMultiplier;
  b.mortgages+=created*mortgageShare;b.business+=created*(1-mortgageShare);b.deposits+=created;b.newCredit=created;
  const repaid=Math.min(b.deposits*.02,b.mortgages/300+b.business/120);
  const mShare=b.mortgages/Math.max(1,b.mortgages+b.business);b.mortgages-=repaid*mShare;b.business-=repaid*(1-mShare);b.deposits-=repaid;
  b.mortgageRate+=(conditions.bankRate+1.2-b.mortgageRate)/24;b.loanRate=conditions.bankRate+2.2+Math.max(0,buffer-capital)*.12;
  b.arrears=clamp(b.arrears*.92+(1+Math.max(0,conditions.unemployment-4.9)*.7+Math.max(0,b.mortgageRate-5)*.45)*.08+(random()-.5)*.08,.1,20);
  const lossRate=(.00015+b.arrears*.0001+Math.max(0,40-conditions.confidence)*.00012)*policy.lossMultiplier;
  const losses=(b.mortgages+b.business)*lossRate;b.mortgages*=1-lossRate;b.business*=1-lossRate;b.equity-=losses;b.losses=losses;
  const received=Math.min(b.deposits*.05,(b.mortgages*b.mortgageRate+b.business*b.loanRate)/1200);
  b.deposits-=received;b.equity+=received;
  const depositInterest=b.deposits*Math.max(0,conditions.bankRate-1.5)/1200;b.deposits+=depositInterest;b.equity-=depositInterest;
  const operating=Math.max(0,b.equity)*.006*policy.operatingMultiplier; b.deposits+=operating;b.equity-=operating; // costs paid into non-bank deposits
  const withdrawal=Math.min(b.reserves*.5,b.deposits*(.0003+Math.max(0,45-conditions.confidence)*.00015)*policy.withdrawalMultiplier);b.deposits-=withdrawal;b.reserves-=withdrawal;i.cashOutside+=withdrawal;
  if(b.reserves<b.deposits*.035){const liquidity=Math.min(Math.max(0,b.gilts*.7-b.central),Math.max(0,b.deposits*.06-b.reserves));b.reserves+=liquidity;b.central+=liquidity;if(liquidity>0)notice({kind:'liquidity',bank:b.name,amount:liquidity});}
  let support=0;
  if(capitalRatio(b)<5){
   const needed=Math.max(0,(b.mortgages*.35+b.business*.8+b.gilts*.05)*.10-b.equity);
   const bailIn=Math.min(b.wholesale,needed);b.wholesale-=bailIn;b.equity+=bailIn;
   support=needed-bailIn;b.reserves+=support;b.equity+=support;i.publicCost+=support;
   b.status='Resolution and recapitalisation';notice({kind:'resolution',bank:b.name,amount:support,bailIn});
  }else b.status=capitalRatio(b)<buffer?'Restricting new credit':'Operating';
  i.bankLog.push({month:i.month,bank:b.id,created,repaid,losses,support});supply+=created/Math.max(.001,desired);
 }
 i.bankLog=i.bankLog.slice(-360);i.credit=clamp(supply/i.banks.length,0,1.3);
}
