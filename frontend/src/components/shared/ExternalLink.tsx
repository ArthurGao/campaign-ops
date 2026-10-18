import type { ReactNode } from 'react';
import { ExternalLink as Icon } from 'lucide-react';
import { safeHttpUrl } from '@/lib/url';
import { cn } from '@/lib/utils';

/** Opens http(s) URLs in a new tab; any other value is shown as plain text, never as a link. */
export function ExternalLink({
  href,
  children,
  className,
  icon = true,
}: {
  href?: string;
  children: ReactNode;
  className?: string;
  icon?: boolean;
}) {
  const safe = safeHttpUrl(href);
  if (!safe) return <span className={className}>{children}</span>;
  return (
    <a
      href={safe}
      target="_blank"
      rel="noreferrer noopener"
      className={cn('inline-flex items-center gap-1 text-accent hover:underline', className)}
    >
      {children}
      {icon ? <Icon className="size-3" aria-hidden /> : null}
    </a>
  );
}
