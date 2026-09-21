export type Stats = { health: number; happiness: number; smarts: number; looks: number };
export type Effects = Partial<Stats> & { money?: number; bond?: number };
export type Choice = { text: string; result: string; effects: Effects };
export type LifeEvent = { id: string; title: string; text: string; min: number; max: number; choices: Choice[] };
export type Relationship = { id: string; name: string; role: string; bond: number };
export type Country = { id: string; name: string; currency: string; living: number; tuition: number; wage: number };
export type JournalEntry = { age: number; text: string; kind: 'milestone' | 'event' | 'action' | 'finance' };
export type Game = {
  version: 1; name: string; gender: string; country: string; age: number; stats: Stats; money: number;
  alive: boolean; cause?: string; seed: number; actions: number; pending: string | null; seen: string[];
  relationships: Relationship[]; education: 'preschool' | 'school' | 'secondary' | 'university' | 'degree';
  studyYears: number; job: string | null; jobYears: number; level: number; retired: boolean;
  earned: number; lastIncome: number; lastExpenses: number; journal: JournalEntry[];
};
export type Action = 'read' | 'exercise' | 'rest' | 'groom' | 'study' | 'university' | 'retire' | `connect:${string}` | `job:${string}`;
