import { useEffect } from 'react';
import { useLocation } from 'wouter';

export function useScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    // Instantly jump to top when location changes
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
    });
  }, [location]);
}