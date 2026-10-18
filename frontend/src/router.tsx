/* eslint-disable react-refresh/only-export-components -- route table module; lazy pages are not hot-reload boundaries */
import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { SkeletonRows } from '@/components/ui/skeleton';
import { NotFound } from '@/pages/NotFound';

const Dashboard = lazy(() => import('@/pages/dashboard'));
const Workflow = lazy(() => import('@/pages/workflow'));
const Week = lazy(() => import('@/pages/week'));
const FactSheet = lazy(() => import('@/pages/fact-sheet'));
const Evidence = lazy(() => import('@/pages/evidence'));
const Tasks = lazy(() => import('@/pages/tasks'));
const Agents = lazy(() => import('@/pages/agents'));
const RunPage = lazy(() => import('@/pages/agents/RunPage'));
const Factory = lazy(() => import('@/pages/factory'));
const Publish = lazy(() => import('@/pages/publish'));
const Leads = lazy(() => import('@/pages/leads'));
const SettingsPage = lazy(() => import('@/pages/settings'));

const page = (node: ReactNode) => <Suspense fallback={<SkeletonRows rows={8} />}>{node}</Suspense>;

export const router = createBrowserRouter(
  [
    {
      element: <AppShell />,
      children: [
        { path: '/', element: page(<Dashboard />) },
        { path: '/workflow', element: page(<Workflow />) },
        { path: '/week', element: page(<Week />) },
        { path: '/fact-sheet', element: page(<FactSheet />) },
        { path: '/evidence', element: page(<Evidence />) },
        { path: '/tasks', element: page(<Tasks />) },
        { path: '/agents', element: page(<Agents />) },
        { path: '/agents/runs/:runId', element: page(<RunPage />) },
        { path: '/factory', element: page(<Factory />) },
        { path: '/factory/:briefId', element: page(<Factory />) },
        { path: '/publish', element: page(<Publish />) },
        { path: '/publish/:packageId', element: page(<Publish />) },
        { path: '/leads', element: page(<Leads />) },
        { path: '/settings', element: page(<SettingsPage />) },
        { path: '*', element: <NotFound /> },
      ],
    },
  ],
  {
    basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/',
    future: {
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    },
  },
);
