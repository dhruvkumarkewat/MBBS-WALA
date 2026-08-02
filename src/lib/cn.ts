/** Tiny className merger — no external deps. */
export function cn(
  ...parts: Array<string | number | boolean | null | undefined>
): string {
  return parts.filter((p) => typeof p === 'string' && p.length > 0).join(' ');
}

export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
