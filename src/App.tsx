import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  Plus, Search, Settings, ChevronLeft, BookOpen, ListTodo, Trash2, Calendar, 
  Sparkles, Mic, Video, Pen, Image as ImageIcon, Bot, FileText, 
  CheckCircle2, Check, X, RefreshCw, Cloud, Download, Heart,
  Award, CalendarDays, Brain, AlertCircle, Lock, Shield, Moon, Sun
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';

import { db } from './db';
import type { DiaryEntry } from './db';
import { SecurityLock } from './components/SecurityLock';
import { SecondaryLockModal } from './components/SecondaryLockModal';
import { Checklist } from './components/Checklist';
import type { TodoItemData } from './components/Checklist';
import { HabitTracker } from './components/HabitTracker';
import LiveChatDiary from './components/LiveChatDiary';
import { MoodChart } from './components/MoodChart';
import { AdSenseBanner } from './components/AdSenseBanner';
import { MediaCarousel } from './components/media/MediaCarousel';
import { AudioRecorder } from './components/media/AudioRecorder';
import { VideoRecorder } from './components/media/VideoRecorder';
import { CanvasModal } from './components/media/CanvasModal';
import { Editor } from './components/editor/Editor';

export default function App() {
  // Navigation
  const [view, setView] = useState<'home' | 'editor' | 'settings'>('home');
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);

  // Home filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'journal' | 'list'>('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  // Editor form states
  const [entryTitle, setEntryTitle] = useState('');
  const [entryType, setEntryType] = useState<'journal' | 'list'>('journal');
  const [entryContent, setEntryContent] = useState('');
  const [entryTags, setEntryTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [entryDate, setEntryDate] = useState<Date>(new Date());
  
  // Media attachments & checklists
  const [activeMediaCapture, setActiveMediaCapture] = useState<'audio' | 'video' | 'drawing' | null>(null);
  const [todoItems, setTodoItems] = useState<TodoItemData[]>([]);
  const [entryAttachments, setEntryAttachments] = useState<any[]>([]);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'Saved' | 'Saving...' | 'Unsaved'>('Saved');
  const [entrySentimentScore, setEntrySentimentScore] = useState<number | undefined>(undefined);
  const [entryMood, setEntryMood] = useState<string | undefined>(undefined);

  // AI-powered analytics states
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiMoodResult, setAiMoodResult] = useState<{ mood: string; summary: string; score: number } | null>(null);
  const [aiSummaryResult, setAiSummaryResult] = useState<string | null>(null);
  const [aiReflectionResult, setAiReflectionResult] = useState<string | null>(null);

  // Modals & toast notifications
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hudMessage, setHudMessage] = useState<string | null>(null);
  const [hudMessageType, setHudMessageType] = useState<'success' | 'info' | 'error'>('info');

  // AdSense & Master settings
  const [adsensePubId, setAdsensePubId] = useState('');
  const [adsenseSlotId, setAdsenseSlotId] = useState('');
  const [adsenseEnabled, setAdsenseEnabled] = useState(false);
  const [adsenseTestMode, setAdsenseTestMode] = useState(true);
  const [securityPin, setSecurityPin] = useState('1234');
  const [lockScreenEnabled, setLockScreenEnabled] = useState(true);
  
  // Dark mode
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  // Secondary Security states
  const [secondaryPin, setSecondaryPin] = useState('5678');
  const [entryIsLocked, setEntryIsLocked] = useState(false);
  const [entryCustomPassword, setEntryCustomPassword] = useState('');
  const [isPrivateFolderActive, setIsPrivateFolderActive] = useState(false);
  const [isDeletedFolderActive, setIsDeletedFolderActive] = useState(false);
  const [secondaryLockOpen, setSecondaryLockOpen] = useState(false);
  const [secondaryLockPrompt, setSecondaryLockPrompt] = useState('');
  const [secondaryLockExpectedPin, setSecondaryLockExpectedPin] = useState('');
  const [secondaryLockSuccessCallback, setSecondaryLockSuccessCallback] = useState<() => void>(() => () => {});

  // Load entries from database
  const entries = useLiveQuery(() => db.entries.toArray());

  // Setup default lock pin & load saved settings on mount
  useEffect(() => {
    const initializeSettings = async () => {
      try {
        const storedPin = await db.settings.get('storage_pin');
        if (!storedPin) {
          await db.settings.put({ key: 'storage_pin', value: '1234' });
          setSecurityPin('1234');
        } else {
          setSecurityPin(storedPin.value);
        }

        const storedLockEnabled = await db.settings.get('lock_screen_enabled');
        if (!storedLockEnabled) {
          await db.settings.put({ key: 'lock_screen_enabled', value: 'true' });
          setLockScreenEnabled(true);
        } else {
          setLockScreenEnabled(storedLockEnabled.value === 'true');
        }

        const storedSecPin = await db.settings.get('secondary_pin');
        if (!storedSecPin) {
          await db.settings.put({ key: 'secondary_pin', value: '5678' });
          setSecondaryPin('5678');
        } else {
          setSecondaryPin(storedSecPin.value);
        }

        const pub = await db.settings.get('adsense_pub_id');
        const slot = await db.settings.get('adsense_slot_id');
        const enabled = await db.settings.get('adsense_enabled');
        const testMode = await db.settings.get('adsense_test_mode');

        if (pub) setAdsensePubId(pub.value);
        if (slot) setAdsenseSlotId(slot.value);
        if (enabled) setAdsenseEnabled(enabled.value);
        if (testMode !== undefined) setAdsenseTestMode(testMode.value);
      } catch (err) {
        console.warn('Dexie settings fetch warning:', err);
      }
    };
    initializeSettings();
  }, []);

  // Theme application
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Purge old deleted entries on load
  useEffect(() => {
    const purgeOldDeletedEntries = async () => {
      try {
        const allEntries = await db.entries.toArray();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        for (const entry of allEntries) {
          if (entry.deletedAt && new Date(entry.deletedAt) < thirtyDaysAgo) {
            await db.entries.delete(entry.id!);
            await db.todos.where('entryId').equals(entry.id!).delete();
            await db.attachments.where('entryId').equals(entry.id!).delete();
          }
        }
      } catch (err) {
        console.error('Failed to purge entries:', err);
      }
    };
    purgeOldDeletedEntries();
  }, []);

  // Filter entries dynamically
  const filteredEntries = React.useMemo(() => {
    if (!entries) return [];
    return entries.filter(e => {
      // If deleted folder filter is active, only show deleted items
      if (isDeletedFolderActive) return !!e.deletedAt;
      
      // Otherwise, hide deleted items
      if (e.deletedAt) return false;

      // If private folder filter is active, only show locked pages
      if (isPrivateFolderActive && !e.isLocked) return false;

      const matchSearch = searchQuery ? (
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        stripHtml(e.content).toLowerCase().includes(searchQuery.toLowerCase())
      ) : true;
      const matchType = typeFilter === 'all' ? true : e.type === typeFilter;
      const matchTag = tagFilter ? e.tags?.includes(tagFilter) : true;
      return matchSearch && matchType && matchTag;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entries, searchQuery, typeFilter, tagFilter, isPrivateFolderActive]);

  // Extract unique tags
  const uniqueTags = React.useMemo(() => {
    if (!entries) return [];
    const tagsSet = new Set<string>();
    entries.forEach(e => {
      e.tags?.forEach(t => tagsSet.add(t));
    });
    return Array.from(tagsSet);
  }, [entries]);

  // Entry chronology tracking
  const entriesCountByDay = React.useMemo(() => {
    const obj: Record<string, number> = {};
    if (!entries) return obj;
    entries.forEach(e => {
      const key = format(new Date(e.date), 'yyyy-MM-dd');
      obj[key] = (obj[key] || 0) + 1;
    });
    return obj;
  }, [entries]);

  // word counts
  const totalWords = React.useMemo(() => {
    if (!entries) return 0;
    return entries.reduce((acc, e) => {
      const words = stripHtml(e.content).trim().split(/\s+/).filter(Boolean).length;
      return acc + words;
    }, 0);
  }, [entries]);

  function stripHtml(html: string) {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  }

  const triggerHud = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setHudMessage(message);
    setHudMessageType(type);
  };

  // Create new entry
  const handleCreateEntry = (type: 'journal' | 'list') => {
    setSelectedEntryId(null);
    setEntryTitle('');
    setEntryType(type);
    setEntryContent('');
    setEntryTags([]);
    setEntryIsLocked(false);
    setEntryCustomPassword('');
    setEntryDate(new Date());
    setEntrySentimentScore(undefined);
    setEntryMood(undefined);
    setTodoItems([]);
    setEntryAttachments([]);
    setAiMoodResult(null);
    setAiSummaryResult(null);
    setAiReflectionResult(null);
    setView('editor');
  };

  // Proceed with actual opening of an entry
  const proceedOpenEntry = async (entry: DiaryEntry) => {
    setSelectedEntryId(entry.id!);
    setEntryTitle(entry.title);
    setEntryType(entry.type);
    setEntryContent(entry.content);
    setEntryTags(entry.tags || []);
    setEntryIsLocked(!!entry.isLocked);
    setEntryCustomPassword(entry.customPassword || '');
    setEntryDate(new Date(entry.date));
    setEntrySentimentScore(entry.sentimentScore);
    setEntryMood(entry.mood);
    setAiMoodResult(null);
    setAiSummaryResult(null);
    setAiReflectionResult(null);

    if (entry.type === 'list') {
      const todos = await db.todos.where('entryId').equals(entry.id!).toArray();
      setTodoItems(todos.map(t => ({ id: String(t.id), text: t.text, completed: !!t.completed })));
    } else {
      setTodoItems([]);
    }

    const atts = await db.attachments.where('entryId').equals(entry.id!).toArray();
    setEntryAttachments(atts);

    setView('editor');
  };

  // Open existing entry with secondary security validation
  const handleOpenEntry = async (entry: DiaryEntry) => {
    if (entry.isLocked) {
      setSecondaryLockPrompt(`Decrypting "${entry.title}" requires secondary security verification.`);
      setSecondaryLockExpectedPin(entry.customPassword || secondaryPin);
      setSecondaryLockSuccessCallback(() => async () => {
        await proceedOpenEntry(entry);
        setSecondaryLockOpen(false);
      });
      setSecondaryLockOpen(true);
    } else {
      await proceedOpenEntry(entry);
    }
  };

  // Auto-save logic
  useEffect(() => {
    if (view !== 'editor') return;
    if (!entryTitle.trim()) return;

    setAutoSaveStatus('Unsaved');
    
    const timer = setTimeout(async () => {
      setAutoSaveStatus('Saving...');
      try {
        let entryId = selectedEntryId;
        const payload: DiaryEntry = {
          title: entryTitle.trim(),
          content: entryContent,
          date: entryDate,
          type: entryType,
          tags: entryTags,
          isLocked: entryIsLocked,
          customPassword: entryIsLocked ? entryCustomPassword : '',
          sentimentScore: entrySentimentScore,
          mood: entryMood,
          updatedAt: new Date()
        };

        if (entryId) {
          payload.id = entryId;
          await db.entries.put(payload);
        } else {
          entryId = await db.entries.add(payload);
          setSelectedEntryId(entryId);
        }

        if (entryType === 'list') {
          await db.todos.where('entryId').equals(entryId).delete();
          for (const item of todoItems) {
            await db.todos.add({
              entryId,
              text: item.text,
              completed: item.completed
            });
          }
        }

        for (const att of entryAttachments) {
          if (!att.id && (!att.entryId || att.entryId === -1)) {
            await db.attachments.add({
              entryId,
              type: att.type,
              data: att.data,
              fileName: att.fileName,
              createdAt: new Date()
            });
          }
        }

        setAutoSaveStatus('Saved');
      } catch (e) {
        console.error(e);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [entryTitle, entryContent, entryType, entryTags, entryIsLocked, entryCustomPassword, todoItems, entryAttachments, selectedEntryId, view, entryDate, entrySentimentScore, entryMood]);

  // Save the entry
  const handleSaveEntry = async () => {
    if (!entryTitle.trim()) {
      triggerHud('⚠️ A title is required to index your secret diary page.', 'error');
      return;
    }

    try {
      let entryId = selectedEntryId;
      const payload: DiaryEntry = {
        title: entryTitle.trim(),
        content: entryContent,
        date: entryDate,
        type: entryType,
        tags: entryTags,
        isLocked: entryIsLocked,
        customPassword: entryIsLocked ? entryCustomPassword : '',
        sentimentScore: entrySentimentScore,
        mood: entryMood,
        updatedAt: new Date()
      };

      if (entryId) {
        payload.id = entryId;
        await db.entries.put(payload);
        triggerHud('💾 Journal page successfully synchronized and stored.', 'success');
      } else {
        entryId = await db.entries.add(payload);
        triggerHud('✨ New diary page archived inside local vault.', 'success');
      }

      if (entryType === 'list') {
        await db.todos.where('entryId').equals(entryId).delete();
        for (const item of todoItems) {
          await db.todos.add({
            entryId,
            text: item.text,
            completed: item.completed
          });
        }
      }

      for (const att of entryAttachments) {
        if (!att.id && (!att.entryId || att.entryId === -1)) {
          await db.attachments.add({
            entryId,
            type: att.type,
            data: att.data,
            fileName: att.fileName,
            createdAt: new Date()
          });
        }
      }

      setView('home');
    } catch (err) {
      console.error(err);
      triggerHud('❌ IndexedDB transaction failed.', 'error');
    }
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleCreateEntry('journal');
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (view === 'editor') {
          handleSaveEntry();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, handleCreateEntry, handleSaveEntry]);

  // Proceed with moving to recently deleted
  const proceedDeleteEntry = async (id: number) => {
    if (window.confirm('Are you sure you want to move this diary page to Recently Deleted?')) {
      try {
        await db.entries.update(id, { deletedAt: new Date() });
        triggerHud('🗑️ Entry moved to Recently Deleted.', 'success');
      } catch (err) {
        console.error(err);
        triggerHud('❌ Deletion failed.', 'error');
      }
    }
  };

  const handleRestoreEntry = async (id: number) => {
    try {
      const entry = await db.entries.get(id);
      if (entry) {
        delete entry.deletedAt;
        await db.entries.put(entry);
        triggerHud('♻️ Entry restored to active diary.', 'success');
      }
    } catch (err) {
      console.error(err);
      triggerHud('❌ Restore failed.', 'error');
    }
  };

  const proceedPermanentDeleteEntry = async (id: number) => {
    if (window.confirm('Are you sure you want to permanently shred this diary page? This action cannot be undone.')) {
      try {
        await db.entries.delete(id);
        await db.todos.where('entryId').equals(id).delete();
        await db.attachments.where('entryId').equals(id).delete();
        triggerHud('🔥 Entry permanently shredded.', 'success');
      } catch (err) {
        console.error(err);
        triggerHud('❌ Permanent deletion failed.', 'error');
      }
    }
  };

  // Delete entry with secondary security validation
  const handleDeleteEntry = async (id: number) => {
    try {
      const entry = await db.entries.get(id);
      if (!entry) return;

      if (entry.isLocked) {
        setSecondaryLockPrompt(`Shredding "${entry.title}" requires secondary security verification.`);
        setSecondaryLockExpectedPin(entry.customPassword || secondaryPin);
        setSecondaryLockSuccessCallback(() => async () => {
          await proceedDeleteEntry(id);
          setSecondaryLockOpen(false);
        });
        setSecondaryLockOpen(true);
      } else {
        await proceedDeleteEntry(id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Tags
  const handleAddTag = () => {
    const clean = newTag.trim().toLowerCase();
    if (clean && !entryTags.includes(clean)) {
      setEntryTags(prev => [...prev, clean]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setEntryTags(prev => prev.filter(t => t !== tag));
  };

  // Media Capture attachments
  const handleCaptureAudio = (blob: Blob) => {
    const att = {
      type: 'audio',
      data: blob,
      fileName: `recording-${format(new Date(), 'HH-mm-ss')}.webm`
    };
    setEntryAttachments(prev => [...prev, att]);
    setActiveMediaCapture(null);
    triggerHud('🎙️ Voice recording successfully attached.');
  };

  const handleCaptureVideo = (blob: Blob) => {
    const att = {
      type: 'video',
      data: blob,
      fileName: `video-${format(new Date(), 'HH-mm-ss')}.webm`
    };
    setEntryAttachments(prev => [...prev, att]);
    setActiveMediaCapture(null);
    triggerHud('📹 Camera recording successfully attached.');
  };

  const handleCaptureDrawing = (blob: Blob) => {
    const att = {
      type: 'image',
      data: blob,
      fileName: `drawing-${format(new Date(), 'HH-mm-ss')}.png`
    };
    setEntryAttachments(prev => [...prev, att]);
    setActiveMediaCapture(null);
    triggerHud('🎨 Interactive canvas drawing attached.');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let type: 'image' | 'video' | 'audio' = 'image';
    if (file.type.startsWith('video/')) type = 'video';
    else if (file.type.startsWith('audio/')) type = 'audio';

    const att = {
      type,
      data: file,
      fileName: file.name
    };
    setEntryAttachments(prev => [...prev, att]);
    triggerHud(`📎 Selected file attached: ${file.name}`);
  };

  const handleDeleteAttachment = async (attIdOrName: any) => {
    try {
      if (typeof attIdOrName === 'number') {
        await db.attachments.delete(attIdOrName);
      }
      setEntryAttachments(prev => prev.filter(att => {
        const id = att.id || att.fileName;
        return id !== attIdOrName;
      }));
      triggerHud('🗑️ Attachment removed.');
    } catch (err) {
      console.error(err);
    }
  };

  // AI Sentiment Analyzer
  const handleAnalyzeMood = async () => {
    const plainText = stripHtml(entryContent);
    if (!plainText.trim()) {
      triggerHud('⚠️ Add some contents to your page first to evaluate mood.', 'error');
      return;
    }
    setIsAiLoading(true);
    triggerHud('🧠 Contextualizing feelings and emotional cues...', 'info');
    try {
      const res = await fetch('/api/analyze-mood', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: plainText })
      });
      const data = await res.json();
      setAiMoodResult({ mood: data.mood, summary: data.summary, score: data.score });
      setEntryMood(data.mood);
      setEntrySentimentScore(data.score);
      triggerHud('✅ Sentiment analysis compiled.', 'success');
    } catch (err) {
      console.error(err);
      triggerHud('❌ Emotional analyzer offline.', 'error');
    } finally {
      setIsAiLoading(false);
    }
  };

  // AI Summarization
  const handleGenerateSummary = async () => {
    const plainText = stripHtml(entryContent);
    if (!plainText.trim()) {
      triggerHud('⚠️ Add some contents to summarize.', 'error');
      return;
    }
    setIsAiLoading(true);
    triggerHud('📝 Generating concise timeline highlights...', 'info');
    try {
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: plainText })
      });
      const data = await res.json();
      setAiSummaryResult(data.summary);
      triggerHud('✅ Highlights successfully generated.', 'success');
    } catch (err) {
      console.error(err);
      triggerHud('❌ Summary service offline.', 'error');
    } finally {
      setIsAiLoading(false);
    }
  };

  // AI Reflection
  const handlePastReflection = async () => {
    const plainText = stripHtml(entryContent);
    if (!plainText.trim()) {
      triggerHud('⚠️ Add some contents to trigger reflections.', 'error');
      return;
    }

    const pastDocs = entries ? entries.slice(0, 3).map(e => ({ title: e.title, content: stripHtml(e.content) })) : [];
    setIsAiLoading(true);
    triggerHud('🔮 Analyzing past chronicles for recurring trends...', 'info');
    try {
      const res = await fetch('/api/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current: plainText, past: pastDocs })
      });
      const data = await res.json();
      setAiReflectionResult(data.reflection);
      triggerHud('✅ Reflection completed.', 'success');
    } catch (err) {
      console.error(err);
      triggerHud('❌ Reflection service offline.', 'error');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Proceed with PDF Export after authentication
  const proceedExportPDF = (entry: DiaryEntry) => {
    try {
      const doc = new jsPDF();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text(entry.title || "Untitled Diary Entry", 20, 20);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(110, 110, 110);
      doc.text(`Recorded: ${format(new Date(entry.date), 'EEEE, MMMM do, yyyy')}`, 20, 28);
      doc.text(`Category: ${entry.type.toUpperCase()}`, 20, 33);
      if (entry.tags && entry.tags.length > 0) {
        doc.text(`Tags: ${entry.tags.join(', ')}`, 20, 38);
      }

      doc.setDrawColor(210, 210, 210);
      doc.line(20, 42, 190, 42);

      doc.setFont("times", "normal");
      doc.setFontSize(12);
      doc.setTextColor(40, 40, 40);

      const parsedText = stripHtml(entry.content);
      const lines = doc.splitTextToSize(parsedText, 170);
      doc.text(lines, 20, 50);

      doc.save(`diary-${entry.id || 'export'}-${format(new Date(entry.date), 'yyyy-MM-dd')}.pdf`);
      triggerHud('📄 PDF document generated and downloaded!', 'success');
    } catch (err) {
      console.error(err);
      triggerHud('❌ PDF generation crashed.', 'error');
    }
  };

  // PDF Export
  const handleExportPDF = (entry: DiaryEntry) => {
    if (entry.isLocked) {
      setSecondaryLockPrompt(`Exporting "${entry.title}" to PDF requires secondary security verification.`);
      setSecondaryLockSuccessCallback(() => () => {
        proceedExportPDF(entry);
        setSecondaryLockOpen(false);
      });
      setSecondaryLockOpen(true);
    } else {
      proceedExportPDF(entry);
    }
  };

  // Backup & settings
  const handleSaveSettings = async () => {
    if (securityPin.length !== 4) {
      triggerHud('❌ Security lock PIN must be exactly 4 digits.', 'error');
      return;
    }
    if (secondaryPin.length !== 4) {
      triggerHud('❌ Secondary security PIN must be exactly 4 digits.', 'error');
      return;
    }

    try {
      await db.settings.put({ key: 'storage_pin', value: securityPin });
      await db.settings.put({ key: 'secondary_pin', value: secondaryPin });
      await db.settings.put({ key: 'lock_screen_enabled', value: lockScreenEnabled ? 'true' : 'false' });
      await db.settings.put({ key: 'adsense_pub_id', value: adsensePubId });
      await db.settings.put({ key: 'adsense_slot_id', value: adsenseSlotId });
      await db.settings.put({ key: 'adsense_enabled', value: adsenseEnabled });
      await db.settings.put({ key: 'adsense_test_mode', value: adsenseTestMode });

      triggerHud('⚙️ Master configurations successfully written.', 'success');
      setView('home');
    } catch (err) {
      console.error(err);
      triggerHud('❌ Settings transaction failed.', 'error');
    }
  };

  const handleCloudBackup = async () => {
    try {
      triggerHud('☁️ Uploading diary archive to secure vault...', 'info');
      const entriesList = await db.entries.toArray();
      const todosList = await db.todos.toArray();
      const settingsList = await db.settings.toArray();
      
      const backupPayload = {
        entries: entriesList,
        todos: todosList,
        settings: settingsList,
        timestamp: new Date().toISOString()
      };
      
      const encryptedString = btoa(JSON.stringify(backupPayload));
      
      const res = await fetch('/api/backup-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ encryptedData: encryptedString })
      });
      
      const data = await res.json();
      if (data.success) {
        triggerHud('✅ Archive synchronized successfully on private cloud.', 'success');
      } else {
        triggerHud('❌ Cloud backup rejected.', 'error');
      }
    } catch (err) {
      console.error(err);
      triggerHud('❌ Cloud synchronization offline.', 'error');
    }
  };

  const handleCloudRestore = async () => {
    try {
      triggerHud('☁️ Retrieving archive from cloud...', 'info');
      const res = await fetch('/api/backup-data');
      const data = await res.json();
      
      if (data.encryptedData) {
        const decrypted = JSON.parse(atob(data.encryptedData));
        
        if (window.confirm('Restore from cloud? This will overwrite your existing local entries.')) {
          await db.entries.clear();
          await db.todos.clear();
          
          for (const e of decrypted.entries) {
            e.date = new Date(e.date);
            e.updatedAt = new Date(e.updatedAt);
            await db.entries.add(e);
          }
          for (const t of decrypted.todos) {
            await db.todos.add(t);
          }
          for (const s of decrypted.settings) {
            await db.settings.put(s);
          }
          
          triggerHud('✅ Secret Diary archive restored from cloud!', 'success');
          setView('home');
        }
      } else {
        triggerHud('⚠️ No backup archive found in your private cloud yet.', 'info');
      }
    } catch (err) {
      console.error(err);
      triggerHud('❌ Cloud restoration failed.', 'error');
    }
  };

  return (
    <SecurityLock>
      <div className="min-h-screen bg-stone-50 flex flex-col font-sans relative">
        
        {/* Floating AI Helper Panel Trigger */}
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 p-4 bg-stone-900 text-stone-100 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 group cursor-pointer"
          title="Open AI Companion"
        >
          <Bot className="w-5 h-5 text-amber-400 group-hover:rotate-12 transition-transform" />
          <span className="text-xs font-semibold uppercase tracking-wider hidden md:inline">AI Companion</span>
        </button>

        {/* Dynamic HUD Alert Dialog */}
        <AnimatePresence>
          {hudMessage && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4"
            >
              <div className={`p-4 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md border ${
                hudMessageType === 'success' ? 'bg-stone-900/95 border-emerald-500/30 text-white' :
                hudMessageType === 'error' ? 'bg-stone-900/95 border-red-500/30 text-red-100' :
                'bg-stone-900/95 border-stone-700 text-stone-100'
              }`}>
                {hudMessageType === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> :
                 hudMessageType === 'error' ? <AlertCircle className="w-5 h-5 text-red-400 shrink-0" /> :
                 <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />}
                <p className="text-xs font-medium flex-1">{hudMessage}</p>
                <button onClick={() => setHudMessage(null)} className="text-stone-500 hover:text-stone-300">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Brand Header Banner */}
        <header className="border-b border-stone-200/60 bg-white/60 backdrop-blur-md sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-stone-900 flex items-center justify-center shadow-lg shadow-stone-900/10">
                <BookOpen className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h1 className="text-md font-serif font-black tracking-tight text-stone-900">Secret Diary</h1>
                <p className="text-[10px] text-stone-400 font-mono tracking-widest uppercase">Premium Private Chronicle</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => { setView('home'); setTagFilter(null); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${view === 'home' ? 'bg-stone-100 text-stone-900' : 'text-stone-500 hover:bg-stone-50'}`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-xl transition text-stone-500 hover:bg-stone-50`}
                title="Toggle Dark Mode"
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setView('settings')}
                className={`p-2 rounded-xl transition ${view === 'settings' ? 'bg-stone-100 text-stone-950' : 'text-stone-500 hover:bg-stone-50'}`}
                title="Edit Master Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Dynamic AdSense Top Banner */}
        <AdSenseBanner
          pubId={adsensePubId}
          slotId={adsenseSlotId}
          enabled={adsenseEnabled}
          testMode={adsenseTestMode}
        />

        {/* MAIN CONTAINER */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
          <AnimatePresence mode="wait">
            
            {/* VIEW 1: HOMEVIEW/DASHBOARD */}
            {view === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8"
              >
                {/* Left Side Filters Sidebar */}
                <div className="lg:col-span-3 space-y-6">
                  {/* Stats Block */}
                  <div className="bg-white p-5 rounded-3xl border border-stone-200/50 shadow-sm flex flex-col gap-3.5">
                    <span className="text-[10px] text-stone-400 uppercase tracking-widest font-mono font-bold block">📊 Archive Statistics</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-stone-50 p-3 rounded-2xl border border-stone-100">
                        <span className="text-stone-400 text-[10px] block font-mono">PAGES</span>
                        <span className="text-xl font-serif font-bold text-stone-900">{entries?.length || 0}</span>
                      </div>
                      <div className="bg-stone-50 p-3 rounded-2xl border border-stone-100">
                        <span className="text-stone-400 text-[10px] block font-mono">WORDS</span>
                        <span className="text-xl font-serif font-bold text-stone-900">{totalWords}</span>
                      </div>
                    </div>
                  </div>

                  {/* Filter Categories */}
                  <div className="bg-white p-5 rounded-3xl border border-stone-200/50 shadow-sm space-y-3">
                    <span className="text-[10px] text-stone-400 uppercase tracking-widest font-mono font-bold block">📁 Categories</span>
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => { setTypeFilter('all'); setIsPrivateFolderActive(false); setIsDeletedFolderActive(false); }}
                        className={`w-full py-2 px-3 rounded-xl text-left text-xs font-bold transition flex items-center justify-between cursor-pointer ${typeFilter === 'all' && !isPrivateFolderActive && !isDeletedFolderActive ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-50'}`}
                      >
                        <span className="flex items-center gap-2"><BookOpen className="w-3.5 h-3.5" /> All Chronicles</span>
                        <span className="text-[10px] font-mono opacity-60">{entries?.filter(e => !e.deletedAt).length || 0}</span>
                      </button>
                      <button
                        onClick={() => { setTypeFilter('journal'); setIsPrivateFolderActive(false); setIsDeletedFolderActive(false); }}
                        className={`w-full py-2 px-3 rounded-xl text-left text-xs font-bold transition flex items-center justify-between cursor-pointer ${typeFilter === 'journal' && !isPrivateFolderActive && !isDeletedFolderActive ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-50'}`}
                      >
                        <span className="flex items-center gap-2"><FileText className="w-3.5 h-3.5" /> Text Journals</span>
                        <span className="text-[10px] font-mono opacity-60">{entries?.filter(e => e.type === 'journal' && !e.deletedAt).length || 0}</span>
                      </button>
                      <button
                        onClick={() => { setTypeFilter('list'); setIsPrivateFolderActive(false); setIsDeletedFolderActive(false); }}
                        className={`w-full py-2 px-3 rounded-xl text-left text-xs font-bold transition flex items-center justify-between cursor-pointer ${typeFilter === 'list' && !isPrivateFolderActive && !isDeletedFolderActive ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-50'}`}
                      >
                        <span className="flex items-center gap-2"><ListTodo className="w-3.5 h-3.5" /> Checklists</span>
                        <span className="text-[10px] font-mono opacity-60">{entries?.filter(e => e.type === 'list' && !e.deletedAt).length || 0}</span>
                      </button>

                      <button
                        onClick={() => {
                          if (isPrivateFolderActive) {
                            setIsPrivateFolderActive(false);
                          } else {
                            setSecondaryLockPrompt("Accessing your Private Vault Folder requires secondary security verification.");
                            setSecondaryLockExpectedPin(secondaryPin);
                            setSecondaryLockSuccessCallback(() => () => {
                              setIsPrivateFolderActive(true);
                              setIsDeletedFolderActive(false);
                              setSecondaryLockOpen(false);
                            });
                            setSecondaryLockOpen(true);
                          }
                        }}
                        className={`w-full py-2 px-3 rounded-xl text-left text-xs font-bold transition flex items-center justify-between border cursor-pointer ${isPrivateFolderActive ? 'bg-red-50 border-red-200 text-red-600' : 'bg-transparent border-transparent text-stone-600 hover:bg-stone-50'}`}
                      >
                        <span className="flex items-center gap-2">
                          <Shield className={`w-3.5 h-3.5 ${isPrivateFolderActive ? 'text-red-500 animate-pulse' : 'text-stone-400'}`} />
                          <span>Private Vault Folder</span>
                        </span>
                        <span className="text-[10px] font-mono opacity-60">{entries?.filter(e => e.isLocked && !e.deletedAt).length || 0}</span>
                      </button>
                      
                      <button
                        onClick={() => { setIsDeletedFolderActive(true); setTypeFilter('all'); setIsPrivateFolderActive(false); }}
                        className={`w-full py-2 px-3 rounded-xl text-left text-xs font-bold transition flex items-center justify-between border cursor-pointer ${isDeletedFolderActive ? 'bg-stone-100 border-stone-200 text-stone-900' : 'bg-transparent border-transparent text-stone-600 hover:bg-stone-50'}`}
                      >
                        <span className="flex items-center gap-2">
                          <Trash2 className="w-3.5 h-3.5 text-stone-400" />
                          <span>Recently Deleted</span>
                        </span>
                        <span className="text-[10px] font-mono opacity-60">{entries?.filter(e => e.deletedAt).length || 0}</span>
                      </button>
                    </div>
                  </div>

                  {/* Tags Indexes */}
                  <div className="bg-white p-5 rounded-3xl border border-stone-200/50 shadow-sm space-y-3">
                    <span className="text-[10px] text-stone-400 uppercase tracking-widest font-mono font-bold block">🏷️ Topic Tags</span>
                    {uniqueTags.length === 0 ? (
                      <p className="text-[11px] text-stone-400 font-mono">No indexed tags yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {uniqueTags.map(tag => (
                          <button
                            key={tag}
                            onClick={() => setTagFilter(tag === tagFilter ? null : tag)}
                            className={`text-[10px] px-2.5 py-1 rounded-lg font-bold border transition ${tag === tagFilter ? 'bg-amber-500 border-amber-500 text-stone-950 shadow' : 'bg-stone-50 border-stone-200 text-stone-600 hover:border-stone-400'}`}
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Central Diary Chronicle Feed */}
                <div className="lg:col-span-6 space-y-6">
                  {/* Search and Action Row */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-3xl border border-stone-200/50 shadow-sm">
                    <div className="relative flex-1 w-full">
                      <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search secrets, tags, or written memories..."
                        className="w-full bg-stone-50 pl-10 pr-4 py-2.5 rounded-2xl text-xs text-stone-800 placeholder:text-stone-400 border border-stone-200/50 focus:outline-none focus:border-stone-400 transition"
                      />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
                      <button
                        onClick={() => handleCreateEntry('journal')}
                        title="New Journal Page (Ctrl+N)"
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 shadow transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Journal Page
                      </button>
                      <button
                        onClick={() => handleCreateEntry('list')}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 shadow transition cursor-pointer"
                      >
                        <ListTodo className="w-3.5 h-3.5" /> Checklist
                      </button>
                    </div>
                  </div>

                  {/* Cards Feed */}
                  <div className="space-y-4">
                    {filteredEntries.length === 0 ? (
                      <div className="bg-white rounded-3xl border border-stone-200/50 p-12 text-center shadow-sm">
                        <BookOpen className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                        <h3 className="font-serif font-bold text-lg text-stone-800">Your journal has no pages yet...</h3>
                        <p className="text-stone-400 text-xs mt-1.5 max-w-sm mx-auto leading-relaxed">
                          Document your private memories, draft lists, or capture logs today.
                        </p>
                      </div>
                    ) : (
                      filteredEntries.map(e => {
                        const words = stripHtml(e.content).trim().split(/\s+/).filter(Boolean).length;
                        return (
                          <motion.div
                            key={e.id}
                            layout
                            className="bg-white rounded-3xl border border-stone-200/50 hover:border-stone-300 p-6 shadow-sm hover:shadow transition-all duration-300 relative group"
                          >
                            <div className="flex items-start justify-between gap-4 mb-2.5">
                              <div>
                                <span className="text-[10px] text-stone-400 font-mono font-bold block mb-0.5">
                                  {format(new Date(e.date), 'EEEE, MMM d, yyyy • h:mm a')}
                                  {isDeletedFolderActive && e.deletedAt && (
                                    <span className="ml-2 text-red-500 font-bold">
                                      • Purges in {Math.max(0, 30 - Math.floor((new Date().getTime() - new Date(e.deletedAt).getTime()) / (1000 * 60 * 60 * 24)))} days
                                    </span>
                                  )}
                                </span>
                                <h3 
                                  onClick={() => handleOpenEntry(e)}
                                  className="text-md font-serif font-extrabold text-stone-900 group-hover:text-amber-600 transition cursor-pointer leading-tight flex items-center gap-1.5"
                                >
                                  {e.title}
                                  {e.isLocked && <Lock className="w-3.5 h-3.5 text-red-500 shrink-0 animate-pulse" />}
                                  {e.type === 'list' && <ListTodo className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                                </h3>
                              </div>

                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition duration-200">
                                {isDeletedFolderActive ? (
                                  <>
                                    <button
                                      onClick={() => handleRestoreEntry(e.id!)}
                                      className="p-1.5 text-stone-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition"
                                      title="Restore page"
                                    >
                                      <RefreshCw className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => proceedPermanentDeleteEntry(e.id!)}
                                      className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                      title="Permanently shred record"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleExportPDF(e)}
                                      className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition"
                                      title="Export page as PDF"
                                    >
                                      <Download className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteEntry(e.id!)}
                                      className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                      title="Move to Recently Deleted"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {e.isLocked ? (
                              <div 
                                onClick={() => handleOpenEntry(e)}
                                className="bg-stone-50 border border-stone-150 rounded-2xl p-4 mb-4 cursor-pointer hover:bg-stone-100/60 transition duration-200 flex items-center gap-3"
                              >
                                <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                                  <Lock className="w-4 h-4 text-red-500" />
                                </div>
                                <div className="space-y-0.5">
                                  <p className="text-stone-800 text-[11px] font-bold font-serif">Encrypted Secondary Vault Page</p>
                                  <p className="text-stone-400 text-[9px] leading-relaxed">Contents are hidden. Click to authenticate with PIN or biometric ID.</p>
                                </div>
                              </div>
                            ) : (
                              <p 
                                onClick={() => handleOpenEntry(e)}
                                className="text-stone-500 text-xs leading-relaxed line-clamp-3 mb-4 cursor-pointer"
                              >
                                {stripHtml(e.content) || 'Blank entry contents... Tap to write.'}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5 border-t border-stone-100">
                              <div className="flex items-center gap-1.5 text-[10px] text-stone-400 font-mono">
                                <span>{words} words</span>
                                <span>•</span>
                                <span className="capitalize">{e.type}</span>
                              </div>

                              {e.tags && e.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {e.tags.map(t => (
                                    <span key={t} className="text-[9px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                                      #{t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Right Chronology & Habit sidebar */}
                <div className="lg:col-span-3 space-y-6">
                  {/* Mood Chart */}
                  <MoodChart entries={entries || []} />

                  {/* Visual Calendar */}
                  <div className="bg-white p-5 rounded-3xl border border-stone-200/50 shadow-sm space-y-3">
                    <span className="text-[10px] text-stone-400 uppercase tracking-widest font-mono font-bold block flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-stone-500" /> Active Chronology
                    </span>
                    <p className="text-[10px] text-stone-500 font-sans leading-snug">
                      Your entries are automatically tracked. July 2026 logs:
                    </p>

                    <div className="pt-2">
                      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-stone-400 mb-1.5 font-mono">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                          <div key={i}>{d}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1 font-mono text-xs">
                        {Array.from({ length: 31 }).map((_, idx) => {
                          const dayNum = idx + 1;
                          const dayKey = format(new Date(2026, 6, dayNum), 'yyyy-MM-dd');
                          const entriesOnDay = entriesCountByDay[dayKey] || 0;
                          
                          return (
                            <div 
                              key={idx} 
                              className={`relative py-1.5 flex flex-col items-center justify-center rounded-lg transition-all ${
                                dayNum === 3 ? 'bg-stone-900 text-white font-black' : 'bg-stone-50 text-stone-700 hover:bg-stone-100'
                              }`}
                            >
                              <span>{dayNum}</span>
                              {entriesOnDay > 0 && (
                                <span className={`absolute bottom-0.5 w-1.5 h-1.5 rounded-full ${
                                  dayNum === 3 ? 'bg-amber-400' : 'bg-stone-800'
                                }`} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Habit Tracker */}
                  <HabitTracker />
                </div>
              </motion.div>
            )}

            {/* VIEW 2: EDITORVIEW */}
            {view === 'editor' && (
              <motion.div
                key="editor"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8"
              >
                {/* Main Edit Canvas Block */}
                <div className="lg:col-span-8 space-y-6">
                  {/* Navigation bar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-stone-200/50 shadow-sm">
                    <button
                      onClick={() => setView('home')}
                      className="flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-950 transition cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back to Dashboard
                    </button>

                    <div className="flex items-center gap-4">
                      <span className="text-xs font-mono font-bold text-stone-400">
                        {autoSaveStatus}
                      </span>
                      <button
                        onClick={handleSaveEntry}
                        title="Save Page (Ctrl+S)"
                        className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow transition cursor-pointer"
                      >
                        <Check className="w-4 h-4" /> Save Page
                      </button>
                    </div>
                  </div>

                  {/* Paper sheet input */}
                  <div className="bg-white rounded-3xl border border-stone-200/50 p-6 shadow-sm space-y-6">
                    <div className="space-y-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={entryTitle}
                            onChange={(e) => setEntryTitle(e.target.value)}
                            placeholder="Page Title: Give a name to this private memory..."
                            className="w-full text-xl font-serif font-black tracking-tight text-stone-900 placeholder:text-stone-200 border-b border-transparent focus:outline-none focus:border-stone-200 py-1 transition"
                          />
                        </div>
                        <div className="flex items-center gap-2 text-stone-400 text-xs font-mono shrink-0">
                          <CalendarDays className="w-4 h-4" />
                          <span>{format(entryDate, 'EEEE, MMM d, yyyy • h:mm a')}</span>
                        </div>
                      </div>

                      {/* Entry Type and Vault Lock Status Row */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        {/* Entry Type */}
                        <div className="flex items-center gap-2 p-1.5 bg-stone-100 rounded-2xl w-fit">
                          <button
                            type="button"
                            onClick={() => setEntryType('journal')}
                            className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${entryType === 'journal' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                          >
                            <FileText className="w-3.5 h-3.5" /> Text Journal Page
                          </button>
                          <button
                            type="button"
                            onClick={() => setEntryType('list')}
                            className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${entryType === 'list' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                          >
                            <ListTodo className="w-3.5 h-3.5" /> List & Checklist
                          </button>
                        </div>

                        {/* Lock Screen / Private Folder Status toggle */}
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              const newLocked = !entryIsLocked;
                              setEntryIsLocked(newLocked);
                              if (!newLocked) {
                                setEntryCustomPassword('');
                              }
                            }}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition border cursor-pointer shadow-sm ${
                              entryIsLocked 
                                ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100/75" 
                                : "bg-stone-50 border-stone-200 text-stone-500 hover:bg-stone-100 hover:text-stone-700"
                            }`}
                            title="Toggle Secondary Lock Layer"
                          >
                            {entryIsLocked ? (
                              <>
                                <Lock className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                                <span>Vault Encrypted (Requires Lock)</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5 text-stone-400" />
                                <span>Unencrypted (No Lock)</span>
                              </>
                            )}
                          </button>

                          {entryIsLocked && (
                            <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-2xl px-3 py-1.5 shadow-inner">
                              <span className="text-[10px] font-mono text-stone-500 font-bold uppercase tracking-wider">Custom Page PIN/Password:</span>
                              <input 
                                type="text"
                                value={entryCustomPassword}
                                onChange={(e) => setEntryCustomPassword(e.target.value)}
                                placeholder="Leave blank for Master PIN"
                                className="bg-transparent border-none text-xs text-stone-800 font-mono w-[160px] focus:outline-none"
                                maxLength={20}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-stone-100 pt-6">
                      {entryType === 'journal' ? (
                        <Editor
                          content={entryContent}
                          onChange={setEntryContent}
                          placeholder="What's on your mind? Document your private thoughts and reflections here..."
                          onAddDrawing={() => setActiveMediaCapture('drawing')}
                        />
                      ) : (
                        <div className="space-y-4">
                          <p className="text-xs text-stone-500 font-sans">
                            Create a structured checkable listing below:
                          </p>
                          <Checklist
                            items={todoItems}
                            onUpdate={setTodoItems}
                          />
                        </div>
                      )}
                    </div>

                    {/* Tags index builder */}
                    <div className="border-t border-stone-100 pt-6 space-y-3">
                      <span className="text-[10px] text-stone-400 uppercase tracking-widest font-mono font-bold block">🏷️ Page Tags</span>
                      <div className="flex flex-wrap items-center gap-2">
                        {entryTags.map(t => (
                          <span key={t} className="flex items-center gap-1 text-xs font-bold text-stone-600 bg-stone-100 pl-2.5 pr-1.5 py-1 rounded-xl">
                            #{t}
                            <button onClick={() => handleRemoveTag(t)} className="text-stone-400 hover:text-stone-600 p-0.5 rounded">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                            placeholder="Add tag..."
                            className="bg-transparent text-xs text-stone-700 border-b border-stone-200 focus:outline-none focus:border-stone-400 py-1 px-1 max-w-[100px]"
                          />
                          <button onClick={handleAddTag} className="text-xs font-bold text-stone-500 hover:text-stone-800 px-1 py-1">
                            Add
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Media Attachments Block */}
                    <div className="border-t border-stone-100 pt-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-stone-400 uppercase tracking-widest font-mono font-bold block">📎 Record Media Attachments</span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <label className="p-2 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-600 rounded-xl cursor-pointer transition flex items-center gap-1.5 text-xs font-bold">
                            <ImageIcon className="w-3.5 h-3.5" /> File Upload
                            <input type="file" onChange={handleFileUpload} className="hidden" accept="image/*,video/*,audio/*" />
                          </label>

                          <button
                            onClick={() => setActiveMediaCapture('audio')}
                            className="p-2 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-600 rounded-xl transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                          >
                            <Mic className="w-3.5 h-3.5 text-red-500 animate-pulse" /> Voice Memo
                          </button>

                          <button
                            onClick={() => setActiveMediaCapture('video')}
                            className="p-2 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-600 rounded-xl transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                          >
                            <Video className="w-3.5 h-3.5 text-blue-500" /> Cam Recorder
                          </button>

                          <button
                            onClick={() => setActiveMediaCapture('drawing')}
                            className="p-2 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-600 rounded-xl transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                          >
                            <Pen className="w-3.5 h-3.5 text-amber-500" /> Canvas Doodle
                          </button>
                        </div>
                      </div>

                      {/* Display active media recorders */}
                      <AnimatePresence>
                        {activeMediaCapture === 'audio' && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-mono font-bold text-red-500 uppercase tracking-widest">Voice Memo Audio recorder</span>
                              <button onClick={() => setActiveMediaCapture(null)} className="text-stone-400 hover:text-stone-600"><X className="w-4 h-4" /></button>
                            </div>
                            <AudioRecorder onCapture={handleCaptureAudio} onClose={() => setActiveMediaCapture(null)} />
                          </motion.div>
                        )}
                        {activeMediaCapture === 'video' && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-mono font-bold text-blue-500 uppercase tracking-widest">Camera video recorder</span>
                              <button onClick={() => setActiveMediaCapture(null)} className="text-stone-400 hover:text-stone-600"><X className="w-4 h-4" /></button>
                            </div>
                            <VideoRecorder onCapture={handleCaptureVideo} onClose={() => setActiveMediaCapture(null)} />
                          </motion.div>
                        )}
                        {activeMediaCapture === 'drawing' && (
                          <CanvasModal onClose={() => setActiveMediaCapture(null)} onSave={handleCaptureDrawing} />
                        )}
                      </AnimatePresence>

                      {/* Attached items list */}
                      {entryAttachments.length > 0 && (
                        <div className="pt-2">
                          <MediaCarousel 
                            attachments={entryAttachments} 
                            onDelete={handleDeleteAttachment} 
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Panel AI Helpers & AdSense Config */}
                <div className="lg:col-span-4 space-y-6">
                  {/* AI Copilot actions */}
                  <div className="bg-white p-6 rounded-3xl border border-stone-200/50 shadow-sm space-y-4">
                    <span className="text-[10px] text-stone-400 uppercase tracking-widest font-mono font-bold block flex items-center gap-1">
                      <Brain className="w-4 h-4 text-amber-500" /> AI Narrative Insights
                    </span>
                    <p className="text-[10px] text-stone-500 leading-normal">
                      Leverage advanced Gemini server models to parse emotional sentiment or compress timelines.
                    </p>

                    <div className="flex flex-col gap-2 pt-1.5">
                      <button
                        onClick={handleAnalyzeMood}
                        disabled={isAiLoading}
                        className="w-full py-2.5 bg-stone-50 hover:bg-stone-100 disabled:opacity-55 rounded-xl border border-stone-200 text-stone-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
                      >
                        <Heart className="w-3.5 h-3.5 text-red-500" /> Sentiment Analyzer
                      </button>

                      <button
                        onClick={handleGenerateSummary}
                        disabled={isAiLoading}
                        className="w-full py-2.5 bg-stone-50 hover:bg-stone-100 disabled:opacity-55 rounded-xl border border-stone-200 text-stone-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Compress & Summarize
                      </button>

                      <button
                        onClick={handlePastReflection}
                        disabled={isAiLoading}
                        className="w-full py-2.5 bg-stone-50 hover:bg-stone-100 disabled:opacity-55 rounded-xl border border-stone-200 text-stone-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-blue-500" /> Historical Reflection
                      </button>
                    </div>

                    {/* AI Outputs Block */}
                    <AnimatePresence>
                      {isAiLoading && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center py-4 gap-2 text-stone-500 text-xs">
                          <Bot className="w-4 h-4 animate-bounce text-amber-400" />
                          <span className="font-mono">Gemini model thinking...</span>
                        </motion.div>
                      )}

                      {!isAiLoading && aiMoodResult && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-4 bg-stone-50 border border-stone-100 rounded-2xl space-y-1">
                          <span className="text-[8px] text-stone-400 font-mono block">EMOTIONAL CLASSIFICATION</span>
                          <span className="text-xs font-black text-stone-800 capitalize flex items-center gap-1.5">
                            ❤️ {aiMoodResult.mood}
                          </span>
                          <p className="text-[10px] text-stone-500 leading-normal pt-1">{aiMoodResult.summary}</p>
                        </motion.div>
                      )}

                      {!isAiLoading && aiSummaryResult && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-4 bg-stone-50 border border-stone-100 rounded-2xl space-y-1">
                          <span className="text-[8px] text-stone-400 font-mono block">HIGHLIGHT SUMMARY REPORT</span>
                          <p className="text-[10px] text-stone-600 leading-relaxed italic">"{aiSummaryResult}"</p>
                        </motion.div>
                      )}

                      {!isAiLoading && aiReflectionResult && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="p-4 bg-stone-50 border border-stone-100 rounded-2xl space-y-1">
                          <span className="text-[8px] text-stone-400 font-mono block">HISTORICAL MATRIX PATTERNS</span>
                          <p className="text-[10px] text-stone-600 leading-relaxed">{aiReflectionResult}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Settings quick access banner */}
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-3xl text-xs text-stone-700 leading-relaxed flex items-start gap-3">
                    <Award className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-stone-950 block mb-0.5">AdSense Unit Configured</span>
                      If you've enabled advertisements inside Master Settings, responsive banners will display in real time across page frames.
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* VIEW 3: SETTINGSVIEW */}
            {view === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="max-w-2xl mx-auto space-y-6"
              >
                {/* Header Row */}
                <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-stone-200/50 shadow-sm">
                  <button
                    onClick={() => setView('home')}
                    className="flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-950 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" /> Cancel & Back
                  </button>

                  <button
                    onClick={handleSaveSettings}
                    className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow transition cursor-pointer"
                  >
                    <Check className="w-4 h-4" /> Save Configurations
                  </button>
                </div>

                {/* Settings Block Wrapper */}
                <div className="bg-white rounded-3xl border border-stone-200/50 p-6 shadow-sm space-y-6">
                  
                  {/* Lock Screen PIN Configuration */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-stone-100">
                    <div className="space-y-3">
                      <span className="text-[10px] text-stone-400 uppercase tracking-widest font-mono font-bold block flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-stone-500" /> 🔐 Vault Primary Security PIN
                      </span>
                      <p className="text-[10px] text-stone-500 leading-snug">
                        Protect your secret diary with a master PIN lockscreen. The default PIN is <strong className="text-stone-900">1234</strong>.
                      </p>

                      <div className="max-w-[200px]">
                        <input 
                          type="password" 
                          value={securityPin}
                          onChange={(e) => setSecurityPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="e.g. 1234"
                          className="w-full bg-stone-50 border border-stone-200 text-sm text-stone-800 p-2.5 rounded-xl text-center font-mono focus:outline-none focus:border-stone-400"
                          maxLength={4}
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={lockScreenEnabled}
                            onChange={(e) => setLockScreenEnabled(e.target.checked)}
                          />
                          <div className="w-9 h-5 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-stone-900"></div>
                          <span className="ml-2.5 text-[11px] font-bold text-stone-700">Require PIN on Startup</span>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <span className="text-[10px] text-stone-400 uppercase tracking-widest font-mono font-bold block flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-red-500" /> 🛡️ Vault Secondary Security PIN
                      </span>
                      <p className="text-[10px] text-stone-500 leading-snug">
                        Secure individual secret pages or private folders with a separate secondary security PIN. The default PIN is <strong className="text-stone-900">5678</strong>.
                      </p>

                      <div className="max-w-[200px]">
                        <input 
                          type="password" 
                          value={secondaryPin}
                          onChange={(e) => setSecondaryPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="e.g. 5678"
                          className="w-full bg-stone-50 border border-stone-200 text-sm text-stone-800 p-2.5 rounded-xl text-center font-mono focus:outline-none focus:border-stone-400"
                          maxLength={4}
                        />
                      </div>
                    </div>
                  </div>

                  {/* AdSense Settings */}
                  <div className="space-y-4 pb-6 border-b border-stone-100">
                    <span className="text-[10px] text-stone-400 uppercase tracking-widest font-mono font-bold block flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" /> 🛡️ Google AdSense Monetization
                    </span>
                    <p className="text-[10px] text-stone-500 leading-relaxed">
                      Inject responsive advertisement banner slots into the top frame. Customize publisher and unit parameters:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] text-stone-400 uppercase tracking-widest font-mono font-bold block">Publisher ID:</label>
                        <input 
                          type="text" 
                          value={adsensePubId}
                          onChange={(e) => setAdsensePubId(e.target.value)}
                          placeholder="e.g. ca-pub-123456789"
                          className="w-full bg-stone-50 border border-stone-200 text-xs text-stone-800 p-2.5 rounded-xl focus:outline-none focus:border-stone-400 font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] text-stone-400 uppercase tracking-widest font-mono font-bold block">Ad Unit Slot ID:</label>
                        <input 
                          type="text" 
                          value={adsenseSlotId}
                          onChange={(e) => setAdsenseSlotId(e.target.value)}
                          placeholder="e.g. 9876543210"
                          className="w-full bg-stone-50 border border-stone-200 text-xs text-stone-800 p-2.5 rounded-xl focus:outline-none focus:border-stone-400 font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-stone-50 p-3 rounded-2xl border border-stone-150">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-stone-800">Enable Advertisements</span>
                        <span className="text-[9px] text-stone-400">Render Google tags inside application head</span>
                      </div>
                      <input 
                        type="checkbox"
                        checked={adsenseEnabled}
                        onChange={(e) => setAdsenseEnabled(e.target.checked)}
                        className="w-4 h-4 rounded accent-stone-800 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between bg-stone-50 p-3 rounded-2xl border border-stone-150">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-stone-800">AdSense Test Mode</span>
                        <span className="text-[9px] text-stone-400">Display responsive layout previews if offline/empty</span>
                      </div>
                      <input 
                        type="checkbox"
                        checked={adsenseTestMode}
                        onChange={(e) => setAdsenseTestMode(e.target.checked)}
                        className="w-4 h-4 rounded accent-stone-800 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Cloud backups */}
                  <div className="space-y-3">
                    <span className="text-[10px] text-stone-400 uppercase tracking-widest font-mono font-bold block flex items-center gap-1.5">
                      <Cloud className="w-3.5 h-3.5 text-blue-500" /> ☁️ Vault Cloud Backups
                    </span>
                    <p className="text-[10px] text-stone-500 leading-snug">
                      Export and synchronize your diary pages safely onto our server vault to prevent device browser caches from being cleared.
                    </p>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button 
                        onClick={handleCloudBackup}
                        className="py-2.5 px-4 bg-stone-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-stone-800 cursor-pointer shadow transition animate-none"
                      >
                        <Cloud className="w-3.5 h-3.5" /> Synchronize Backup to Cloud
                      </button>

                      <button 
                        onClick={handleCloudRestore}
                        className="py-2.5 px-4 bg-amber-500 text-stone-950 rounded-xl text-xs font-black flex items-center gap-1.5 hover:bg-amber-400 cursor-pointer shadow transition animate-none"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Restore Archive from Cloud
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Companion chatbot drawer dialog */}
        {isChatOpen && <LiveChatDiary onClose={() => setIsChatOpen(false)} />}

        {/* Secondary security lockscreen portal */}
        <SecondaryLockModal
          isOpen={secondaryLockOpen}
          prompt={secondaryLockPrompt}
          expectedPin={secondaryLockExpectedPin}
          onSuccess={secondaryLockSuccessCallback}
          onClose={() => setSecondaryLockOpen(false)}
        />
      </div>
    </SecurityLock>
  );
}
