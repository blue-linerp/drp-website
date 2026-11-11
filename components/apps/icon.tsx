import {
  BadgeCheck,
  Briefcase,
  Car,
  FileText,
  Flame,
  Gavel,
  HeartPulse,
  KeyRound,
  Mic,
  Scale,
  Shield,
  Star,
  Store,
  Users,
  Video,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export const APP_ICONS: Record<string, LucideIcon> = {
  "key-round": KeyRound,
  shield: Shield,
  "heart-pulse": HeartPulse,
  scale: Scale,
  gavel: Gavel,
  "badge-check": BadgeCheck,
  flame: Flame,
  store: Store,
  video: Video,
  briefcase: Briefcase,
  car: Car,
  mic: Mic,
  star: Star,
  users: Users,
  wrench: Wrench,
  "file-text": FileText,
};

export function AppIcon({ name, size = 22, className }: { name: string; size?: number; className?: string }) {
  const Icon = APP_ICONS[name] ?? FileText;
  return <Icon size={size} className={className} aria-hidden />;
}
