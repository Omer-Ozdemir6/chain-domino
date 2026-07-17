import { useCallback, useRef, useState } from 'react';

/**
 * Tracks an element's content-box size via ResizeObserver. Uses a callback ref (not
 * useRef + useLayoutEffect) so a component can swap which DOM node it's watching — e.g. a
 * conditionally-rendered subtree — without ever unmounting; a callback ref reliably re-fires
 * the observer setup on that swap, a plain ref would silently keep watching the stale node.
 */
export function useElementSize<T extends HTMLElement>() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);

  const ref = useCallback((el: T | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    observerRef.current = observer;
  }, []);

  return { ref, size };
}
