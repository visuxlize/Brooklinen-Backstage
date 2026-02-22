import { Resend } from 'resend'

let _client: Resend | null = null

/** Lazy-initialized so build can complete without RESEND_API_KEY. */
export function getResend(): Resend {
  if (!_client) {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error('RESEND_API_KEY is not set')
    _client = new Resend(key)
  }
  return _client
}
