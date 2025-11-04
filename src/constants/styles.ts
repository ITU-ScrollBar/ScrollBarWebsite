import { COLORS } from './colors';

export const COMMON_STYLES = {
  // Flexbox patterns
  flexCenter: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
  },
  
  flexCenterJustify: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Text base styles
  textBase: {
    lineHeight: 1,
  },

  textYellow: {
    color: COLORS.yellow,
    lineHeight: 1,
  },

  // Card and overlay patterns
  cardBase: {
    position: 'relative' as const,
    display: 'flex' as const,
    flexDirection: 'column' as const,
    justifyContent: 'center' as const,
    backgroundSize: 'cover' as const,
    backgroundPosition: 'center' as const,
  },

  overlayBase: {
    zIndex: 2,
    backgroundColor: COLORS.darkGrayOverlay,
    borderRadius: '10px',
    display: 'flex' as const,
    flexDirection: 'column' as const,
    position: 'relative' as const,
    overflow: 'hidden' as const,
    boxSizing: 'border-box' as const,
  },

  // Background image overlay
  imageOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.blackOverlay50,
    zIndex: 1,
  },
} as const;
