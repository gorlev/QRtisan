/** Varsayılan tasarım değerleri. */

import type { DesignState } from './types';

export const DEFAULT_DESIGN: DesignState = {
  fg: '#252338',
  bg: '#FFFFFF',
  transparentBg: false,
  dot: 'rounded',
  eyeOuter: 'rounded',
  eyeInner: 'rounded',
  frame: 'none',
  caption: '',
  frameRadius: 45,
  quietZone: 4,
  errorLevel: 'auto',
  logo: null,
};

export const EXPORT_WIDTHS = [512, 1024, 2048] as const;
export const DEFAULT_EXPORT_WIDTH = 1024;
export const SVG_REFERENCE_WIDTH = 1000;
