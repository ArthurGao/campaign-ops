import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { toast, Toaster } from 'sonner';
import type { ApiError } from '@/api/client';
import { TooltipProvider } from '@/components/ui/tooltip';
import { router } from './router';

/** Blocked actions toast `message` globally; the clicked control renders `hint` inline. */
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5_000, refetchOnWindowFocus: false, retry: 1 } },
  mutationCache: new MutationCache({
    onError: (error) => {
      const e = error as ApiError;
      toast.error(e.message, { description: e.hint });
    },
  }),
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
        <Toaster
          position="bottom-right"
          closeButton
          toastOptions={{
            classNames: {
              toast: 'rounded-md border border-rule bg-surface text-ink shadow-overlay font-sans',
              title: 'text-sm font-semibold',
              description: 'text-[0.8125rem] text-ink-2',
              error: 'border-bad/40',
              success: 'border-ok/40',
            },
          }}
        />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
