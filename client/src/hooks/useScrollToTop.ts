import { useEffect } from 'react';
import { useLocation } from 'wouter';

export function useScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    // Keep scroll behavior minimal and fast
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location]);
}