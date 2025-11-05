import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';

interface UseHashNavigationReturn {
  handleSectionLink: (e: React.MouseEvent<HTMLAnchorElement>, sectionHash: string) => void;
}

/**
 * Hook that handles hash navigation for section links.
 * - Automatically navigates to hash elements when the location hash changes
 * - Provides a handler for section link clicks that works from any page
 */
export const useHashNavigation = (): UseHashNavigationReturn => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHomePage = location.pathname === "/";

  // Navigate to hash element when hash changes
  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (hash) {
      // Use requestAnimationFrame twice to ensure DOM is fully rendered
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const element = document.getElementById(hash);
          if (element) {
            window.location.hash = hash;
          }
        });
      });
    }
  }, [location.hash]);

  const handleSectionLink = (e: React.MouseEvent<HTMLAnchorElement>, sectionHash: string) => {
    if (isHomePage) {
      // On home page, let default behavior work (native hash navigation)
      return;
    }
    // On other pages, navigate to home with hash
    e.preventDefault();
    navigate(`/#${sectionHash}`);
  };

  return { handleSectionLink };
};

