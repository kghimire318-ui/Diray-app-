import Dexie, { type Table } from 'dexie';

export interface LeaderboardRun {
  id?: number;
  pilotName: string;
  routeName: string;
  busName: string;
  passengersCarried: number;
  earnings: number; // ticket sales in ₹INR
  safetyStars: number; // 1 to 5 stars depending on crash count
  timeTaken: number; // in seconds
  completedAt: Date;
}

export interface SavedLivery {
  id?: number;
  name: string;
  paintColor: string;
  stripeColor: string;
  stickerId: 'none' | 'flag' | 'om' | 'ganesha' | 'stars' | 'lightning';
  ledText: string;
  quoteText: string;
  tasselsEnabled: boolean;
  underglowColor: string;
  createdAt: Date;
}

export interface AppSettings {
  id: string;
  key: string;
  value: any;
}

// Keep a few legacy stubs to ensure all imports continue to resolve, but expand with Bus tables!
export interface DiaryEntry {
  id?: number;
  title: string;
  content: string;
  date: Date;
  type: 'journal' | 'list';
  tags?: string[];
  updatedAt: Date;
}

export interface Habit {
  id?: number;
  name: string;
  frequency: 'daily' | 'weekly';
  createdAt: Date;
  reminderTime?: string;
}

export class DiaryDatabase extends Dexie {
  // Legacy table stubs to avoid compile breaks if referenced from checklists
  entries!: Table<DiaryEntry>;
  attachments!: Table<any>;
  todos!: Table<any>;
  habits!: Table<Habit>;
  habitCompletions!: Table<any>;
  settings!: Table<AppSettings>;

  // BUSSIN Dedicated Simulator Tables
  runs!: Table<LeaderboardRun>;
  liveries!: Table<SavedLivery>;

  constructor() {
    super('DiaryDB');
    this.version(1).stores({
      entries: '++id, date, type',
      attachments: '++id, entryId, type',
      todos: '++id, entryId, completed',
      habits: '++id, frequency',
      habitCompletions: '++id, habitId, date',
      settings: 'key',
      
      // New BUSSIN Simulator endpoints
      runs: '++id, pilotName, routeName, earnings, safetyStars',
      liveries: '++id, name, paintColor'
    });
  }
}

export const db = new DiaryDatabase();
