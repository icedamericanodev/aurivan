/** Study symbols share the app's existing icon vocabulary and add no image assets. */
import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react-native';
import type { BadgeId } from '../engine/milestones';
import { ArrowRight, BadgeIcon, BookOpen, BookmarkCheck, Brain, CalendarCheck, ChartColumn, Check, Clock, Flag, Gauge, LayoutGrid, Library, Lightbulb, ListChecks, NotebookPen, RefreshCw, RotateCcw, Scale, Search, ShieldCheck, Target, Timer } from './icons';

const SYMBOL: Record<BadgeId, ComponentType<LucideProps>> = {
  'first-foothold': Flag,
  'topic-clear': BookOpen,
  'ten-topics': Library,
  'firm-footing': ShieldCheck,
  'whole-map': LayoutGrid,
  'loop-closed': RotateCcw,
  'slip-spotter': NotebookPen,
  'long-memory': Brain,
  graduate: BookmarkCheck,
  'know-what-you-know': Target,
  'dress-rehearsal': ListChecks,
  'on-pace': Clock,
  'mindset-shift': Lightbulb,
  rooted: CalendarCheck,
  'took-root': RefreshCw,
  'fresh-start': ArrowRight,
  'snare-wise': Search,
  'even-keel': Scale,
  'signpost-reader': ListChecks,
  'myth-clearer': Check,
  'sure-footed-pace': Timer,
  'whole-grove': ChartColumn,
  'back-on-path': Gauge,
};

export function BadgeEmblem({ badge, size, color }: { badge: string; size: number; color: string }) {
  const Icon = SYMBOL[badge as BadgeId] ?? BadgeIcon;
  return <Icon size={size} color={color} strokeWidth={1.6} />;
}
