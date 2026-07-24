export const smoothPath = pts => pts.reduce((d, p, i, a) => {
  if (!i) return `M${p.x},${p.y}`
  const c = (a[i-1].x + p.x) / 2
  return d + ` C${c},${a[i-1].y} ${c},${p.y} ${p.x},${p.y}`
}, '')