interface SiHiLogoProps {
  /** Icon size in pixels */
  iconSize?: number;
  /** Whether to show the "SiHi" text next to the icon */
  showText?: boolean;
  /** Font size of the text in rem. Defaults to auto-scaled from iconSize */
  textSize?: string;
  /** Extra className on the wrapper */
  className?: string;
}

/**
 * SiHi brand logo — blue rounded square with white S-curve + purple dot, plus "SiHi" text.
 */
export function SiHiLogo({
  iconSize = 32,
  showText = true,
  textSize,
  className = "",
}: SiHiLogoProps) {
  const fontSize = textSize ?? `${(iconSize * 0.72).toFixed(0)}px`;

  return (
    <span className={`inline-flex items-center gap-2 select-none ${className}`}>
      {/* ── Icon ── */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Background — blue rounded square */}
        <rect width="100" height="100" rx="26" fill="#1B5CF0" />

        {/* White S-curve path */}
        <path
          d="M 66 33 C 66 20, 34 20, 34 34 C 34 48, 66 52, 66 66 C 66 80, 34 80, 34 67"
          stroke="white"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Purple accent dot — top-right area */}
        <circle cx="76" cy="22" r="11" fill="#9B6DFF" />
      </svg>

      {/* ── Text ── */}
      {showText && (
        <span
          style={{ fontSize, lineHeight: 1, letterSpacing: "-0.02em" }}
          className="font-extrabold tracking-tight"
          aria-label="SiHi"
        >
          <span style={{ color: "#3B82F6" }}>Si</span>
          <span style={{ color: "#8B5CF6" }}>Hi</span>
        </span>
      )}
    </span>
  );
}
