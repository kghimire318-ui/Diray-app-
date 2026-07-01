import React, { useState } from 'react';
import { Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export interface TodoItemData {
  id: string;
  text: string;
  completed: boolean;
}

interface ChecklistProps {
  items: TodoItemData[];
  onUpdate: (items: TodoItemData[]) => void;
}

export const Checklist: React.FC<ChecklistProps> = ({ items, onUpdate }) => {
  const [newItemText, setNewItemText] = useState('');

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;

    const newItem: TodoItemData = {
      id: crypto.randomUUID(),
      text: newItemText.trim(),
      completed: false,
    };

    onUpdate([...items, newItem]);
    setNewItemText('');
  };

  const toggleItem = (id: string) => {
    onUpdate(
      items.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const removeItem = (id: string) => {
    onUpdate(items.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-4">
      <form onSubmit={addItem} className="flex gap-2">
        <input
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          placeholder="Add an item (e.g. Eggs, 1 dozen)..."
          className="flex-1 bg-stone-100 border-none rounded-full px-4 py-2 text-stone-800 placeholder:text-stone-400 focus:ring-2 focus:ring-stone-400"
        />
        <button
          type="submit"
          className="p-2 bg-stone-800 text-stone-50 rounded-full hover:bg-stone-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </form>

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-3 p-3 bg-white border border-stone-100 rounded-xl group shadow-sm"
            >
              <button
                onClick={() => toggleItem(item.id)}
                className="text-stone-400 group-hover:text-stone-600 transition-colors"
              >
                {item.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </button>
              <span
                className={cn(
                  "flex-1 text-stone-700 transition-all",
                  item.completed && "line-through text-stone-400"
                )}
              >
                {item.text}
              </span>
              <button
                onClick={() => removeItem(item.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-stone-300 hover:text-red-400 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {items.length === 0 && (
          <div className="text-center py-8 text-stone-400">
            <p className="text-sm">Your list is empty. Add items above.</p>
          </div>
        )}
      </div>
    </div>
  );
};
