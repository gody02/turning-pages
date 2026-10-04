/** Application orchestration only. The candidate exists solely in this request's
 * stack until the existing save pipeline commits it; this controller caches no Game. */
export type NewGamePhase='idle'|'constructing'|'preparing'|'committing';
export function createNewGameSubmission<T>(hooks:Readonly<{
  phase:(phase:NewGamePhase)=>void;
  cancelConstruction:()=>void;
}>){
  let active:Readonly<{abort:AbortController;phase:NewGamePhase}>|null=null;
  const current=(operation:NonNullable<typeof active>)=>active===operation&&!operation.abort.signal.aborted;
  function cancel(notify=true,abandon=false):boolean{
    if(!active||active.phase==='committing'&&!abandon)return false;
    const operation=active;active=null;operation.abort.abort();
    if(operation.phase==='constructing')hooks.cancelConstruction();
    if(notify)hooks.phase('idle');return true;
  }
  return Object.freeze({
    busy:()=>active!==null,
    cancel:()=>cancel(),
    // Unmount invalidates publication even if a complete atomic save has started.
    // A started transaction is never falsely claimed to have been rolled back.
    abandon:()=>cancel(false,true),
    async run(build:(signal:AbortSignal)=>Promise<T>,prepare:(value:T,signal:AbortSignal)=>Promise<unknown>,commit:(value:T)=>Promise<unknown>,activate:(value:T)=>void):Promise<boolean>{
      if(active)return false;
      let operation=Object.freeze({abort:new AbortController(),phase:'constructing' as NewGamePhase});
      active=operation;hooks.phase('constructing');
      const advance=(phase:NewGamePhase)=>{operation=Object.freeze({...operation,phase});active=operation;hooks.phase(phase);};
      try{
        const value=await build(operation.abort.signal);if(!current(operation))return false;
        advance('preparing');await prepare(value,operation.abort.signal);if(!current(operation))return false;
        // Commit is the point of no return. Navigation/other replacements are
        // disabled until it completes; cancellation before this point writes nothing.
        advance('committing');await commit(value);if(!current(operation))return false;
        activate(value);return true;
      }catch(error){if(current(operation))throw error;return false;}
      finally{if(active===operation){active=null;hooks.phase('idle');}}
    }
  });
}
