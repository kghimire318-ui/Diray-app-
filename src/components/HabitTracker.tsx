import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { Habit } from '../db';
import { Plus, Check, Trash2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

export const HabitTracker: React.FC = () => {
  const habits = useLiveQuery(() => db.habits.toArray());
  const [newHabit, setNewHabit] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');

  const addHabit = async () => {
    if (!newHabit.trim()) return;
    await db.habits.add({ name: newHabit, frequency: 'daily', createdAt: new Date(), reminderTime: newReminderTime || undefined });
    setNewHabit('');
    setNewReminderTime('');
  };

  const deleteHabit = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete the habit "${name}"?`)) {
      await db.habits.delete(id);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
      <h3 className="font-semibold text-stone-900 mb-4">Daily Habits</h3>
      <div className="flex gap-2 mb-4">
        <input
          value={newHabit}
          onChange={(e) => setNewHabit(e.target.value)}
          placeholder="New habit..."
          className="flex-1 p-2 rounded-xl border border-stone-200"
        />
        <input
          type="time"
          value={newReminderTime}
          onChange={(e) => setNewReminderTime(e.target.value)}
          className="p-2 rounded-xl border border-stone-200"
        />
        <button onClick={addHabit} className="p-2 bg-stone-800 text-white rounded-xl">
          <Plus className="w-5 h-5" />
        </button>
      </div>
      <div className="space-y-2">
        {habits?.map(habit => (
          <div key={habit.id} className="flex items-center justify-between p-3 rounded-xl bg-stone-50">
            <div>
                <p className="font-medium text-stone-900">{habit.name}</p>
                {habit.reminderTime && <p className="text-xs text-stone-500">Reminder: {habit.reminderTime}</p>}
            </div>
            <button onClick={() => deleteHabit(habit.id!, habit.name)} className="text-stone-400 hover:text-red-500">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
