/**
 * Brooklinen wordmark logo. Use "white" on dark backgrounds (e.g. sidebar), "navy" on light backgrounds (e.g. login).
 */
interface BrooklinenLogoProps {
  variant?: 'white' | 'navy'
  className?: string
  height?: number
}

export function BrooklinenLogo({ variant = 'navy', className = '', height = 32 }: BrooklinenLogoProps) {
  const src = variant === 'white' ? '/images/brooklinen-logo-white.svg' : '/images/brooklinen-logo.svg'
  return (
    <img
      src={src}
      alt="Brooklinen"
      height={height}
      width={Math.round((360.1 / 62) * height)}
      className={className}
    />
  )
}
