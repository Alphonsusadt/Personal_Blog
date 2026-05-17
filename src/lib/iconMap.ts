/**
 * Centralized icon map — only icons used anywhere in the app.
 * Add new entries here when you add a Lucide icon name to a category
 * or the CategoriesManager picker.
 *
 * This avoids `import * as LucideIcons` which bundles 1600+ icons (~400KB).
 */
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Atom,
  BarChart3,
  Binary,
  Book,
  BookOpen,
  Brain,
  Calculator,
  Code,
  Cpu,
  Database,
  Feather,
  FileCode,
  Glasses,
  Globe,
  GraduationCap,
  Heart,
  Layers,
  Lightbulb,
  Mail,
  Microscope,
  PenTool,
  Puzzle,
  Rocket,
  Scale,
  Search,
  Shield,
  Sparkles,
  Star,
  Terminal,
  TreePine,
  User,
  Wrench,
  Zap,
  Tag,
} from 'lucide-react';

export const ICON_MAP: Record<string, LucideIcon> = {
  Activity,
  Atom,
  BarChart3,
  Binary,
  Book,
  BookOpen,
  Brain,
  Calculator,
  Code,
  Cpu,
  Database,
  Feather,
  FileCode,
  Glasses,
  Globe,
  GraduationCap,
  Heart,
  Layers,
  Lightbulb,
  Mail,
  Microscope,
  PenTool,
  Puzzle,
  Rocket,
  Scale,
  Search,
  Shield,
  Sparkles,
  Star,
  Terminal,
  TreePine,
  User,
  Wrench,
  Zap,
  Tag,
};

export function getLucideIcon(name: string): LucideIcon | undefined {
  return ICON_MAP[name];
}

export const AVAILABLE_ICON_NAMES = Object.keys(ICON_MAP);
