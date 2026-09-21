import type { Town } from './town';
import type { NationalState } from './national';
import type { PartyId,DoctrineId,PoliticalRole,BillId } from '../data/politics';
import type { PolicyId } from '../data/town';
export type PoliticalCareer={
  version:1;active:true;party:PartyId;doctrine:DoctrineId;role:PoliticalRole;months:number;startAge:number;
  reputation:number;integrity:number;organisation:number;knowledge:number;
  caucus:number;unions:number;enterprise:number;support:number;campaignFunds:number;
  candidacy:'council'|'parliament'|null;seats:number;inGovernment:boolean;
  pending:string|null;seen:string[];memories:string[];
  motion:PolicyId|null;bill:{id:BillId;stage:number;lastAdvanced:number}|null;laws:BillId[];
  economy:Town;national?:NationalState;log:{month:number;text:string}[];
  elections:{month:number;kind:'council'|'parliament';won:boolean;votes:number[];seats:number}[];
  lastIncome:number;lastExpenses:number;yearIncome:number;yearExpenses:number;
};
