/**
 * Re-monté à chaque navigation : le contenu de l'écran entre en fondu léger (« page-entree », globals.css).
 * Désactivé si l'iPhone demande de réduire les animations.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-entree">{children}</div>;
}
