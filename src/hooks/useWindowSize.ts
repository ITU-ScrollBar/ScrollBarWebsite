import { useEffect, useState } from "react";

// A media query rather than window.innerWidth: reading innerWidth right after React commits
// forces a synchronous layout (~85 ms on a slow phone), and the query only fires at 768px.
const desktopQuery = () => window.matchMedia("(min-width: 768px)");

// Read on the first render so phones get the mobile layout right away, not the
// desktop one and two re-renders. Only crossing the breakpoint re-renders.
export function useWindowSize() {
  const [isMobile, setIsMobile] = useState(() => !desktopQuery().matches);

  useEffect(() => {
    const query = desktopQuery();
    const handleChange = () => setIsMobile(!query.matches);
    query.addEventListener("change", handleChange);
    handleChange(); // In case the width crossed 768px between the first render and now.
    return () => query.removeEventListener("change", handleChange);
  }, []);

  return { isMobile };
}
