import { NavLink } from 'react-router-dom';
import {
  Bot,
  CalendarDays,
  ClipboardCheck,
  Route,
  ClipboardList,
  Clapperboard,
  FileCheck2,
  Gauge,
  KanbanSquare,
  Megaphone,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { useNavCounts } from './useNavCounts';
import { copy } from '@/lib/copy';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/store/ui.store';

const ITEMS = [
  { to: '/', label: copy.nav.dashboard, icon: Gauge, count: null },
  { to: '/workflow', label: copy.nav.workflow, icon: Route, count: null },
  { to: '/week', label: copy.nav.week, icon: CalendarDays, count: null },
  { to: '/review', label: copy.nav.review, icon: ClipboardCheck, count: null },
  { to: '/fact-sheet', label: copy.nav.facts, icon: FileCheck2, count: 'facts' },
  { to: '/evidence', label: copy.nav.evidence, icon: ClipboardList, count: 'evidence' },
  { to: '/tasks', label: copy.nav.tasks, icon: KanbanSquare, count: 'tasks' },
  { to: '/agents', label: copy.nav.agents, icon: Bot, count: 'agents' },
  { to: '/factory', label: copy.nav.factory, icon: Clapperboard, count: 'factory' },
  { to: '/publish', label: copy.nav.publish, icon: Megaphone, count: 'publish' },
  { to: '/leads', label: copy.nav.leads, icon: Users, count: 'leads' },
  { to: '/settings', label: copy.nav.settings, icon: Settings, count: 'settings' },
] as const;

export function Sidebar() {
  const counts = useNavCounts();
  const { navOpen, setNavOpen } = useUiStore();
  return (
    <>
      {navOpen ? (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-rail/40 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      ) : null}
      <nav
        aria-label="Main"
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-rail text-rail-ink transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          navOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-start justify-between gap-2 px-4 pb-4 pt-4">
          <div>
            <p className="text-[1.05rem] font-bold tracking-[-0.01em]">{copy.app.name}</p>
            <p className="mt-0.5 text-xs leading-snug text-rail-muted">
              Demo Travel (NZ)
              <br />
              China Tour 2027
            </p>
          </div>
          <button
            className="rounded-sm p-1 text-rail-muted hover:text-rail-ink lg:hidden"
            aria-label="Close navigation"
            onClick={() => setNavOpen(false)}
          >
            <X className="size-4" />
          </button>
        </div>
        <ul className="grid gap-px px-2">
          {ITEMS.map(({ to, label, icon: Icon, count }) => {
            const c = count ? counts[count] : undefined;
            return (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === '/'}
                  onClick={() => setNavOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-md px-2.5 py-[0.45rem] text-sm transition-colors duration-150',
                      isActive
                        ? 'bg-rail-2 font-semibold text-white'
                        : 'text-rail-ink/85 hover:bg-white/6 hover:text-white',
                    )
                  }
                >
                  <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
                  <span className="flex-1">{label}</span>
                  {c && c.n > 0 ? (
                    <span
                      title={c.title}
                      className={cn(
                        'min-w-5 rounded-sm px-1 text-center font-mono text-[0.68rem] font-semibold leading-[1.1rem]',
                        c.alert ? 'bg-rail-alert text-rail-alert-ink' : 'bg-white/12 text-rail-ink',
                      )}
                    >
                      {c.n}
                      <span className="sr-only"> {c.title}</span>
                    </span>
                  ) : null}
                </NavLink>
              </li>
            );
          })}
        </ul>
        <p className="mt-auto border-t border-white/10 px-4 py-3 text-[0.72rem] leading-snug text-rail-muted">
          Agents are read-only: they draft and suggest, and a person accepts each item.
        </p>
      </nav>
    </>
  );
}
