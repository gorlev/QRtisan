/**
 * fontkit için minimal tip bildirimi (paket tip dosyası yayınlamıyor).
 * Yalnızca testlerde glif kapsamı/ilerleme genişliği ölçmek için kullanılır.
 */
declare module 'fontkit' {
  export interface FontkitGlyph {
    id: number;
    advanceWidth: number;
  }

  export interface FontkitFont {
    familyName: string;
    unitsPerEm: number;
    glyphForCodePoint(codePoint: number): FontkitGlyph;
  }

  export function openSync(path: string): FontkitFont;
  export function open(path: string): Promise<FontkitFont>;
}
