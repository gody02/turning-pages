/** Country- and career-independent persistent character. No feature-module imports. */
export type Stats={health:number;happiness:number;smarts:number;looks:number};
export type Effects=Partial<Stats>&{money?:number;bond?:number};
/** Stable content identity. UI may keep presenting choices in its own order. */
export type Choice={id:string;text:string;result:string;effects:Effects};
export type LifeEvent={id:string;title:string;text:string;min:number;max:number;choices:Choice[]};
export type Relationship={id:string;name:string;role:string;bond:number;kind?:'family'|'friend'|'professional'};
export type Country={id:string;name:string;currency:string;living:number;tuition:number;wage:number};
export type JournalEntry={age:number;text:string;kind:'milestone'|'event'|'action'|'finance'};
export type LifeFact={id:string;atMonth:number|null;source:string;kind:string;detail:string;tags:string[]};
export type Development={traits:string[];skills:Record<string,number>;reputation:Record<string,number>;fame:number};
export type SimulationDate={year:number;month:number;day:number};
export type RandomStreamState={algorithm:'lcg32-v1';state:number;cursor:number};
/** Country-neutral persisted random state. Stream names are owned by their callers. */
export type RandomnessState={version:1;rootSeed:number;streams:Record<string,RandomStreamState>};
export type JsonValue=null|boolean|number|string|JsonValue[]|{[key:string]:JsonValue};
export type ScheduleRecurrenceUnit='day'|'month'|'year';
export type ScheduleRecurrence={unit:ScheduleRecurrenceUnit;interval:number;anchorDate:SimulationDate;nextOccurrence:number};
/** Serializable future work. Its owner interprets its kind and payload. */
export type ScheduledItem={id:string;sequence:number;owner:string;kind:string;dueDate:SimulationDate;createdAt:SimulationDate;source?:string;payload?:JsonValue;recurrence?:ScheduleRecurrence};
export type SchedulerState={version:1;nextSequence:number;items:ScheduledItem[]};
export type HistoryFact={readonly id:string;readonly sequence:number;readonly occurredAt:Readonly<SimulationDate>;readonly type:string;readonly source:string;readonly actorIds?:readonly string[];readonly subjectIds?:readonly string[];readonly payload?:JsonValue};
/** Country-neutral append-only durable facts. Legacy save input may omit this component. */
export type HistoryState={readonly version:1;readonly nextSequence:number;readonly facts:readonly HistoryFact[]};
/** The one current simulation date. Domain elapsed counters are not clocks. */
export type LifeClock={version:2;date:SimulationDate;cadence:'year'|'month'};
export type FinancePeriod={lastIncome:number;lastExpenses:number;yearIncome:number;yearExpenses:number};
export type LifeState={
 version:1|2|3;name:string;gender:string;country:string;age:number;stats:Stats;money:number;alive:boolean;cause?:string;
 seed:number;actions:number;pending:string|null;seen:string[];relationships:Relationship[];
 randomness?:RandomnessState;scheduler?:SchedulerState;history?:HistoryState;
 education:'preschool'|'school'|'secondary'|'university'|'degree';studyYears:number;job:string|null;jobYears:number;level:number;retired:boolean;
 earned:number;lastIncome:number;lastExpenses:number;journal:JournalEntry[];
 dateOfBirth?:SimulationDate;clock?:LifeClock;finances?:FinancePeriod;development?:Development;facts?:LifeFact[];
};
export type Action='read'|'exercise'|'rest'|'groom'|'study'|'university'|'retire'|`connect:${string}`|`job:${string}`;
