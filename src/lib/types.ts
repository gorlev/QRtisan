/** QRtisan — paylaşılan tip tanımları. */

export type ContentMode = 'url' | 'text' | 'email' | 'wifi';

export type FrameType =
  | 'none'
  | 'border'
  | 'labelBottom'
  | 'labelTop'
  | 'bubble'
  | 'corners'
  | 'badge';

export type DotType =
  | 'square'
  | 'rounded'
  | 'extra-rounded'
  | 'dots'
  | 'classy'
  | 'classy-rounded'
  | 'diamond';

export type EyeOuterType = 'square' | 'rounded' | 'dot';
export type EyeInnerType = 'square' | 'rounded' | 'dot';

export type ErrorLevel = 'L' | 'M' | 'Q' | 'H';
export type ErrorLevelChoice = 'auto' | ErrorLevel;

/** QR matrisi (modül ızgarası). node-qrcode'dan üretilir; asla taklit edilmez. */
export interface QrMatrix {
  /** Kenar uzunluğu (modül sayısı), sessiz alan hariç. */
  size: number;
  /** Satır öncelikli (y * size + x), 1 = koyu modül. */
  data: Uint8Array;
}

export interface WifiFields {
  ssid: string;
  password: string;
  encryption: 'WPA' | 'WEP' | 'nopass';
  hidden: boolean;
}

export interface EmailFields {
  to: string;
  subject: string;
  body: string;
}

export interface ContentFields {
  url: string;
  text: string;
  email: EmailFields;
  wifi: WifiFields;
}

export interface LogoState {
  /** data: URL — yalnızca tarayıcı belleğinde tutulur. */
  dataUrl: string;
  fileName: string;
  width: number;
  height: number;
  /** QR genişliğine oran (0.14 – 0.32). */
  size: number;
  /** Logo çevresindeki boşluk, QR genişliğine oran (0.015 – 0.08). */
  padding: number;
  /** Altındaki modülleri temizle. */
  clearModules: boolean;
}

export interface DesignState {
  fg: string;
  bg: string;
  transparentBg: boolean;
  dot: DotType;
  eyeOuter: EyeOuterType;
  eyeInner: EyeInnerType;
  frame: FrameType;
  caption: string;
  /** 0 – 100 arası çerçeve yuvarlaklığı. */
  frameRadius: number;
  /** Sessiz alan, modül cinsinden. */
  quietZone: number;
  errorLevel: ErrorLevelChoice;
  logo: LogoState | null;
}

export interface StudioState {
  mode: ContentMode;
  content: ContentFields;
  design: DesignState;
}

export type MeasureText = (text: string, fontSize: number, weight: number) => number;
