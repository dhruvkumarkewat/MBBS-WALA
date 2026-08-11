import {
  LayoutDashboard,
  MessageSquare,
  Sparkles,
  Crosshair,
  Map,
  Search,
  Columns2,
  Heart,
  CalendarCheck2,
  Grid3x3,
  FolderOpen,
  CloudDownload,
  ClipboardList,
  BellRing,
  Crown,
  CircleUserRound,
  SlidersHorizontal,
  Headphones,
  LogOut,
  Gift,
  Wallet,
  Trophy,
  Medal,
  Target,
  Ticket,
  TrendingUp,
  History,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  badge?: string | number;
  section?: string;
}

export const mainNav: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, section: 'Overview' },
  { label: 'Chat with Counselor', path: '/dashboard/chat', icon: MessageSquare, badge: 'New', section: 'Overview' },
  { label: 'AI Assistant', path: '/dashboard/ai', icon: Sparkles, badge: 'New', section: 'Overview' },
  { label: 'College Predictor', path: '/dashboard/predictor', icon: Crosshair, section: 'Tools' },
  { label: 'Closing Rank Map', path: '/dashboard/competition-map', icon: Map, badge: 'New', section: 'Tools' },
  { label: 'College Finder', path: '/dashboard/finder', icon: Search, section: 'Tools' },
  { label: 'Compare', path: '/dashboard/compare', icon: Columns2, section: 'Tools' },
  { label: 'Saved Colleges', path: '/dashboard/saved', icon: Heart, section: 'Tools' },
  { label: 'Counselling', path: '/dashboard/counselling', icon: CalendarCheck2, section: 'Admissions' },
  { label: 'Seat Matrix', path: '/dashboard/seat-matrix', icon: Grid3x3, section: 'Admissions' },
  { label: 'Refer & Earn', path: '/dashboard/refer', icon: Gift, badge: '₹500', section: 'Rewards' },
  { label: 'Wallet', path: '/dashboard/wallet', icon: Wallet, section: 'Rewards' },
  { label: 'Leaderboard', path: '/dashboard/leaderboard', icon: Trophy, section: 'Rewards' },
  { label: 'Badges', path: '/dashboard/badges', icon: Medal, section: 'Rewards' },
  { label: 'Challenges', path: '/dashboard/challenges', icon: Target, section: 'Rewards' },
  { label: 'Coupons', path: '/dashboard/coupons', icon: Ticket, section: 'Rewards' },
  { label: 'Earnings', path: '/dashboard/earnings', icon: TrendingUp, section: 'Rewards' },
  { label: 'Withdrawals', path: '/dashboard/withdrawals', icon: History, section: 'Rewards' },
  { label: 'Notifications', path: '/dashboard/notifications', icon: BellRing, badge: 3, section: 'Account' },
  { label: 'Subscription', path: '/dashboard/subscription', icon: Crown, section: 'Account' },
  { label: 'Profile', path: '/dashboard/profile', icon: CircleUserRound, section: 'Account' },
  { label: 'Settings', path: '/dashboard/settings', icon: SlidersHorizontal, section: 'Account' },
  { label: 'Support', path: '/dashboard/support', icon: Headphones, section: 'Account' },
];

export const logoutItem: NavItem = {
  label: 'Logout',
  path: '/login',
  icon: LogOut,
};

export const sections = ['Overview', 'Tools', 'Admissions', 'Rewards', 'Account'] as const;
