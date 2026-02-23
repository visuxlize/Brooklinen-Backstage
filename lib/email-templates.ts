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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
