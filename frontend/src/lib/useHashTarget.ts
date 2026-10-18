import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const WAIT_MS = 5000;
const FLASH_MS = 1600;

/**
 * Scroll to the element named by the URL fragment and flash it, waiting for it to render
 * (pages load their data first). Deep links from the source workflow rely on this:
 * /settings#scope, /agents#agent-outbound, /workflow#ex-7, /fact-sheet?fact=FS-04#fact-FS-04.
 */
export function useHashTarget(): void {
  const { pathname, search, hash } = useLocation();
  useEffect(() => {
    const id = decodeURIComponent(hash.slice(1));
    if (!id) return;
    let flashTimer: ReturnType<typeof setTimeout> | undefined;
    const reveal = (el: HTMLElement) => {
      el.scrollIntoView({ block: 'start' });
      el.setAttribute('data-target-flash', '');
      flashTimer = setTimeout(() => el.removeAttribute('data-target-flash'), FLASH_MS);
    };
    const found = document.getElementById(id);
    if (found) {
      reveal(found);
      return () => clearTimeout(flashTimer);
    }
    const observer = new MutationObserver(() => {
      const el = document.getElementById(id);
      if (!el) return;
      observer.disconnect();
      reveal(el);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const giveUp = setTimeout(() => observer.disconnect(), WAIT_MS);
    return () => {
      observer.disconnect();
      clearTimeout(giveUp);
      clearTimeout(flashTimer);
    };
  }, [pathname, search, hash]);
}
