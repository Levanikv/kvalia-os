type Props = { name: string; filled?: boolean; className?: string; size?: number };

/** Icône Material Symbols Rounded par ligature. */
export function Icon({ name, filled, className = "", size }: Props) {
  return (
    <span className={`icon ${filled ? "is-filled" : ""} ${className}`} style={size ? { fontSize: size } : undefined} aria-hidden>
      {name}
    </span>
  );
}
