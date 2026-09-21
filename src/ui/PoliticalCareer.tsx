import { useState } from 'react';
import type { Game } from '../engine/types';
import { choosePoliticalEvent, electionIn, joinPolitics, joinPoliticsReason, politicalTask, politicalTaskReason, roleRank } from '../engine/politics';
import { bills, billStages, doctrines, parties, politicalEvents, politicalTasks, roleNames, rolePay, type DoctrineId, type PartyId } from '../data/politics';
import { townPolicies } from '../data/town';
import { townTotal, townVoice } from '../engine/town';

const gbp=(value:number)=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(value);
type Props={game:Game;update:(fn:(g:Game)=>Game)=>void;onAdvance:()=>void};
export function PoliticalCareer({game:g,update,onAdvance}:Props){
  const [party,setParty]=useState<PartyId>('labour');
  const [doctrine,setDoctrine]=useState<DoctrineId>('socratic');
  const [view,setView]=useState('Your work');
  const [confirmResign,setConfirmResign]=useState(false);
  const p=g.politics;
  const doTask=(id:string,label:string,detail?:string)=>{
    const reason=politicalTaskReason(g,id);
    return <button className="political-task" disabled={!!reason} title={reason??detail} onClick={()=>update(x=>politicalTask(x,id))}><b>{label}</b><small>{reason??detail??'One monthly activity'}</small><span aria-hidden="true">↗</span></button>;
  };
  if(!p)return <section className="career-entry">
    <div className="eyebrow">A CAREER THAT BECOMES A LIFE</div>
    <h2>UK politics</h2>
    <p>Your first branch meeting. The doors you knock on. A seat you might win—and the people who expect you to do something with it.</p>
    <div className="career-route"><span>Organiser</span><i>→</i><span>Councillor</span><i>→</i><span>MP</span><i>→</i><span>Government</span></div>
    <label className="town-label">Choose your party<select value={party} onChange={e=>setParty(e.target.value as PartyId)}>{parties.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
    <p className="fine">{parties.find(x=>x.id===party)!.description}</p>
    <label className="town-label">Your starting intellectual influence<select value={doctrine} onChange={e=>setDoctrine(e.target.value as DoctrineId)}>{doctrines.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
    <button className="primary" disabled={!!joinPoliticsReason(g)} onClick={()=>update(x=>joinPolitics(x,party,doctrine))}>Enter UK politics <span>→</span></button>
    <p className="fine">{joinPoliticsReason(g)??'Costs one activity. Your life continues month by month: one shared character, one shared save. Early organising is unpaid; you can keep a day job.'}</p>
    <details className="political-details"><summary>How this career fits your life</summary><p>Your personal balance pays living costs and travel. Campaign donations and public programme funds are separate. Every twelve career months brings one birthday and the usual life events. Relationships, health, education and outside work continue.</p><p>Institutions follow a simplified UK framework. Parties have fictional members and game-balanced dynamics; pay, election dates and economic figures are simulation values. Mereford is a fictional English constituency, not a model of every UK nation’s local institutions.</p></details>
  </section>;
  const event=politicalEvents.find(e=>e.id===p.pending);
  const economy=p.economy;
  const latest=economy.history.at(-1);
  const lens=doctrines.find(d=>d.id===p.doctrine)!;
  return <section className="political-career">
    <div className="political-heading"><div><div className="eyebrow">{parties.find(x=>x.id===p.party)!.name} · MEREFORD</div><h2>{roleNames[p.role]}</h2><p>Age {g.age}, {p.months%12} {p.months%12===1?'month':'months'} · {p.months} {p.months===1?'month':'months'} in political life</p></div><span className="political-seal" aria-hidden="true">♜</span></div>
    <div className="career-route">{['activist','councillor','mp','minister','premier'].map((role,i)=><span key={role} className={roleRank(p.role)>=i?'reached':''}>{['Organiser','Councillor','MP','Minister','PM'][i]}</span>)}</div>
    <div className="political-indicators">{([['Public support',p.support],['Reputation',p.reputation],['Integrity',p.integrity],['Organisation',p.organisation],['Policy knowledge',p.knowledge],['Party backing',p.caucus]] as [string,number][]).map(([name,value])=><div key={name}><span>{name}</span><b>{Math.round(value)}</b><meter min={0} max={100} value={value} aria-label={name}/></div>)}</div>
    {event&&g.alive&&<section className="political-dilemma" aria-live="polite"><div className="eyebrow">THE CHOICE IN FRONT OF YOU</div><h3>{event.title}</h3><p>{event.text}</p><div className="choices">{event.choices.map((c,i)=><button key={i} disabled={!!g.pending} onClick={()=>update(x=>choosePoliticalEvent(x,i))}><span>{c.label}<small>{Object.entries(c.effects).map(([k,v])=>`${v>0?'+':''}${v} ${k}`).join(' · ')}</small></span><b>→</b></button>)}</div>{g.pending&&<p className="fine">Resolve your birthday life event above before this political choice.</p>}</section>}
    <nav className="political-tabs" aria-label="Political career areas">{['Your work','Constituency','Elections','Parliament','Ideas','Record'].map(tab=><button key={tab} aria-current={view===tab?'page':undefined} onClick={()=>setView(tab)}>{tab}</button>)}</nav>
    <div className="political-content">
    {view==='Your work'&&<>
      <div className="political-budget"><div><small>YOUR PERSONAL MONEY</small><strong>{gbp(g.money)}</strong><span>Last month: +{gbp(p.lastIncome)} / −{gbp(p.lastExpenses)}</span></div><div><small>CAMPAIGN FUND</small><strong>{gbp(p.campaignFunds)}</strong><span>Donations belong to the campaign</span></div></div>
      <div className="section-label"><h3>Where will your time go?</h3><span>{g.actions} ACTIVITIES LEFT</span></div>
      <p className="muted">Political work and everyday life share the same monthly activities. You can leave time unused and move on.</p>
      <div className="political-task-grid">{politicalTasks.map(t=><div key={t.id}>{doTask(t.id,t.name,t.description)}</div>)}</div>
      <div className="political-network"><h3>The people around you</h3><p>Union confidence <b>{Math.round(p.unions)}/100</b> · Enterprise confidence <b>{Math.round(p.enterprise)}/100</b></p>{g.relationships.filter(r=>r.id.startsWith('political-')).map(r=><p key={r.id}><b>{r.name}</b> · {r.role} · bond {Math.round(r.bond)}/100</p>)}<p className="fine">You can also spend time with them in People. Bonds influence your relationship, while choices and organising shape party support.</p></div>
      <p className="fine">Office income: {gbp(rolePay[p.role])}/year in fictional take-home pay or allowances. Organisers and councillors can keep an outside job; entering Parliament ends that job.</p>
    </>}
    {view==='Constituency'&&<>
      <h3>Your constituents live with the consequences.</h3><p className="muted">800 modelled households sit inside a larger fictional constituency. Their wages, rents, bills and savings affect hardship, public support and the choices you face.</p>
      <div className="political-budget"><div><small>PUBLIC PROGRAMME FUND</small><strong>{gbp(economy.fund)}</strong><span>Not your money or campaign money</span></div><div><small>LOCAL JOBS</small><strong>{economy.employers.reduce((s,f)=>s+f.jobs,0)} / 480</strong><span>Energy index: {Math.round(economy.energy*100)}</span></div></div>
      <div className="household-grid">{economy.households.map(h=><article className="household-card" key={h.id}><h3>{h.person}</h3><small>{h.name} · {h.count} households</small><blockquote>{townVoice(economy,h)}</blockquote><dl><div><dt>Cash per household</dt><dd>{gbp(h.cash/h.count)}</dd></div><div><dt>Unmet essentials</dt><dd>{gbp(h.unmet/h.count)}</dd></div><div><dt>Wellbeing</dt><dd>{Math.round(h.wellbeing)}/100</dd></div></dl></article>)}</div>
      <h3 className="political-subheading">Sponsor a programme motion</h3><p className="muted">As an elected representative, seek the programme board’s approval. Public support, credibility, party backing and available funds affect its vote. An MP sponsors or advocates; they do not unilaterally control a council budget.</p>
      <div className="political-task-grid">{townPolicies.filter(x=>x.id!=='hold').map(policy=><div key={policy.id}>{doTask(`motion:${policy.id}`,policy.name,`${gbp(policy.cost)} public cost · ${policy.description}`)}</div>)}</div>
      {p.motion&&<p className="political-notice">Your {p.motion} motion is scheduled for month end.</p>}
      {latest&&<details className="political-details" open><summary>What changed last month?</summary><ul>{latest.notes.map((n,i)=><li key={i}>{n}</li>)}</ul></details>}
      <details className="political-details"><summary>Employers, accounts and model assumptions</summary>{economy.employers.map(f=><p key={f.id}><b>{f.name}</b>: {f.jobs}/{f.capacity} jobs · {gbp(f.cash)} reserves · {gbp(f.profit)} operating cash change last month.</p>)}<p>{Math.abs(townTotal(economy)-economy.initialTotal)<.05?'All constituency accounts reconcile.':'Account reconciliation failed.'} Every payment has a counterparty, including the wider economy. Your own and campaign accounts are separate abstractions outside these 800 households.</p><p>The first economy models cash, employment and costs; it does not yet model the full UK banking, production or monetary system. Fictional external shocks cycle every two years while savings, employment and investments persist.</p><div className="transaction-list">{economy.ledger.filter(x=>x.month===economy.month).map((x,i)=><div key={i}><span><b>{x.reason}</b><small>{x.from} → {x.to}</small></span><strong>{gbp(x.amount)}</strong></div>)}</div></details>
    </>}
    {view==='Elections'&&<>
      <h3>A nomination is not a seat.</h3><div className="political-budget"><div><small>NEXT COUNCIL ELECTION</small><strong>{electionIn(p,'council')} months</strong></div><div><small>NEXT GENERAL ELECTION</small><strong>{electionIn(p,'parliament')} months</strong></div></div>
      <p className="muted">Your first local contest falls six months after joining; the first general election is at month 24. Subsequent cycles are four and five years. These are game dates, not the real UK electoral calendar.</p>
      {p.candidacy&&<p className="political-notice">You are the selected {p.candidacy} candidate. Build support before polling day.</p>}
      {doTask('nominateCouncil','Seek council selection','Local members consider your record and organising work.')}
      {doTask('nominateParliament','Seek parliamentary selection','£500 campaign expense · contest Mereford at the next general election.')}
      <p className="muted">Reputation, organisation, public support, campaigning funds and a seeded electoral swing determine votes. The largest vote total wins the fictional single-member seat. Losing continues your life.</p>
      {p.elections.map((e,i)=><article className="election-result" key={`${e.month}-${i}`}><div className="eyebrow">MONTH {e.month} · {e.kind.toUpperCase()}</div><h3>{e.won?'Elected':'Defeated'}</h3>{e.votes.map((votes,j)=><div key={j}><span>{j===0?'You':`Rival ${j}`}</span><meter min={0} max={20000} value={votes}/><b>{votes.toLocaleString()}</b></div>)}<p className="fine">{e.kind==='parliament'?`Your party won ${e.seats}/650 national seats.`:'20,000 votes cast in this fictional ward.'}</p></article>)}
    </>}
    {view==='Parliament'&&<>
      <h3>{p.inGovernment?'Your party has a governing majority.':'Power requires support.'}</h3><p className="muted">{p.seats?`${p.seats} of 650 seats. `:''}Your seat and your party’s national result are separate. Cabinet appointments need a governing majority and a strong record.</p>
      {doTask('seekOffice','Seek a ministerial appointment','Ask the leadership to consider you for housing and communities.')}
      {doTask('leadership','Seek the party leadership','A governing parliamentary majority and party support are needed to become Prime Minister.')}
      <h3 className="political-subheading">Legislation with lasting effects</h3>
      <p className="muted">Bills need scrutiny and political support. Their effects begin only after passage—not when you announce them. This is a compressed representation of the UK legislative process.</p>
      {p.bill?<div className="bill-card"><h3>{bills.find(b=>b.id===p.bill!.id)!.name}</h3><ol>{billStages.map((stage,i)=><li key={stage} className={i<=p.bill!.stage?'reached':''}>{stage}</li>)}</ol>{doTask('advanceBill','Work on the next legislative stage','Policy knowledge, integrity and party support affect passage. At most one stage per month.')}</div>:bills.map(b=><div key={b.id}>{doTask(`bill:${b.id}`,b.name,b.description)}</div>)}
      {p.laws.length>0&&<div className="passed-laws"><h3>Laws in your timeline</h3>{p.laws.map(id=><p key={id}>✓ {bills.find(b=>b.id===id)!.name}</p>)}</div>}
      <a className="political-source" href="https://www.parliament.uk/about/how/laws/" target="_blank" rel="noreferrer">How UK legislation works ↗</a>
    </>}
    {view==='Ideas'&&<>
      <h3>Ideas are commitments you have to live with.</h3><label className="town-label">Your intellectual influence<select value={p.doctrine} onChange={e=>update(x=>({...x,politics:{...x.politics!,doctrine:e.target.value as DoctrineId}}))}>{doctrines.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
      <div className="philosophy-card"><div className="eyebrow">{lens.name}</div><h2>{lens.question}</h2><p>Your monthly dilemmas put principles into conflict with ambition, family, funding and delivery. Reading helps you construct policy; simply choosing a thinker does not make a policy succeed.</p><a href={lens.source} target="_blank" rel="noreferrer">Read the source ↗</a></div>
      <h3 className="political-subheading">Your words leave a record</h3>{p.memories.length?p.memories.slice(0,20).map((m,i)=><p className="promise" key={i}>{m}</p>):<p className="muted">The promises and choices in your political dilemmas will appear here.</p>}
      <details className="political-details"><summary>Dialectics, transitions and the scope of this career</summary><p>Economic pressure can change political support; political choices can change resources, institutions and later choices. Profit-sharing can help households while reducing employer reserves. A levy can fund services while changing owners’ resources.</p><p>Marx, Smith, Socrates, Lenin and Trotsky appear in substantive dilemmas and questions. Full NEP-style ownership transitions, international revolutionary systems and comprehensive philosophical dialogue are not implemented yet. They require deeper production and institutional models rather than an ideology bonus.</p></details>
    </>}
    {view==='Record'&&<>
      <h3>The career you are actually living</h3>{p.log.slice(0,80).map((entry,i)=><article className="political-record" key={i}><span>MONTH {entry.month}</span><p>{entry.text}</p></article>)}
      {roleRank(p.role)>0&&!confirmResign&&<button className="quiet outlined" onClick={()=>setConfirmResign(true)}>Consider resigning office</button>}
      {confirmResign&&<div className="political-notice"><p>Resign your seat and office? You will return to organising, lose your bill and motion, and stop receiving office pay. Your life and record continue.</p>{doTask('resign','Resign my office')}<button className="quiet" onClick={()=>setConfirmResign(false)}>Stay in office</button></div>}
    </>}
    </div>
    <div className="political-month"><div><small>ONE LIFE. ONE CLOCK.</small><p>{g.pending?'Your birthday brought a life event. Resolve it first.':p.pending?'Make the political choice above before moving on.':`${g.actions} activities remain. Next month brings new pressures and choices.`}</p></div><button className="primary" disabled={!g.alive||!!g.pending||!!p.pending} onClick={onAdvance}>Live the next month <span>→</span></button></div>
  </section>;
}
