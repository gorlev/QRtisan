/** Sahne (scene) tip tanımları — tuval ve SVG çizicilerinin ortak ara gösterimi. */

export interface ScenePath {
  d: string;
  fill: string;
  fillRule?: 'nonzero' | 'evenodd';
}

export interface SceneStroke {
  d: string;
  color: string;
  width: number;
  cap?: 'butt' | 'round' | 'square';
  join?: 'miter' | 'round' | 'bevel';
}

export interface SceneRect {
  x: number;
  y: number;
  w: number;
  h: number;
  rx?: number;
  fill: string;
}

export interface SceneImage {
  href: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SceneText {
  text: string;
  x: number;
  y: number;
  size: number;
  fill: string;
  weight: number;
  family: string;
  anchor: 'start' | 'middle' | 'end';
}

export interface Scene {
  width: number;
  height: number;
  /** null = şeffaf. */
  background: string | null;
  paths: ScenePath[];
  strokes: SceneStroke[];
  rects: SceneRect[];
  images: SceneImage[];
  texts: SceneText[];
}
