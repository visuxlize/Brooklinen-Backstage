/**
 * Resend email templates — shared HTML for schedule and RTO emails.
 * Use buildScheduleEmailHtml / buildRtoEmailHtml for sending;
 * use getScheduleEmailPreviewHtml / getRtoEmailPreviewHtml for preview (no real image).
 */

const BASE_STYLES = {
  fontFamily: 'Segoe UI, system-ui, -apple-system, sans-serif',
  maxWidth: '600px',
  margin: '0 auto',
  padding: '24px',
  color: '#1E293B',
}
const HEADER_COLOR = '#0F1F3D'
const MUTED_COLOR = '#64748B'
const FOOTER_COLOR = '#94A3B8'
const BORDER_COLOR = '#E2E8F0'

function wrapBody(innerHtml: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Brooklinen</title>
</head>
<body style="margin:0; padding:0; background:#f8fafc;">
  <div style="font-family: ${BASE_STYLES.fontFamily}; max-width: ${BASE_STYLES.maxWidth}; margin: ${BASE_STYLES.margin}; padding: ${BASE_STYLES.padding}; color: ${BASE_STYLES.color}; background: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
    ${innerHtml}
    <hr style="border: none; border-top: 1px solid ${BORDER_COLOR}; margin-top: 24px; margin-bottom: 16px;" />
    <p style="color: ${FOOTER_COLOR}; font-size: 12px; margin: 0;">— Brooklinen Retail Operations</p>
  </div>
</body>
</html>
  `.trim()
}

export interface ScheduleEmailParams {
  storeName: string
  dateRange: string
  /** When true, email is for real send and image is attached (use cid:schedule). When false, show placeholder for preview. */
  imageAttachment?: boolean
}

export function buildScheduleEmailHtml(params: ScheduleEmailParams): string {
  const { storeName, dateRange, imageAttachment = true } = params
  const imageHtml = imageAttachment
    ? '<img src="cid:schedule" alt="Schedule" style="width: 100%; border-radius: 12px; border: 1px solid #E2E8F0; display: block;" />'
    : `
    <div style="width: 100%; min-height: 320px; border-radius: 12px; border: 2px dashed #cbd5e1; background: #f1f5f9; display: flex; align-items: center; justify-content: center;">
      <p style="color: #64748B; font-size: 14px; margin: 0;">[ Schedule image will appear here when sent ]</p>
    </div>
    `.trim()

  return wrapBody(`
    <h2 style="color: ${HEADER_COLOR}; margin: 0 0 8px; font-size: 1.35rem;">${escapeHtml(storeName)} Schedule</h2>
    <p style="color: ${MUTED_COLOR}; margin: 0 0 24px; font-size: 0.95rem;">Week of ${escapeHtml(dateRange)}</p>
    ${imageHtml}
  `)
}

export interface RtoEmailParams {
  employeeName: string
  employeeEmail: string
  type: string
  requestedDays: string
  status: 'approved' | 'denied'
  leaderNote?: string
  storeName: string
}

export function buildRtoEmailHtml(params: RtoEmailParams): string {
  const { employeeName, type, requestedDays, status, leaderNote, storeName } = params
  const statusWord = status === 'approved' ? 'approved' : 'denied'
  const statusUpper = status.toUpperCase()
  const statusColor = status === 'approved' ? '#16a34a' : '#dc2626'

  const leaderNoteHtml = leaderNote
    ? `<p style="color: #334155; margin: 16px 0 0;"><strong>Note from your leader:</strong> ${escapeHtml(leaderNote)}</p>`
    : ''

  return wrapBody(`
    <h2 style="color: ${HEADER_COLOR}; margin: 0 0 8px; font-size: 1.25rem;">Brooklinen Retail Operations</h2>
    <hr style="border: none; border-top: 1px solid ${BORDER_COLOR}; margin: 16px 0 24px;" />

    <p style="margin: 0 0 12px;">Hi ${escapeHtml(employeeName)},</p>

    <p style="margin: 0 0 12px;">
      Your <strong>${escapeHtml(type)}</strong> request for <strong>${escapeHtml(requestedDays)}</strong> has been
      <span style="font-weight: bold; color: ${statusColor};">${statusUpper}</span>.
    </p>

    ${leaderNoteHtml}

    <p style="color: ${MUTED_COLOR}; margin: 24px 0 0;">
      If you have questions, please speak with your store leader at ${escapeHtml(storeName)}.
    </p>
  `)
}

/** Preview HTML for schedule email (no real image). */
export function getScheduleEmailPreviewHtml(storeName?: string, dateRange?: string): string {
  return buildScheduleEmailHtml({
    storeName: storeName ?? 'Williamsburg',
    dateRange: dateRange ?? 'Feb 22 – Feb 28, 2026',
    imageAttachment: false,
  })
}

/** Preview HTML for RTO email. */
export function getRtoEmailPreviewHtml(overrides?: Partial<RtoEmailParams>): string {
  return buildRtoEmailHtml({
    employeeName: 'Alex',
    employeeEmail: 'alex@example.com',
    type: 'PTO',
    requestedDays: 'Mon Feb 23 – Wed Feb 25',
    status: 'approved',
    leaderNote: 'Enjoy your time off! We’ll see you Thursday.',
    storeName: 'Williamsburg',
    ...overrides,
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// RTO notification templates (inline CSS only, table layout for email clients)
// Design: #F0F2F5 bg, #FFFFFF card, #0F172A primary, #64748B secondary, #1E293B accent
// ═══════════════════════════════════════════════════════════════════════════════

const RTO = {
  bg: '#F0F2F5',
  cardBg: '#FFFFFF',
  primary: '#0F172A',
  secondary: '#64748B',
  accent: '#1E293B',
  border: '#E2E8F0',
  font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  successBg: '#C8E6C9',
  successText: '#2E7D32',
  deniedBg: '#FFCCBC',
  deniedText: '#BF360C',
  pendingBg: '#FFF9C4',
  pendingText: '#F57F17',
  rowAlt: '#F8FAFC',
  appUrl: 'brooklinen-backstage.vercel.app',
}

function rtoWrap(headerBar: string, cardContent: string, footerText: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Brooklinen Backstage</title></head>
<body style="margin:0;padding:0;background:${RTO.bg};font-family:${RTO.font};">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${RTO.bg};">
<tr><td align="center" style="padding:24px 16px;">
${headerBar}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:${RTO.cardBg};border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.08);border:1px solid ${RTO.border};">
<tr><td style="padding:32px;">
${cardContent}
</td></tr>
</table>
<p style="color:${RTO.secondary};font-size:12px;margin:16px auto 0;max-width:600px;text-align:center;">${footerText}</p>
<p style="color:${RTO.secondary};font-size:11px;margin:4px auto 24px;text-align:center;">${RTO.appUrl}</p>
</td></tr>
</table>
</body>
</html>`
}

/** Template A — New RTO request (to leaders). */
export interface RtoSubmissionNotificationParams {
  employeeName: string
  storeName: string
  requestType: string
  requestedDays: string
  note: string | null
  reviewUrl: string
}

export function buildRtoSubmissionNotificationHtml(p: RtoSubmissionNotificationParams): string {
  const header = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto 16px;background:${RTO.accent};border-radius:12px 12px 0 0;"><tr><td style="padding:16px 24px;"><span style="color:#FFFFFF;font-size:14px;font-weight:700;letter-spacing:0.05em;">brooklinen BACKSTAGE</span></td></tr></table>`
  const noteDisplay = p.note && p.note.trim() ? escapeHtml(p.note.trim()) : '—'
  const detailTable = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid ${RTO.border};border-radius:6px;overflow:hidden;margin:20px 0;">
<tr><td style="padding:10px 14px;background:${RTO.rowAlt};color:${RTO.secondary};font-size:11px;font-weight:600;width:120px;">EMPLOYEE</td><td style="padding:10px 14px;background:#FFFFFF;color:${RTO.primary};font-size:14px;">${escapeHtml(p.employeeName)}</td></tr>
<tr><td style="padding:10px 14px;background:${RTO.rowAlt};color:${RTO.secondary};font-size:11px;font-weight:600;">STORE</td><td style="padding:10px 14px;background:#FFFFFF;color:${RTO.primary};font-size:14px;">${escapeHtml(p.storeName)}</td></tr>
<tr><td style="padding:10px 14px;background:${RTO.rowAlt};color:${RTO.secondary};font-size:11px;font-weight:600;">TYPE</td><td style="padding:10px 14px;background:#FFFFFF;color:${RTO.primary};font-size:14px;">${escapeHtml(p.requestType)}</td></tr>
<tr><td style="padding:10px 14px;background:${RTO.rowAlt};color:${RTO.secondary};font-size:11px;font-weight:600;">DATE(S)</td><td style="padding:10px 14px;background:#FFFFFF;color:${RTO.primary};font-size:14px;">${escapeHtml(p.requestedDays)}</td></tr>
<tr><td style="padding:10px 14px;background:${RTO.rowAlt};color:${RTO.secondary};font-size:11px;font-weight:600;">NOTES</td><td style="padding:10px 14px;background:#FFFFFF;color:${RTO.primary};font-size:14px;">${noteDisplay}</td></tr>
</table>`
  const cta = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0 0;"><tr><td><a href="${escapeHtml(p.reviewUrl)}" style="display:inline-block;width:100%;padding:14px 20px;background:${RTO.accent};color:#FFFFFF;font-size:14px;font-weight:600;text-align:center;text-decoration:none;border-radius:6px;box-sizing:border-box;">Review Request →</a></td></tr></table>`
  const card = `<p style="color:${RTO.secondary};font-size:12px;margin:0 0 8px;">🔔 New Time Off Request</p>
<h1 style="color:${RTO.primary};font-size:18px;margin:0 0 8px;font-weight:600;">${escapeHtml(p.employeeName)} has submitted a new request</h1>
<p style="color:${RTO.primary};font-size:14px;margin:0 0 16px;">and is waiting for your review.</p>
${detailTable}
${cta}`
  const footer = `This notification was sent because you are listed as a Store Leader for ${escapeHtml(p.storeName)} on Brooklinen Backstage.`
  return rtoWrap(header, card, footer)
}

/** Template B — Approved (to employee). */
export interface RtoDecisionApprovedParams {
  employeeFirstName: string
  leaderName: string
  storeName: string
  requestType: string
  requestedDays: string
  viewRequestsUrl: string
}

export function buildRtoApprovedHtml(p: RtoDecisionApprovedParams): string {
  const header = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto 16px;background:${RTO.accent};border-radius:12px 12px 0 0;"><tr><td style="padding:16px 24px;"><span style="color:#FFFFFF;font-size:14px;font-weight:700;letter-spacing:0.05em;">brooklinen BACKSTAGE</span></td></tr></table>`
  const badge = `<p style="text-align:center;margin:0 0 20px;"><span style="display:inline-block;padding:8px 16px;background:${RTO.successBg};color:${RTO.successText};font-size:13px;font-weight:600;border-radius:6px;">✓ Approved</span></p>`
  const detailTable = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid ${RTO.border};border-radius:6px;overflow:hidden;margin:20px 0;">
<tr><td style="padding:10px 14px;background:${RTO.rowAlt};color:${RTO.secondary};font-size:11px;font-weight:600;width:120px;">TYPE</td><td style="padding:10px 14px;background:#FFFFFF;color:${RTO.primary};font-size:14px;">${escapeHtml(p.requestType)}</td></tr>
<tr><td style="padding:10px 14px;background:${RTO.rowAlt};color:${RTO.secondary};font-size:11px;font-weight:600;">DATE(S)</td><td style="padding:10px 14px;background:#FFFFFF;color:${RTO.primary};font-size:14px;">${escapeHtml(p.requestedDays)}</td></tr>
<tr><td style="padding:10px 14px;background:${RTO.rowAlt};color:${RTO.secondary};font-size:11px;font-weight:600;">APPROVED BY</td><td style="padding:10px 14px;background:#FFFFFF;color:${RTO.primary};font-size:14px;">${escapeHtml(p.leaderName)}</td></tr>
<tr><td style="padding:10px 14px;background:${RTO.rowAlt};color:${RTO.secondary};font-size:11px;font-weight:600;">STORE</td><td style="padding:10px 14px;background:#FFFFFF;color:${RTO.primary};font-size:14px;">${escapeHtml(p.storeName)}</td></tr>
</table>`
  const cta = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0 0;"><tr><td><a href="${escapeHtml(p.viewRequestsUrl)}" style="display:inline-block;width:100%;padding:14px 20px;background:${RTO.accent};color:#FFFFFF;font-size:14px;font-weight:600;text-align:center;text-decoration:none;border-radius:6px;box-sizing:border-box;">View My Requests →</a></td></tr></table>`
  const card = `${badge}
<p style="color:${RTO.primary};font-size:14px;margin:0 0 8px;">Hi ${escapeHtml(p.employeeFirstName)},</p>
<p style="color:${RTO.primary};font-size:14px;margin:0 0 16px;">Your time off request has been approved by ${escapeHtml(p.leaderName)}.</p>
${detailTable}
${cta}`
  const footer = `Questions? Reply to this email to reach ${escapeHtml(p.leaderName)} directly.`
  return rtoWrap(header, card, footer)
}

/** Template C — Denied (to employee). */
export interface RtoDecisionDeniedParams {
  employeeFirstName: string
  leaderName: string
  storeName: string
  requestType: string
  requestedDays: string
  reason: string | null
  viewRequestsUrl: string
}

export function buildRtoDeniedHtml(p: RtoDecisionDeniedParams): string {
  const header = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto 16px;background:${RTO.accent};border-radius:12px 12px 0 0;"><tr><td style="padding:16px 24px;"><span style="color:#FFFFFF;font-size:14px;font-weight:700;letter-spacing:0.05em;">brooklinen BACKSTAGE</span></td></tr></table>`
  const badge = `<p style="text-align:center;margin:0 0 20px;"><span style="display:inline-block;padding:8px 16px;background:${RTO.deniedBg};color:${RTO.deniedText};font-size:13px;font-weight:600;border-radius:6px;">✗ Request Not Approved</span></p>`
  const reasonDisplay = p.reason && p.reason.trim() ? escapeHtml(p.reason.trim()) : '—'
  const detailTable = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid ${RTO.border};border-radius:6px;overflow:hidden;margin:20px 0;">
<tr><td style="padding:10px 14px;background:${RTO.rowAlt};color:${RTO.secondary};font-size:11px;font-weight:600;width:120px;">TYPE</td><td style="padding:10px 14px;background:#FFFFFF;color:${RTO.primary};font-size:14px;">${escapeHtml(p.requestType)}</td></tr>
<tr><td style="padding:10px 14px;background:${RTO.rowAlt};color:${RTO.secondary};font-size:11px;font-weight:600;">DATE(S)</td><td style="padding:10px 14px;background:#FFFFFF;color:${RTO.primary};font-size:14px;">${escapeHtml(p.requestedDays)}</td></tr>
<tr><td style="padding:10px 14px;background:${RTO.rowAlt};color:${RTO.secondary};font-size:11px;font-weight:600;">REVIEWED BY</td><td style="padding:10px 14px;background:#FFFFFF;color:${RTO.primary};font-size:14px;">${escapeHtml(p.leaderName)}</td></tr>
<tr><td style="padding:10px 14px;background:${RTO.rowAlt};color:${RTO.secondary};font-size:11px;font-weight:600;">REASON</td><td style="padding:10px 14px;background:#FFFFFF;color:${RTO.primary};font-size:14px;">${reasonDisplay}</td></tr>
<tr><td style="padding:10px 14px;background:${RTO.rowAlt};color:${RTO.secondary};font-size:11px;font-weight:600;">STORE</td><td style="padding:10px 14px;background:#FFFFFF;color:${RTO.primary};font-size:14px;">${escapeHtml(p.storeName)}</td></tr>
</table>`
  const cta = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0 0;"><tr><td><a href="${escapeHtml(p.viewRequestsUrl)}" style="display:inline-block;width:100%;padding:14px 20px;background:${RTO.accent};color:#FFFFFF;font-size:14px;font-weight:600;text-align:center;text-decoration:none;border-radius:6px;box-sizing:border-box;">View My Requests →</a></td></tr></table>`
  const card = `${badge}
<p style="color:${RTO.primary};font-size:14px;margin:0 0 8px;">Hi ${escapeHtml(p.employeeFirstName)},</p>
<p style="color:${RTO.primary};font-size:14px;margin:0 0 16px;">Unfortunately your time off request could not be approved at this time. Please reach out to ${escapeHtml(p.leaderName)} if you have questions.</p>
${detailTable}
${cta}`
  const footer = `Reply to this email to reach ${escapeHtml(p.leaderName)} directly.`
  return rtoWrap(header, card, footer)
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
