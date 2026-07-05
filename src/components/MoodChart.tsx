import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';
import { DiaryEntry } from '../db';

interface MoodChartProps {
  entries: DiaryEntry[];
}

export const MoodChart: React.FC<MoodChartProps> = ({ entries }) => {
  // Filter out deleted entries and those without a sentiment score
  const validEntries = entries
    .filter((e) => !e.deletedAt && e.sentimentScore !== undefined)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (validEntries.length === 0) {
    return (
      <div className="bg-white p-5 rounded-3xl border border-stone-200/50 shadow-sm flex flex-col items-center justify-center h-48">
        <p className="text-[11px] text-stone-400 font-mono text-center">
          No mood trends available.<br/>Analyze your diary entries to see sentiment history!
        </p>
      </div>
    );
  }

  const data = validEntries.map((e) => ({
    date: format(new Date(e.date), 'MMM d'),
    score: e.sentimentScore,
    mood: e.mood,
    title: e.title
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-stone-200 shadow-xl rounded-xl">
          <p className="text-xs font-bold text-stone-800">{label}</p>
          <p className="text-[10px] text-stone-500 font-mono mb-1">{payload[0].payload.title}</p>
          <p className="text-xs font-bold text-amber-500">
            {payload[0].payload.mood} ({payload[0].value}/100)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-5 rounded-3xl border border-stone-200/50 shadow-sm space-y-3">
      <span className="text-[10px] text-stone-400 uppercase tracking-widest font-mono font-bold block flex items-center gap-1">
        📈 Mood Trends (Sentiment History)
      </span>
      <div className="h-48 w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#a8a29e' }}
              dy={10}
            />
            <YAxis 
              domain={[0, 100]} 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#a8a29e' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#f59e0b"
              strokeWidth={3}
              dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
              animationDuration={1500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
