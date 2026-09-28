import { useEffect, useState } from "react";

const isMobileWidth = () => window.innerWidth < 768;

// Read on the first render so phones get the mobile layout right away, not the
// desktop one and two re-renders. Only crossing the breakpoint re-renders.
export function useWindowSize() {
  const [isMobile, setIsMobile] = useState(isMobileWidth);

  useEffect(() => {
    const handleResize = () => setIsMobile(isMobileWidth());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return { isMobile };
}
