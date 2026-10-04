/** Şekil seçiciler için gerçek geometriden üretilen minik SVG önizlemeler. */

import { eyeInnerPath, eyeOuterRingPath, modulePath } from '../lib/shapes';
import type { DotType, EyeInnerType, EyeOuterType, FrameType } from '../lib/types';

function MiniQr({ x = 8, y = 8, size = 24 }: { x?: number; y?: number; size?: number }) {
  const u = size / 8;
  const finder = (fx: number, fy: number) => (
    <g key={`${fx}-${fy}`}>
      <rect
        x={x + fx * u}
        y={y + fy * u}
        width={u * 3}
        height={u * 3}
        rx={u * 0.6}
        fill="none"
        stroke="currentColor"
        strokeWidth={u * 0.85}
      />
      <rect
        x={x + (fx + 1) * u}
        y={y + (fy + 1) * u}
        width={u}
        height={u}
        rx={u * 0.3}
        fill="currentColor"
      />
    </g>
  );
  return (
    <g>
      {finder(0, 0)}
      {finder(5, 0)}
      {finder(0, 5)}
      <rect x={x + 5 * u} y={y + 5 * u} width={u * 0.9} height={u * 0.9} rx={u * 0.28} fill="currentColor" />
      <rect x={x + 6.1 * u} y={y + 5.1 * u} width={u * 0.9} height={u * 0.9} fill="currentColor" />
      <rect x={x + 5.1 * u} y={y + 6.1 * u} width={u * 0.9} height={u * 0.9} fill="currentColor" />
      <rect x={x + 3.6 * u} y={y + 3.4 * u} width={u * 0.9} height={u * 0.9} rx={u * 0.28} fill="currentColor" />
      <rect x={x + 4.7 * u} y={y + 4.5 * u} width={u * 0.8} height={u * 0.8} fill="currentColor" />
    </g>
  );
}

export function FrameGlyph({ frame, className }: { frame: FrameType; className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden focusable="false">
      <g className="text-ink">
        <MiniQr />
        {frame === 'border' && (
          <rect x={3} y={3} width={34} height={34} rx={7} fill="none" stroke="currentColor" strokeWidth={1.6} />
        )}
        {frame === 'labelBottom' && (
          <>
            <rect x={5} y={30.5} width={30} height={6} rx={3} fill="currentColor" />
            <rect x={14} y={32.8} width={12} height={1.4} rx={0.7} fill="#fff" opacity={0.85} />
          </>
        )}
        {frame === 'labelTop' && (
          <>
            <rect x={5} y={3.5} width={30} height={6} rx={3} fill="currentColor" />
            <rect x={14} y={5.8} width={12} height={1.4} rx={0.7} fill="#fff" opacity={0.85} />
          </>
        )}
        {frame === 'bubble' && (
          <>
            <rect x={4} y={4} width={32} height={30} rx={9} fill="none" stroke="currentColor" strokeWidth={1.6} />
            <path d="M16,34H24L20,38.4Z" fill="currentColor" />
          </>
        )}
        {frame === 'corners' && (
          <g fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="square">
            <path d="M3,11V3h8" />
            <path d="M29,3h8v8" />
            <path d="M37,29v8h-8" />
            <path d="M11,37H3v-8" />
          </g>
        )}
        {frame === 'badge' && (
          <>
            <rect x={11} y={31.5} width={18} height={6} rx={3} fill="currentColor" />
            <rect x={15.5} y={33.8} width={9} height={1.4} rx={0.7} fill="#fff" opacity={0.85} />
          </>
        )}
      </g>
    </svg>
  );
}

export function ModuleShapeGlyph({ dot, className }: { dot: DotType; className?: string }) {
  const m = 13;
  const d = [
    modulePath(dot, 2, 2, m),
    modulePath(dot, 17, 2, m),
    modulePath(dot, 2, 17, m),
    modulePath(dot, 17, 17, m),
  ].join(' ');
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden focusable="false">
      <path d={d} fill="currentColor" />
    </svg>
  );
}

export function EyeGlyph({
  outer,
  inner,
  className,
}: {
  outer: EyeOuterType;
  inner: EyeInnerType;
  className?: string;
}) {
  const m = 4.6;
  const x = 1.2;
  const y = 1.2;
  return (
    <svg viewBox="0 0 36 36" className={className} aria-hidden focusable="false">
      <path d={eyeOuterRingPath(outer, x, y, m)} fill="currentColor" fillRule="evenodd" />
      <path d={eyeInnerPath(inner, x + 2 * m, y + 2 * m, m)} fill="currentColor" />
    </svg>
  );
}
