/** Pure geometry for the stamp sticker's perforated paper. */

/**
 * A stamp's outline: a rectangle with `holes` semicircular bites of radius
 * `r` along each edge, traced clockwise (each bite curves inward).
 */
export function stampOutline(width: number, height: number, r: number, holes: number): string {
  const along = (length: number) => Array.from({ length: holes }, (_, i) => ((i + 0.5) / holes) * length);
  const arc = (x: number, y: number) => `A ${r} ${r} 0 0 0 ${x} ${y}`;
  const d: string[] = ['M 0 0'];
  for (const c of along(width)) d.push(`L ${c - r} 0`, arc(c + r, 0));
  d.push(`L ${width} 0`);
  for (const c of along(height)) d.push(`L ${width} ${c - r}`, arc(width, c + r));
  d.push(`L ${width} ${height}`);
  for (const c of along(width).reverse()) d.push(`L ${c + r} ${height}`, arc(c - r, height));
  d.push(`L 0 ${height}`);
  for (const c of along(height).reverse()) d.push(`L 0 ${c + r}`, arc(0, c - r));
  d.push('Z');
  return d.join(' ');
}
