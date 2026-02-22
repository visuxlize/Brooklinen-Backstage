/**
 * App-wide display name for the platform.
 * Official internal Brooklinen management tool.
 */
export const APP_NAME = 'Brooklinen Backstage'
export const APP_NAME_SHORT = 'Backstage'
export const APP_DESCRIPTION =
  'Official internal management tool for Brooklinen — scheduling, daily ops, and retail operations.'

/** Public RTO submission form URL (associate-facing). */
export const RTO_SUBMIT_URL =
  process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/rto/submit` : 'https://brooklinen-backstage.vercel.app/rto/submit'
