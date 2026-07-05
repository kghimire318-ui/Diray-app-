import Dexie, { type Table } from 'dexie';

export interface AppSettings {
  id?: string;
  key: string;
  value: any;
}

export interface DiaryEntry {
  id?: number;
  title: string;
  content: string;
  date: Date;
  type: 'journal' | 'list';
  tags?: string[];
  updatedAt: Date;
  isLocked?: boolean;
  customPassword?: string;
  deletedAt?: Date;
  sentimentScore?: number;
  mood?: string;
}

export interface Habit {
  id?: number;
  name: string;
  frequency: 'daily' | 'weekly';
  createdAt: Date;
  reminderTime?: string;
}

export class DiaryDatabase extends Dexie {
  entries!: Table<DiaryEntry>;
  attachments!: Table<any>;
  todos!: Table<any>;
  habits!: Table<Habit>;
  habitCompletions!: Table<any>;
  settings!: Table<AppSettings>;

  constructor() {
    super('DiaryDB');
    this.version(1).stores({
      entries: '++id, date, type',
      attachments: '++id, entryId, type',
      todos: '++id, entryId, completed',
      habits: '++id, frequency',
      habitCompletions: '++id, habitId, date',
      settings: 'key'
    });
  }
}

export const db = new DiaryDatabase();
