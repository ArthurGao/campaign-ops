import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AppShell() {
  return (
    <div className="flex min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <Sidebar />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main id="main" className="mx-auto w-full max-w-[96rem] flex-1 px-4 pb-16 pt-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
