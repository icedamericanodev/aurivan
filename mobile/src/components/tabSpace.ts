/**
 * The floating tab bar's footprint, shared by the bar (components/tabBar.tsx) and every tab
 * screen (components/ui.tsx Screen). Its own tiny module so the two never import each other.
 */
import { createContext } from 'react';

/**
 * How far a tab screen's content must reach so its end scrolls clear of the floating bar:
 * the bar's height plus the space under it. 0 outside the tab navigator (pushed screens have no bar).
 */
export const TabSpaceContext = createContext(0);
/** The bar reports its measured height here (larger text makes it taller than 64). */
export const TabHeightContext = createContext<(h: number) => void>(() => {});
