import { useEffect,useRef,useState } from 'react';
import {act,actionReason,choose,advanceTime,isMonthly,monthOfLife,currentFinance,advanceReason} from '../engine/simulation';
import {averageStats,statKeys} from '../engine/systems/character';
import {countryOf} from '../engine/systems/geography';
import {jobOf,salary} from '../engine/systems/careers';
import { TOWN_SAVE_KEY } from '../engine/townSave';
import type {Action,CurrentAuthoritativeGame,Effects,Game} from '../engine/types';
import {upgradeGameToCurrent} from '../engine/save';
import { jobs } from '../data/world';
import { events } from '../data/events';
import { roleNames } from '../data/politics';
import { PoliticalCareer } from './PoliticalCareer';
import {MAX_PERSON_NAME_CODE_POINTS,personDisplayNameCodePointCount,validPersonDisplayName} from '../engine/shared/personDisplayName';
import {createProductionUkNewGame,NewGameInputError,newGameGenderError} from './newGame';
import {GamePersistence,MAX_IMPORT_BYTES,exportCanonicalGame,importCanonicalGame,type RecoveryChoice,type StaleLegacyChoice} from '../persistence/service';
import {SaveCoordinator,type SaveCoordinatorSnapshot} from '../persistence/saveCoordinator';
import {requestPersistentStorage,storagePersistenceState,type StoragePersistenceState} from '../persistence/capabilities';
import {acceptApplicationGame,lifecycleContent,applicationResolversReady} from './gameContent';
import {createNewGameSubmission,type NewGamePhase} from './newGameSubmission';
import {disposeUkCountryStartStartup} from '../data/countryStart/uk/countryStartResidence';

const icons={health:'♡',happiness:'☀',smarts:'✧',looks:'◇'};
const labels={health:'Health',happiness:'Happiness',smarts:'Smarts',looks:'Looks'};
const educationLabels={preschool:'Early childhood',school:'School student',secondary:'Secondary graduate',university:'University student',degree:'University graduate'};
type Tab='Journal'|'People'|'Education'|'Career'|'Finances';
function money(g:Game,n:number){return new Intl.NumberFormat('en-GB',{style:'currency',currency:countryOf(g).currency,maximumFractionDigits:0}).format(n);}
function changes(e:Effects){return Object.entries(e).map(([k,v])=>`${v>0?'+':''}${v} ${k==='bond'?'family bonds':k}`).join(' · ');}
function download(name:string,text:string){const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}

export function LifeApp(){
  const [startup,setStartup]=useState<'loading'|'ready'|'unavailable'|'content-failed'>('loading');
  const [unresolvedGame,setUnresolvedGame]=useState<Game|null>(null);
  const [game,setGame]=useState<Game|null>(null);
  const [creating,setCreating]=useState(false);
  const [newGamePhase,setNewGamePhase]=useState<NewGamePhase>('idle');
  const submission=useRef<ReturnType<typeof createNewGameSubmission<CurrentAuthoritativeGame>>|null>(null);
  if(!submission.current)submission.current=createNewGameSubmission<CurrentAuthoritativeGame>({phase:setNewGamePhase,cancelConstruction:disposeUkCountryStartStartup});
  const starting=newGamePhase!=='idle';
  const [tab,setTab]=useState<Tab>(()=>location.hash==='#town'||location.hash==='#career'?'Career':'Journal');
  const [notice,setNotice]=useState('');
  const [saved,setSaved]=useState(false);
  const [recoveries,setRecoveries]=useState<readonly RecoveryChoice[]>([]);
  const [staleLegacy,setStaleLegacy]=useState<StaleLegacyChoice|null>(null);
  const [storagePersistence,setStoragePersistence]=useState<StoragePersistenceState>('unavailable');
  const [name,setName]=useState('');
  const [gender,setGender]=useState('');
  const [start,setStart]=useState<'childhood'|'adult'>('childhood');
  const [pendingRestore,setPendingRestore]=useState<Game|null>(null);
  const replacementGeneration=useRef(0);
  const replacementCommit=useRef(false);
  const restoreInput=useRef<HTMLInputElement>(null);
  const storyRef=useRef<HTMLElement>(null);
  const persistenceRef=useRef<GamePersistence|null>(null);
  const coordinatorRef=useRef<SaveCoordinator|null>(null);
  const skipAutosave=useRef<Game|null>(null);
  const referenceLifetime=useRef<AbortController|null>(null);
  const startupNotice=useRef('');
  useEffect(()=>{let cancelled=false,opened:GamePersistence|null=null;const contentRequest=new AbortController();
    referenceLifetime.current=contentRequest;
    void (async()=>{try{
      opened=await GamePersistence.open(localStorage);const initial=await opened.initialize();if(cancelled){opened.close();return;}persistenceRef.current=opened;
      setRecoveries(initial.recoveries);setStaleLegacy(initial.staleLegacy);startupNotice.current=initial.error??initial.markerWarning??'';
      const updateSaveState=(state:SaveCoordinatorSnapshot)=>{setSaved(state.state==='saved'&&!state.dirty);if(state.state==='failed')setNotice('Saving failed. Your current progress is still open; retry or export a backup before closing.');};
      coordinatorRef.current=new SaveCoordinator((value,revision)=>opened!.save(value,revision),initial.revision,updateSaveState);
      let accepted=initial.game;try{if(accepted)await acceptApplicationGame(accepted,undefined,{signal:contentRequest.signal});}catch{if(cancelled)return;setUnresolvedGame(initial.game);setStartup('content-failed');setNotice('Reference content could not be loaded. Your saved life has not changed. Retry or export a backup.');return;}
      if(cancelled)return;
      setGame(accepted);skipAutosave.current=accepted;setCreating(!accepted);setSaved(!!accepted);setStartup(initial.status==='backend-unavailable'?'unavailable':'ready');
      if(initial.error)setNotice(initial.error);else if(initial.markerWarning)setNotice(initial.markerWarning);setStoragePersistence(await storagePersistenceState());
    }catch(error){if(cancelled)return;setStartup('unavailable');setCreating(true);setNotice(error instanceof Error?error.message:'Browser persistence is unavailable.');}})();
    return()=>{cancelled=true;submission.current?.abandon();contentRequest.abort();opened?.close();};
  },[]);
  useEffect(()=>{const leave=()=>submission.current?.cancel(),close=()=>{submission.current?.abandon();setNewGamePhase('idle');};addEventListener('hashchange',leave);addEventListener('pagehide',close);return()=>{removeEventListener('hashchange',leave);removeEventListener('pagehide',close);};},[]);
  useEffect(()=>{if(startup!=='ready'||!game)return;if(skipAutosave.current===game){skipAutosave.current=null;return;}coordinatorRef.current?.request(game);},[game,startup]);
  useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(coordinatorRef.current?.hasUnsavedChanges){event.preventDefault();event.returnValue='';}};addEventListener('beforeunload',warn);return()=>removeEventListener('beforeunload',warn);},[]);
  const update=(fn:(g:Game)=>Game)=>{if(game&&!applicationResolversReady(game)){setNotice('Reference content is not ready. Your life has not changed.');return;}setGame(g=>g?fn(g):g);};
  const scrollStory=()=>requestAnimationFrame(()=>storyRef.current?.scrollIntoView({behavior:'smooth',block:'start'}));
  const advance=()=>{update(g=>advanceTime(g,lifecycleContent(g)));setTab(game?.politics?'Career':'Journal');scrollStory();};
  const actionButton=(action:Action,title:string,detail:string)=>{
    if(!game)return null;const reason=actionReason(game,action);
    return <button className="activity" disabled={!!reason} title={reason??detail} onClick={()=>update(g=>act(g,action,lifecycleContent(g)))}><span>{title}</span><small>{reason??detail}</small><b aria-hidden="true">↗</b></button>;
  };
  async function restore(file:File|undefined){
    if(!file||submission.current?.busy())return;
    const signal=referenceLifetime.current?.signal,generation=replacementGeneration.current;let canonical=false;
    try{if(file.size>MAX_IMPORT_BYTES)throw Error();const candidate=importCanonicalGame(await file.text());canonical=true;const next=await acceptApplicationGame(candidate,undefined,{signal});if(!signal?.aborted&&generation===replacementGeneration.current)setPendingRestore(next);}
    catch{if(!signal?.aborted)setNotice(canonical?'Reference content for this backup could not be loaded. Your current life has not changed. Try importing it again.':'This is not a valid Turning Pages life backup. Your saved life has not changed. Town-only archives cannot be imported as a character.');}
    finally{if(restoreInput.current)restoreInput.current.value='';}
  }
  function exportBackup(value:Game){try{download('turning-pages-life-backup.json',exportCanonicalGame(value));}catch{setNotice('This life could not be exported because it failed the save consistency check.');}}
  function exportLegacy(){try{const raw=localStorage.getItem(TOWN_SAVE_KEY);if(raw){download('turning-pages-legacy-town-archive.json',raw);setNotice('The earlier town experiment was exported. It remains stored separately and has not been assigned to your character.');}else setNotice('No earlier town experiment is saved in this browser.');}catch{setNotice('The archive could not be read.');}}
  async function recoverSnapshot(snapshot:RecoveryChoice){if(submission.current?.busy())return;const signal=referenceLifetime.current?.signal;try{await acceptApplicationGame(snapshot.game,undefined,{signal});if(!signal?.aborted&&!submission.current?.busy())setPendingRestore(snapshot.game);}catch{if(!signal?.aborted)setNotice('This recovery references unavailable or incompatible reference content. Your saved life has not changed.');}}
  const recoveryControls=(recoveries.length>0||staleLegacy?.game)&&<div className="life-backup-controls">{recoveries.map(snapshot=><button className="quiet outlined" key={snapshot.slotId} onClick={()=>recoverSnapshot(snapshot)}>{snapshot.label}</button>)}{staleLegacy?.game&&<button className="quiet outlined" onClick={()=>setPendingRestore(staleLegacy.game)}>Review earlier browser save · may be stale</button>}</div>;
  const current=game?events.find(e=>e.id===game.pending):undefined;
  const political=game?.politics;
  const monthly=!!game&&isMonthly(game);
  const timeBlocked=!game||!!advanceReason(game);
  const normalizedName=name.trim(),nameCodePoints=personDisplayNameCodePointCount(normalizedName),nameError=normalizedName&&!validPersonDisplayName(normalizedName)?nameCodePoints>MAX_PERSON_NAME_CODE_POINTS?`Name must be ${MAX_PERSON_NAME_CODE_POINTS} Unicode code points or fewer.`:'Enter a valid name, or leave it blank to generate one.':null,genderError=newGameGenderError(gender);
  async function commitReplacement(next:Game){const coordinator=coordinatorRef.current,persistence=persistenceRef.current;if(!coordinator||!persistence)throw Error('Browser persistence is unavailable.');if(coordinator.snapshot.state==='failed'){coordinator.request(next);await coordinator.retry();}else await coordinator.persist(next);return persistence.recoveries().catch(error=>{console.error('Recovery inventory refresh failed after successful save.',error);return recoveries;});}
  function activateReplacement(next:Game,message:string,snapshots:readonly RecoveryChoice[]){skipAutosave.current=next;setGame(next);setRecoveries(snapshots);setPendingRestore(null);setCreating(false);setNotice(message);const lifetime=referenceLifetime.current;void requestPersistentStorage().then(value=>{if(lifetime&&!lifetime.signal.aborted&&referenceLifetime.current===lifetime)setStoragePersistence(value);});}
  async function persistReplacement(next:Game,message:string){if(submission.current?.busy()||replacementCommit.current)return;const signal=referenceLifetime.current?.signal,generation=replacementGeneration.current;await acceptApplicationGame(next,undefined,{signal});if(signal?.aborted||submission.current?.busy()||replacementCommit.current||generation!==replacementGeneration.current)return;replacementCommit.current=true;try{const snapshots=await commitReplacement(next);if(!signal?.aborted)activateReplacement(next,message,snapshots);}finally{replacementCommit.current=false;}}
  async function beginNewGame(){if(submission.current?.busy()||replacementCommit.current||startup!=='ready')return;replacementGeneration.current++;const mode=start;let snapshots:readonly RecoveryChoice[]=[];try{await submission.current!.run(async signal=>{const candidate=await createProductionUkNewGame({mode,name,genderLabel:gender},undefined,{signal});const current=upgradeGameToCurrent(candidate);if(!current)throw Error('The new life failed its current-root upgrade.');return current;},(next,signal)=>acceptApplicationGame(next,undefined,{signal}),async next=>{snapshots=await commitReplacement(next);},next=>{activateReplacement(next,'',snapshots);setTab(mode==='adult'?'Career':'Journal');});}catch(error){if(!(error instanceof NewGameInputError))console.error('UK country-start failed.',error);setNotice(error instanceof NewGameInputError?error.message:'Your new UK life could not be created or saved. Your current life is unchanged. Please try again.');}}
  async function retryReferenceContent(){if(!unresolvedGame)return;const signal=referenceLifetime.current?.signal;setStartup('loading');try{await acceptApplicationGame(unresolvedGame,undefined,{signal});if(signal?.aborted)return;skipAutosave.current=unresolvedGame;setGame(unresolvedGame);setUnresolvedGame(null);setCreating(false);setStartup('ready');setNotice(startupNotice.current);setSaved(true);}catch{if(signal?.aborted)return;setStartup('content-failed');setNotice('Reference content is still unavailable. Your saved life has not changed.');}}

  if(startup==='loading')return <div className="app-shell"><header className="topbar"><a className="brand" href="#life"><span className="brand-mark">t<span>p</span></span><span>turning pages<small>A LIFE IN THE MAKING</small></span></a></header><main className="creation"><section className="creation-card" aria-live="polite"><div className="eyebrow">OPENING YOUR STORY</div><h2>Loading your saved life…</h2></section></main></div>;

  if(startup==='content-failed'&&unresolvedGame)return <div className="app-shell"><main className="creation"><section className="creation-card" role="status"><h2>Your saved life is safe.</h2><p>{notice}</p><button onClick={()=>void retryReferenceContent()}>Retry loading</button><button onClick={()=>exportBackup(unresolvedGame)}>Export saved life</button></section></main></div>;

  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#life"><span className="brand-mark">t<span>p</span></span><span>turning pages<small>A LIFE IN THE MAKING</small></span></a><div className="header-actions"><span className="save-state">{saved?`● Saved on this device${storagePersistence==='persistent'?' · protected':''}`:startup==='unavailable'?'○ Persistence unavailable':'○ Saving…'}</span>{game&&<button className="quiet" disabled={starting} onClick={()=>setCreating(true)}>New life ↗</button>}</div></header>
    {notice&&<div className="notice" role="status">{notice}<button className="quiet" onClick={()=>setNotice('')}>Dismiss</button></div>}
    <input ref={restoreInput} type="file" accept="application/json,.json" hidden onChange={e=>void restore(e.target.files?.[0])}/>
    {pendingRestore&&<section className="town-confirm" role="alert"><p>Restore {pendingRestore.name}, age {pendingRestore.age}? This replaces your current life. Export a backup first if you want to keep it.</p>{game&&<button onClick={()=>exportBackup(game)}>Export current life</button>}<button onClick={()=>void persistReplacement(pendingRestore,'Life restored, including any political career.').then(()=>setTab('Career')).catch(()=>setNotice('The restored life could not be saved. Your current life and recovery records were kept.'))}>Restore this life</button><button onClick={()=>setPendingRestore(null)}>Cancel</button></section>}
    {creating?<main className="creation">
      <section className="intro"><div className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</div><h1>A little chance.<br/>A lot of choices.<br/><em>A life of your own.</em></h1><p>From the people at your kitchen table to the decisions that shape a country. Your ambitions belong to the same life.</p><div className="book-art" aria-hidden="true"><div className="book-line"/><span>Every life<br/>has a story.</span><i>✧</i></div><p className="intro-note">One life. Every choice leaves a trace.</p></section>
      <form className="creation-card" aria-busy={starting} onSubmit={e=>{e.preventDefault();void beginNewGame();}}>
        <div className="eyebrow">THE FIRST PAGE</div><h2>Meet your new self.</h2><p>Choose a beginning. Discover the rest.</p>
        <label>Your name · optional<input value={name} aria-invalid={!!nameError} aria-describedby="person-name-help" placeholder="Leave blank to generate a name" onChange={e=>setName(e.target.value)}/><small id="person-name-help">{nameError||(name.trim()?`${nameCodePoints} of ${MAX_PERSON_NAME_CODE_POINTS} Unicode code points`:'A UK name will be generated for this life.')}</small></label>
        <label>Gender label · optional<input value={gender} aria-invalid={!!genderError} aria-describedby="person-gender-help" placeholder="Generated default: Unspecified" onChange={e=>setGender(e.target.value)}/><small id="person-gender-help">{genderError||'Identity-facing description only; it does not affect demographics or gameplay.'}</small></label>
        <label>Country<select value="uk" disabled><option value="uk">United Kingdom</option><option value="ca">Canada · not yet available</option><option value="nz">New Zealand · not yet available</option></select><small>Production new-game starts are currently available for the United Kingdom.</small></label>
        <label>Where your story begins<select value={start} onChange={e=>setStart(e.target.value as 'childhood'|'adult')}><option value="childhood">Childhood</option><option value="adult">Adult</option></select></label>
        <div className="starting"><span>YOUR STARTING POINT</span><p>{start==='adult'?'Age 18 · Secondary education · 3,000 starting money':'Age 0 · Health 90 · Happiness 80'}<br/>Smarts & looks vary · A family by your side</p></div>
        <button className="primary" type="submit" disabled={starting||startup!=='ready'}>{starting?'Creating your world…':'Begin my story'} <span>→</span></button>
        {starting&&<><p role="status">{newGamePhase==='committing'?'Saving your complete world…':'Creating your world… You can keep using this page while it prepares.'}</p><button type="button" className="quiet" disabled={newGamePhase==='committing'} onClick={()=>submission.current?.cancel()}>Cancel creation</button></>}
        {game&&<><p className="fine">Beginning a new story replaces this device’s current life, including its career.</p><button type="button" className="quiet" onClick={()=>exportBackup(game)}>Export current life first</button><button type="button" className="quiet" disabled={newGamePhase==='committing'} onClick={()=>{submission.current?.cancel();setCreating(false);}}>Return to current life</button></>}
        <button type="button" className="quiet" disabled={starting} onClick={()=>restoreInput.current?.click()}>Restore a life backup</button>
        {recoveryControls}
        <p className="fine">To begin politics immediately, choose United Kingdom and adult life, then enter the career. Fictional economic and salary values.</p>
      </form>
    </main>:game&&<>
      <main className={`dashboard ${tab==='Career'?'career-open':''}`}>
        <aside className="profile">
          <div className="eyebrow">THE PERSON YOU’RE BECOMING</div><div className="avatar">{game.name.split(/\s+/).map(n=>n[0]).slice(0,2).join('')}<span>✧</span></div><h1>{game.name}</h1><p className="muted">{game.gender} · {countryOf(game).name}</p>
          <div className="age-line"><strong>{game.age}</strong><span>YEARS{monthly&&<><br/>+ {monthOfLife(game)} {monthOfLife(game)===1?'MONTH':'MONTHS'}</>}</span><span className="phase">{!game.alive?'Remembered':political?'Political life':game.age<18?'Growing':'Becoming'}</span></div>
          <div className="stat-list">{statKeys.map(k=><div className={`stat ${k}`} key={k}><div><span><i>{icons[k]}</i> {labels[k]}</span><b>{Math.round(game.stats[k])}<small>/100</small></b></div><meter min={0} max={100} value={game.stats[k]} aria-label={labels[k]}/></div>)}</div>
          <div className="balance"><small>YOUR BALANCE</small><strong className={game.money<0?'negative':''}>{money(game,game.money)}</strong><span>{political?roleNames[political.role]:game.retired?'Retired':jobOf(game)?.name??educationLabels[game.education]}</span></div>
          {political&&<p className="fine">Campaign funds and public budgets are separate from your personal balance.</p>}
          <blockquote>“A life is made in the living.”<span>MAKE THE NEXT PAGE YOURS</span></blockquote>
        </aside>
        <section className="story" ref={storyRef}>
          <div className="chapter-heading"><div><div className="eyebrow">CHAPTER {String(Math.floor(game.age/10)+1).padStart(2,'0')}</div><h2>{game.alive?'Your unfolding story.':'A life, remembered.'}</h2></div><span className="year-stamp">AGE {game.age}</span></div>
          {!game.alive?<section className="end-card"><div className="eyebrow">THE FINAL PAGE</div><h2>{game.name}, {game.age} years.</h2><p>{game.cause}</p><div className="summary-grid"><div><strong>{money(game,game.earned)}</strong><small>Lifetime income</small></div><div><strong>{money(game,game.money)}</strong><small>Final balance</small></div><div><strong>{averageStats(game)} / 100</strong><small>Final wellbeing</small></div><div><strong>{educationLabels[game.education]}</strong><small>Education</small></div></div>{political&&<p>{political.months} months in politics · {political.elections.filter(e=>e.won).length} elections won · {political.laws.length} laws passed</p>}<button className="primary" onClick={()=>setCreating(true)}>Begin another story →</button></section>:current?<section className="event-card" aria-live="polite"><div className="event-label"><span>✧ THIS YEAR’S CROSSROADS</span><span>AGE {game.age}</span></div><h3>{current.title}</h3><p>{current.text}</p><div className="choices">{current.choices.map((c,i)=>{const affordable=(c.effects.money??0)>=-Math.max(game.money,0);return <button key={i} disabled={!affordable} onClick={()=>update(g=>choose(g,i,lifecycleContent(g)))}><span>{c.text}<small>{affordable?changes(c.effects):'Not enough money'}</small></span><b>→</b></button>;})}</div></section>:tab!=='Career'&&<section className="quiet-card"><span className="spark">✧</span><div><div className="eyebrow">ROOM TO GROW</div><h3>{game.age===0?'The whole world is ahead.':'The little things make a life.'}</h3><p>You have {game.actions} activities left this {monthly?'month':'year'}. Make time for what matters.</p></div></section>}
          {political?.pending&&tab!=='Career'&&game.alive&&<button className="career-alert" onClick={()=>setTab('Career')}>Your political career has a decision waiting. Open Career →</button>}
          <nav className="tabs" aria-label="Life areas">{(['Journal','People','Education','Career','Finances'] as Tab[]).map(t=><button key={t} aria-current={tab===t?'page':undefined} onClick={()=>setTab(t)}>{t}{t==='Career'&&political?.pending?' ·':''}</button>)}</nav>
          <div className="tab-content">
            {tab==='Journal'&&<><div className="section-label"><h3>Notes from a life</h3><span>LATEST FIRST</span></div><div className="timeline">{game.journal.slice(0,50).map((entry,i)=><article key={`${game.journal.length-i}`}><div className="timeline-age">{entry.age}<small>YEARS</small></div><div><span className={`entry-kind ${entry.kind}`}>{entry.kind}</span><p>{entry.text}</p></div></article>)}</div>{game.journal.length>50&&<p className="fine">Showing the latest 50 entries. Your complete history is saved.</p>}</>}
            {tab==='People'&&<><h3>The people in your story</h3><p className="muted">The work you choose and the time you protect affect these relationships.</p>{game.relationships.map(r=><div className="person" key={r.id}><span className="mini-avatar">{r.name[0]}</span><div><strong>{r.name}</strong><small>{r.role} · Bond {Math.round(r.bond)}/100</small></div>{actionButton(`connect:${r.id}`,'Spend time','+12 bond · +4 happiness')}</div>)}</>}
            {tab==='Education'&&<><h3>{educationLabels[game.education]}</h3><p className="muted">School begins at 6 and finishes at 18. University takes three years. Political months count towards the same education timeline.</p>{game.education==='university'&&<p>Years completed: {game.studyYears}/3</p>}{actionButton('study','Study with focus',monthly?'+3 smarts · −1 happiness':'+8 smarts · −2 happiness')}{actionButton('university','Go to university',`${money(game,countryOf(game).tuition)} per year · 3 years`)}<p className="fine">Enrolment leaves your outside job. Tuition and living costs can create personal debt.</p></>}
            {tab==='Career'&&<><PoliticalCareer game={game} update={update} onAdvance={advance}/><details className="outside-careers" open={!political}><summary>{political?'Outside employment & retirement':'Other career paths'}</summary><p className="muted">{game.job?`${jobOf(game)?.name} · level ${game.level+1} · ${money(game,salary(game))}/year`:'An outside job can support your early political life.'}</p>{jobs.map(j=><div key={j.id}>{actionButton(`job:${j.id}`,j.name,`${money(game,Math.round(j.salary*countryOf(game).wage))}/year · ${j.smarts} smarts${j.degree?' · degree':''}`)}</div>)}{actionButton('retire','Retire from employment','From 65 · resign elected office first')}</details></>}
            {tab==='Finances'&&<><h3>A little breathing room</h3><div className="ledger"><div><span>Personal balance</span><strong>{money(game,game.money)}</strong></div><div><span>{monthly?'Last monthly income':'Last yearly income'}</span><strong>{money(game,currentFinance(game).lastIncome)}</strong></div><div><span>{political?'Last monthly expenses':'Last yearly expenses'}</span><strong>{money(game,currentFinance(game).lastExpenses)}</strong></div><div><span>Lifetime income</span><strong>{money(game,game.earned)}</strong></div></div><p className="muted">{monthly?'Monthly life uses pay, living costs, tuition and debt interest. The birthday does not charge those costs again. Energy pressure can raise your living costs.':'Living costs begin at 18. Debt accrues 5% yearly interest.'} Figures are fictional take-home amounts.</p><div className="life-backup-controls"><button className="quiet outlined" onClick={()=>exportBackup(game)}>Export complete life</button><button className="quiet outlined" onClick={()=>restoreInput.current?.click()}>Restore life backup</button><button className="quiet outlined" onClick={exportLegacy}>Export earlier town archive</button></div>{recoveryControls}<p className="fine">Your complete life export includes its political career. Restore on another device to move the same story. The earlier separate town experiment stays archived; it is not silently attached to this character.</p></>}
          </div>
        </section>
        <aside className="activities"><div className="eyebrow">THE EVERYDAY MATTERS</div><h3>Make time for you.</h3><p className="muted">{political?'Career and personal life share your time.':'Small habits. Lasting changes.'}</p><div className="time-budget"><span>{[0,1,2].map(i=><i key={i} className={i<game.actions?'available':''}/>)}</span><small>{game.actions} of 3 activities left</small></div>{actionButton('read','Follow your curiosity',political?'+2 smarts':'+5 smarts')}{actionButton('exercise','Get moving',political?'+2 health · +1 happiness':'+6 health · +2 happiness')}{actionButton('rest','Take a slow day',political?'+2 happiness · +1 health':'+7 happiness · +2 health')}{actionButton('groom','A little self-care',political?'+2 looks · +1 happiness':'+5 looks · +1 happiness')}<div className="next-page"><span className="eyebrow">THERE’S MORE TO YOUR STORY</span><p>Some things you choose.<br/>Some things find you.</p><button className="primary age-button" disabled={timeBlocked} onClick={advance}>{monthly?'Next month':'Age up'} <span>{political?'+1 month →':'+1 year →'}</span></button><small>{timeBlocked?'Resolve your outstanding choices to continue.':monthly?'Twelve months. One birthday.':'A new year. A new possibility.'}</small></div></aside>
      </main>
      <footer>TURNING PAGES <span>One character · One life · One saved story</span></footer>
      {political&&game.alive&&<div className="life-career-dock"><button onClick={()=>{setTab('Career');scrollStory();}}>{timeBlocked?'Your next decision ↑':'Career & choices ↑'}</button><span>{greetingMonth(political.months)}</span><button disabled={timeBlocked} onClick={advance}>Next month →</button></div>}
    </>}
  </div>;
}
function greetingMonth(months:number){return `MONTH ${months+1}`;}
