import type { Institutions } from './institutions';
import {bankAssets,bankLiabilities,createInstitutions} from './institutions';
import {nationalLaws} from '../../../data/national';
const rec=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const num=(x:unknown,min=0,max=1e12):x is number=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
const int=(x:unknown,min=0,max=2400)=>num(x,min,max)&&Number.isInteger(x);
const str=(x:unknown)=>typeof x==='string'&&x.length<3000;
export function validInstitutions(v:unknown,month:number):v is Institutions{
 if(!rec(v)||v.version!==1||v.month!==month||!int(v.introduced,0,month)||!int(v.seatBasis,0,650)||!['labour','conservative','liberal','green','assembly'].includes(v.party as string)||!['free','normal','three-line'].includes(v.whip as string))return false;
 if(!num(v.credit,0,1.3)||!num(v.cashOutside)||!num(v.publicCost)||!['evidence','consultation','judicialRisk'].every(k=>num(v[k],0,100)))return false;
 const base=createInstitutions(0);
 if(!Array.isArray(v.banks)||v.banks.length!==3||!v.banks.every((b,index)=>rec(b)&&b.id===base.banks[index].id&&str(b.name)&&str(b.status)&&['mortgages','business','reserves','gilts','deposits','wholesale','central','equity','newCredit','losses'].every(k=>num(b[k]))&&num(b.mortgageRate,0,50)&&num(b.loanRate,0,50)&&num(b.arrears,0,20)))return false;
 const banks=v.banks;
 for(const b of banks)if(Math.abs(bankAssets(b)-bankLiabilities(b))>.001)return false;
 if(!Array.isArray(v.regions)||v.regions.length!==3||!v.regions.every((r,index)=>rec(r)&&r.id===base.regions[index].id&&r.baseGrant===base.regions[index].baseGrant&&r.populationRatio===base.regions[index].populationRatio&&str(r.name)&&num(r.grant)&&num(r.ownRevenue)&&['trust','autonomy','health','skills','pressure'].every(k=>num(r[k],0,100))&&num(r.healthShare,.38,.58)&&num(r.educationShare,.18,.30)&&(r.consent===null||str(r.consent))))return false;
 if(!Array.isArray(v.factions)||v.factions.length!==10||!v.factions.every(f=>rec(f)&&base.factions.some(b=>b.id===f.id&&b.side===f.side&&b.priority===f.priority)&&str(f.name)&&int(f.seats,0,650)&&['trust','discipline','grievance'].every(k=>num(f[k],0,100))&&(f.promise===null||f.promise===f.priority)&&int(f.promiseDue)&&int(f.lastAyes,0,f.seats as number)&&int(f.lastNoes,0,f.seats as number)&&(f.lastAyes as number)+(f.lastNoes as number)<=(f.seats as number))||new Set(v.factions.map(f=>f.id)).size!==10)return false;
 if(v.regions.some(r=>r.consent!==null&&!nationalLaws.some(l=>l.id===r.consent)))return false;
 if(v.factions.reduce((a,f)=>a+f.seats,0)!==650||v.factions.filter(f=>f.side==='own').reduce((a,f)=>a+f.seats,0)!==v.seatBasis)return false;
 if(!Array.isArray(v.bankLog)||v.bankLog.length>360||!v.bankLog.every(l=>rec(l)&&int(l.month,v.introduced as number,month)&&banks.some(b=>b.id===l.bank)&&['created','repaid','losses','support'].every(k=>num(l[k]))))return false;
 return Array.isArray(v.minutes)&&v.minutes.length<=160&&v.minutes.every(m=>rec(m)&&int(m.month,v.introduced as number,month)&&str(m.text));
}
