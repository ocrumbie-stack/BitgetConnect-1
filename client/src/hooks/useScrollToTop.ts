import { useEffect } from 'react';
import { useLocation } from 'wouter';

export function useScrollToTop() {
  const [location] = useLocation();
  
  useEffect(() => {
    // Only scroll to top if we're not already at the top
    if (window.scrollY > 0) {
      window.scrollTo(0, 0);
    }
  }, [location]);
}