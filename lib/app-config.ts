/**
 * App-wide display name for the platform.
 * Official internal Brooklinen management tool.
 */
export const APP_NAME = 'Brooklinen Backstage'
export const APP_NAME_SHORT = 'Backstage'
export const APP_DESCRIPTION =
  'Official internal management tool for Brooklinen — scheduling, daily ops, and retail operations.'

/** Effective app URL: never use localhost so production links (e.g. RTO form) always point to live site. */
export function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (!url || /^https?:\/\/localhost(:\d+)?(\/|$)/i.test(url)) return 'https://brooklinen-backstage.vercel.app'
  return url.replace(/\/$/, '')
}

/** Public RTO submission form URL (associate-facing). */
export const RTO_SUBMIT_URL = `${getAppUrl()}/rto/submit`
