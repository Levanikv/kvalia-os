/** Mini courbe de la charge dans le temps (SVG inline, pas de lib). */
export function CourbeCharge({ points }: { points: Array<{ jour: string; kg: number }> }) {
  if (points.length < 2) return <p className="mt-2 text-xs text-text-3">La courbe apparaît à partir de deux séances notées.</p>;
  const W = 320, H = 72, P = 6;
  const kgs = points.map((p) => p.kg);
  const min = Math.min(...kgs), max = Math.max(...kgs);
  const y = (v: number) => (max === min ? H / 2 : P + (H - 2 * P) * (1 - (v - min) / (max - min)));
  const x = (i: number) => P + ((W - 2 * P) * i) / (points.length - 1);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.kg).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-20 w-full" role="img" aria-label={`Charge de ${min} à ${max} kg sur ${points.length} séances`}>
      <path d={`${d} L${x(points.length - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z`} fill="var(--module-accent)" opacity="0.12" />
      <path d={d} fill="none" stroke="var(--module-accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => <circle key={p.jour + i} cx={x(i)} cy={y(p.kg)} r="3.5" fill="var(--surface-2)" stroke="var(--module-accent)" strokeWidth="2" />)}
    </svg>
  );
}
