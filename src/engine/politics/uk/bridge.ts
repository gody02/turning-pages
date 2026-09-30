import type {Game} from '../../types';
import {initialiseClock} from '../../core/clock';
import {setReputation,setSkill} from '../../systems/character';
/** Legacy v1 mirrors are read only at this module boundary, never by generic systems. */
export function prepareUK(g:Game){
 const p=g.politics;if(!p)return;
 initialiseClock(g);g.clock!.cadence='month';
 g.finances??={lastIncome:p.lastIncome,lastExpenses:p.lastExpenses,yearIncome:p.yearIncome,yearExpenses:p.yearExpenses};
 for(const r of g.relationships)if(r.id==='political-mentor'||r.id==='political-rival')r.kind='professional';
 if(!g.facts){g.facts=p.memories.map((detail,index)=>({id:`legacy:politics:${index}`,source:'politics.uk',kind:'memory',detail,tags:['legacy'],atMonth:null}));}
 const reputation=g.development?.reputation['politics.uk'],knowledge=g.development?.skills['politics.uk.policy'];
 if(reputation!==undefined)p.reputation=reputation;
 if(knowledge!==undefined)p.knowledge=knowledge;
 syncUKCharacter(g);
}
export function syncUKCharacter(g:Game):Game{const p=g.politics;if(p){setReputation(g,'politics.uk',p.reputation);setSkill(g,'politics.uk.policy',p.knowledge);}return g;}
export function mirrorFinance(g:Game){const p=g.politics,f=g.finances;if(p&&f){p.lastIncome=f.lastIncome;p.lastExpenses=f.lastExpenses;p.yearIncome=f.yearIncome;p.yearExpenses=f.yearExpenses;}}
