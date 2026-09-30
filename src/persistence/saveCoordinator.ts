import type {Game} from '../engine/types';

export type SaveCoordinatorState='idle'|'saving'|'saved'|'failed';
export interface SaveCoordinatorSnapshot {state:SaveCoordinatorState;revision:number|null;dirty:boolean;error:unknown|null}
type Pending={sequence:number;game:Game};
type Waiter={sequence:number;resolve:(revision:number)=>void;reject:(error:unknown)=>void};

export class SaveCoordinator {
  private sequence=0;
  private pending:Pending|null=null;
  private active=false;
  private paused=false;
  private dirtyGame:Game|null=null;
  private waiters:Waiter[]=[];
  private snapshotValue:SaveCoordinatorSnapshot;
  constructor(private readonly saver:(game:Game,expectedRevision:number|null)=>Promise<number>,initialRevision:number|null,private readonly listener?:(snapshot:SaveCoordinatorSnapshot)=>void){this.snapshotValue={state:'idle',revision:initialRevision,dirty:false,error:null};}
  get snapshot(){return this.snapshotValue;}
  get hasUnsavedChanges(){return this.snapshotValue.dirty||this.active;}
  private publish(value:SaveCoordinatorSnapshot){this.snapshotValue=value;this.listener?.(value);}
  request(game:Game){this.enqueue(game);}
  persist(game:Game):Promise<number>{
    if(this.paused){this.enqueue(game);return Promise.reject(this.snapshotValue.error??Error('Saving is paused after a previous failure. Retry the pending save.'));}
    const sequence=this.enqueue(game);return new Promise((resolve,reject)=>{this.waiters.push({sequence,resolve,reject});});
  }
  retry():Promise<number>{if(!this.dirtyGame)return Promise.resolve(this.snapshotValue.revision??0);this.paused=false;return this.persist(this.dirtyGame);}
  private enqueue(game:Game){const sequence=++this.sequence;this.pending={sequence,game};this.dirtyGame=game;this.publish({...this.snapshotValue,state:this.paused?'failed':'saving',dirty:true,error:this.paused?this.snapshotValue.error:null});if(!this.active&&!this.paused)void this.drain();return sequence;}
  private async drain(){if(this.active||this.paused)return;this.active=true;
    while(this.pending&&!this.paused){
      const candidate=this.pending;this.pending=null;this.publish({...this.snapshotValue,state:'saving',dirty:true,error:null});
      try{
        const revision=await this.saver(candidate.game,this.snapshotValue.revision),pendingAfter=this.pending as Pending|null;this.dirtyGame=pendingAfter?.game??null;
        const ready=this.waiters.filter(item=>item.sequence<=candidate.sequence),later=this.waiters.filter(item=>item.sequence>candidate.sequence);this.waiters=later;ready.forEach(item=>item.resolve(revision));
        this.publish({state:this.pending?'saving':'saved',revision,dirty:!!this.pending,error:null});
      }catch(error){
        const pendingAfter=this.pending as Pending|null;this.dirtyGame=pendingAfter?.game??candidate.game;this.pending=null;this.paused=true;const waiting=this.waiters;this.waiters=[];waiting.forEach(item=>item.reject(error));this.publish({state:'failed',revision:this.snapshotValue.revision,dirty:true,error});
      }
    }
    this.active=false;
  }
}
