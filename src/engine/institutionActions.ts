import type { Game } from './types';
import {createNational} from './national';
import {ensureInstitutions,rebalanceFactions,createInstitutions,consentRegions} from './institutions';
import {nationalLaws} from '../data/national';
const clamp=(v:number)=>Math.max(0,Math.min(100,v));
export function institutionReason(g:Game,action:string,id?:string){
 const p=g.politics;if(!g.alive)return 'This life has ended.';if(!p)return 'Join UK politics first.';
 if(g.pending||p.pending)return 'Resolve your outstanding choices first.';if(g.actions<1)return 'Your monthly activities are spent.';
 if(!['mp','minister','premier'].includes(p.role))return 'Win a parliamentary seat before taking this institutional action.';
 const institutions=p.national?.institutions??createInstitutions(p.months,p.seats,p.party);
 if(action==='consent'&&!p.national?.proposal)return 'Introduce a bill before requesting legislative consent.';
 if(action==='consent'&&p.national?.proposal?.design?.scope!=='agreement')return 'This proposal does not seek a devolved agreement.';
 if(action==='consent'){const proposal=p.national!.proposal!,law=nationalLaws.find(l=>l.id===proposal.id);if(!law||!consentRegions(law).includes(id??''))return 'This bill does not request consent from that administration.';if(institutions.regions.find(r=>r.id===id)?.consent===proposal.id)return 'This administration has already given consent.';}
 if(action==='whip'&&!['minister','premier'].includes(p.role))return 'The parliamentary leadership sets the government whip in this career.';
 if(['court','hearing'].includes(action)&&!p.national?.proposal)return 'Introduce a proposal to commission scrutiny.';
 if(['faction','promise'].includes(action)&&!institutions.factions.some(f=>f.id===id))return 'Select a parliamentary faction.';
 if(['region','consent'].includes(action)&&!['scotland','wales','ni'].includes(id??''))return 'Select a devolved administration.';
 if(action==='promise'&&institutions.factions.find(f=>f.id===id)?.promise)return 'A commitment is already outstanding to this faction.';
 if(action==='whip'&&!['free','normal','three-line'].includes(id??''))return 'Select a whip level.';
 return ['faction','promise','region','consent','whip','court','hearing','bank'].includes(action)?null:'Unknown action.';
}
export function institutionAction(state:Game,action:string,id?:string):Game{
 if(institutionReason(state,action,id))return state;
 const g=structuredClone(state),p=g.politics!;p.national??=createNational(g.seed,p.months);const n=p.national,i=ensureInstitutions(n,p.seats,p.party);rebalanceFactions(i,p.seats,p.party);g.actions--;
 const random=()=>{n.seed=(Math.imul(n.seed,1664525)+1013904223)>>>0;return n.seed/4294967296;};let text='';
 if(action==='faction'){const f=i.factions.find(x=>x.id===id)!;f.trust=clamp(f.trust+7);f.grievance=clamp(f.grievance-4);if(n.proposal)n.proposal.support=Math.min(35,n.proposal.support+2);text=`You negotiate with ${f.name}. Trust improves; their priorities still shape their votes.`;}
 if(action==='promise'){const f=i.factions.find(x=>x.id===id)!;f.promise=f.priority;f.promiseDue=p.months+12;f.trust=clamp(f.trust+10);text=`You promise ${f.name} an enacted ${f.priority.toLowerCase()} measure within twelve months. They will remember.`;}
 if(action==='whip'){i.whip=id as typeof i.whip;text=`You request a ${id} whip. Stronger pressure can bring votes now and resentment later.`;}
 if(action==='region'){const r=i.regions.find(x=>x.id===id)!;r.trust=clamp(r.trust+8);r.pressure=clamp(r.pressure-3);i.consultation=clamp(i.consultation+4);text=`You meet ${r.name}'s government. It retains control of devolved priorities; you improve the working relationship.`;}
 if(action==='consent'){const r=i.regions.find(x=>x.id===id)!;const chance=Math.max(.1,Math.min(.9,.2+r.trust*.007+i.consultation*.003-r.pressure*.003));if(random()<chance){r.consent=n.proposal!.id;text=`${r.name}: the simulated legislative consent process approves cooperation on this bill.`;}else{r.trust=clamp(r.trust-2);text=`${r.name} withholds consent and asks for further negotiation. This is a political constraint, not a legal veto on Westminster.`;}}
 if(action==='court'){i.judicialRisk=clamp(i.judicialRisk-8);i.evidence=clamp(i.evidence+4);p.integrity=clamp(p.integrity+2);text='Legal advisers examine rights, statutory authority and drafting. Judicial-review risk in implementation is reduced; courts remain independent.';}
 if(action==='hearing'){i.evidence=clamp(i.evidence+10);i.consultation=clamp(i.consultation+5);if(n.proposal)n.proposal.support=Math.min(35,n.proposal.support+4);p.knowledge=clamp(p.knowledge+3);text='A committee hears evidence from affected groups. The record strengthens scrutiny and policy preparation.';}
 if(action==='bank'){p.knowledge=clamp(p.knowledge+4);i.evidence=clamp(i.evidence+4);text='You question regulators about capital, refinancing and arrears. You gain evidence; politicians do not directly order bank lending or Bank Rate.';}
 i.minutes.unshift({month:p.months,text});i.minutes=i.minutes.slice(0,160);p.log.unshift({month:p.months,text});g.journal.unshift({age:g.age,kind:'action',text});return g;
}
