/** Country- and career-independent persistent character. No feature-module imports. */
export type Stats={health:number;happiness:number;smarts:number;looks:number};
export type Effects=Partial<Stats>&{money?:number;bond?:number};
export type Choice={text:string;result:string;effects:Effects};
export type LifeEvent={id:string;title:string;text:string;min:number;max:number;choices:Choice[]};
export type Relationship={id:string;name:string;role:string;bond:number;kind?:'family'|'friend'|'professional'};
export type Country={id:string;name:string;currency:string;living:number;tuition:number;wage:number};
export type JournalEntry={age:number;text:string;kind:'milestone'|'event'|'action'|'finance'};
export type LifeFact={id:string;atMonth:number|null;source:string;kind:string;detail:string;tags:string[]};
export type Development={traits:string[];skills:Record<string,number>;reputation:Record<string,number>;fame:number};
export type LifeClock={monthOfYear:number;totalMonths:number;cadence:'year'|'month'};
export type FinancePeriod={lastIncome:number;lastExpenses:number;yearIncome:number;yearExpenses:number};
export type LifeState={
 version:1;name:string;gender:string;country:string;age:number;stats:Stats;money:number;alive:boolean;cause?:string;
 seed:number;actions:number;pending:string|null;seen:string[];relationships:Relationship[];
 education:'preschool'|'school'|'secondary'|'university'|'degree';studyYears:number;job:string|null;jobYears:number;level:number;retired:boolean;
 earned:number;lastIncome:number;lastExpenses:number;journal:JournalEntry[];
 clock?:LifeClock;finances?:FinancePeriod;development?:Development;facts?:LifeFact[];
};
export type Action='read'|'exercise'|'rest'|'groom'|'study'|'university'|'retire'|`connect:${string}`|`job:${string}`;
