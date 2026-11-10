/** Pure geometry for the stamp sticker's perforated paper. */

/**
 * A stamp's outline: a rectangle with `holes` semicircular bites of radius
 * `r` along each edge, traced clockwise (each bite curves inward). `origin`
 * moves its top-left corner (so it can be cut out of a larger shape).
 */
export function stampOutline(width: number, height: number, r: number, holes: number, origin = { x: 0, y: 0 }): string {
  const along = (length: number) => Array.from({ length: holes }, (_, i) => ((i + 0.5) / holes) * length);
  const p = (x: number, y: number) => `${x + origin.x} ${y + origin.y}`;
  const arc = (x: number, y: number) => `A ${r} ${r} 0 0 0 ${p(x, y)}`;
  const d: string[] = [`M ${p(0, 0)}`];
  for (const c of along(width)) d.push(`L ${p(c - r, 0)}`, arc(c + r, 0));
  d.push(`L ${p(width, 0)}`);
  for (const c of along(height)) d.push(`L ${p(width, c - r)}`, arc(width, c + r));
  d.push(`L ${p(width, height)}`);
  for (const c of along(width).reverse()) d.push(`L ${p(c + r, height)}`, arc(c - r, height));
  d.push(`L ${p(0, height)}`);
  for (const c of along(height).reverse()) d.push(`L ${p(0, c + r)}`, arc(0, c - r));
  d.push('Z');
  return d.join(' ');
}
