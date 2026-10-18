import { Link } from 'react-router-dom';
import { EmptyState, PageHeader } from '@/components/shared/Layout';

export function NotFound() {
  return (
    <>
      <PageHeader title="Not found" />
      <EmptyState
        title="There is no page at this address."
        action={
          <Link className="text-sm text-accent underline" to="/">
            Go to the dashboard
          </Link>
        }
      />
    </>
  );
}
