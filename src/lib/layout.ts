/**
 * Saf düzen hesapları — sticky önizleme rayının yüksekliği ve sahnenin
 * (çerçeve/etiket/logo dahil tam eserin) mevcut alana oran korunarak
 * sığdırılması. DOM'a dokunmaz; bu yüzden birim testleriyle doğrulanır.
 */

/** Üst çubuk ile ray arasındaki boşluk (px). */
export const RAIL_TOP_GAP = 12;
/** Ray ile ekranın alt kenarı arasındaki güvenlik boşluğu (px). */
export const RAIL_BOTTOM_GAP = 12;
/** Çok uzun ekranlarda rayın büyüyüp grid satırlarını şişirmesini engelleyen tavan (px). */
export const RAIL_MAX_HEIGHT = 960;

export interface RailMetricsInput {
  /** Yapışkan üst çubuğun alt kenarı (viewport koordinatı, px). */
  headerBottom: number;
  /** Rayın kapsayıcı bloğunun alt kenarı (viewport koordinatı, px). */
  containerBottom: number;
  /** Görünür viewport yüksekliği (px). */
  viewportHeight: number;
  topGap?: number;
  bottomGap?: number;
  maxHeight?: number;
}

export interface RailMetrics {
  /** Rayın yapışkan üst ofseti (px). */
  top: number;
  /** Rayın kullanabileceği yükseklik (px). */
  height: number;
}

/**
 * Rayın üst ofsetini ve yüksekliğini hesaplar:
 *   top    = headerBottom + topGap
 *   height = min(viewportHeight - bottomGap, containerBottom) - top  (0..maxHeight)
 *
 * Böylece ray, altbilgiye yaklaşırken üst çubuğun altına girmek yerine
 * kısalır; hiçbir zaman kapsayıcı bloğunu veya ekranı aşmaz.
 */
export function computeRailMetrics({
  headerBottom,
  containerBottom,
  viewportHeight,
  topGap = RAIL_TOP_GAP,
  bottomGap = RAIL_BOTTOM_GAP,
  maxHeight = RAIL_MAX_HEIGHT,
}: RailMetricsInput): RailMetrics {
  const top = Math.max(0, Math.round(headerBottom + topGap));
  const viewportBottom = viewportHeight - bottomGap;
  const limit = Math.min(viewportBottom, containerBottom);
  // Taban yuvarlaması: ray, kapsayıcı bloğun/ekranın alt kenarını asla aşmaz.
  const height = Math.max(0, Math.min(Math.floor(limit - top), maxHeight));
  return { top, height };
}

export interface ArtworkFitInput {
  /** Sahnenin kullanabileceği alan (px). */
  containerWidth: number;
  containerHeight: number;
  /** Eserin gerçek (bitmap) boyutu — en-boy oranı buradan gelir. */
  sceneWidth: number;
  sceneHeight: number;
  /** Sahne dolgusu + kenarlık (tek kenar, px). */
  inset?: number;
}

export interface ArtworkFit {
  width: number;
  height: number;
  scale: number;
}

/**
 * Eseri alana oran korunarak sığdırır (contain). Alan ya da eser geçersizse
 * `null` döner; görüntüleme boyutu her zaman bitmap çiziminden bağımsızdır.
 */
export function fitArtwork({
  containerWidth,
  containerHeight,
  sceneWidth,
  sceneHeight,
  inset = 0,
}: ArtworkFitInput): ArtworkFit | null {
  if (sceneWidth <= 0 || sceneHeight <= 0) return null;
  const availableWidth = containerWidth - inset * 2;
  const availableHeight = containerHeight - inset * 2;
  if (availableWidth <= 0 || availableHeight <= 0) return null;
  const scale = Math.min(availableWidth / sceneWidth, availableHeight / sceneHeight);
  if (!Number.isFinite(scale) || scale <= 0) return null;
  return {
    width: Math.max(1, Math.floor(sceneWidth * scale)),
    height: Math.max(1, Math.floor(sceneHeight * scale)),
    scale,
  };
}
