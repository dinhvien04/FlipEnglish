import { CEFRLevel } from '../../types';

export interface LevelInfo {
  level: CEFRLevel;
  title: string;
  subtitle: string;
  description: string;
  totalLessons: number;
  estimatedItems: string;
  color: string;
  accentBg: string;
  borderAccent: string;
  badgeBg: string;
  heroGradient: string;
}

export const CEFR_LEVELS_INFO: Record<CEFRLevel, LevelInfo> = {
  A1: {
    level: 'A1',
    title: 'Beginner',
    subtitle: '10 Lessons • ~100 Words',
    description: 'Build your core foundation with essential concrete vocabulary, basic everyday objects, and polite conversational phrases.',
    totalLessons: 10,
    estimatedItems: '~100 Words',
    color: 'emerald',
    accentBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    borderAccent: 'border-emerald-500',
    badgeBg: 'bg-emerald-600 text-white',
    heroGradient: 'from-emerald-950 via-slate-900 to-emerald-900',
  },
  A2: {
    level: 'A2',
    title: 'Elementary',
    subtitle: '10 Lessons • ~100 Words',
    description: 'Expand to everyday life situations, travel encounters, routine social interactions, and expressive descriptive vocabulary.',
    totalLessons: 10,
    estimatedItems: '~100 Words',
    color: 'sky',
    accentBg: 'bg-sky-50 text-sky-700 border-sky-200',
    borderAccent: 'border-sky-500',
    badgeBg: 'bg-sky-600 text-white',
    heroGradient: 'from-sky-950 via-slate-900 to-cyan-900',
  },
  B1: {
    level: 'B1',
    title: 'Intermediate',
    subtitle: '12 Lessons • ~120 Items',
    description: 'Master practical abstract topics, technology, career conversations, problem solving, and common multi-word expressions.',
    totalLessons: 12,
    estimatedItems: '~120 Items',
    color: 'indigo',
    accentBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    borderAccent: 'border-indigo-500',
    badgeBg: 'bg-indigo-600 text-white',
    heroGradient: 'from-indigo-950 via-slate-900 to-violet-950',
  },
  B2: {
    level: 'B2',
    title: 'Upper Intermediate',
    subtitle: '14 Lessons • ~150 Items',
    description: 'Develop fluency with natural collocations, workplace terminology, sustainability debates, and high-impact sentence structures.',
    totalLessons: 14,
    estimatedItems: '~150 Items',
    color: 'purple',
    accentBg: 'bg-purple-50 text-purple-700 border-purple-200',
    borderAccent: 'border-purple-500',
    badgeBg: 'bg-purple-600 text-white',
    heroGradient: 'from-purple-950 via-slate-900 to-indigo-950',
  },
  C1: {
    level: 'C1',
    title: 'Advanced',
    subtitle: '14 Collections • ~160 Items',
    description: 'Achieve precision for university academia, corporate leadership, sophisticated writing, idiomatic English, and subtle nuance.',
    totalLessons: 14,
    estimatedItems: '~160 Items',
    color: 'rose',
    accentBg: 'bg-rose-50 text-rose-700 border-rose-200',
    borderAccent: 'border-rose-500',
    badgeBg: 'bg-rose-600 text-white',
    heroGradient: 'from-rose-950 via-slate-900 to-amber-950',
  },
  C2: {
    level: 'C2',
    title: 'Proficiency',
    subtitle: '12 Collections • ~140 Items',
    description: 'Refine native-level command with shades of meaning, register distinctions, literary eloquence, and persuasive rhetoric.',
    totalLessons: 12,
    estimatedItems: '~140 Items',
    color: 'amber',
    accentBg: 'bg-amber-50 text-amber-800 border-amber-200',
    borderAccent: 'border-amber-500',
    badgeBg: 'bg-amber-600 text-white',
    heroGradient: 'from-amber-950 via-slate-900 to-orange-950',
  },
};

export const CEFR_LEVELS: LevelInfo[] = Object.values(CEFR_LEVELS_INFO);

export const CONTENT_TYPE_FILTERS = [
  { id: 'all', label: 'All Items', icon: 'Layers' },
  { id: 'words', label: 'Words', icon: 'BookOpen' },
  { id: 'phrases', label: 'Phrases', icon: 'MessageSquare' },
  { id: 'collocations', label: 'Collocations', icon: 'Sparkles' },
  { id: 'phrasal-verbs', label: 'Phrasal Verbs', icon: 'ArrowUpRight' },
  { id: 'idioms', label: 'Idioms', icon: 'Lightbulb' },
  { id: 'academic', label: 'Academic', icon: 'GraduationCap' },
  { id: 'business', label: 'Business', icon: 'Briefcase' },
];
