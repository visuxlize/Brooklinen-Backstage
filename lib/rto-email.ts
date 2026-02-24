/**
 * RTO email notification helpers — decoupled from route handlers.
 * Uses Resend; never throws to caller — log failures and return success/failure flag.
 *
 * Future: add an email_logs table to persist recipient, type, timestamp, success/failure
 * for audit and debugging (e.g. INSERT after each send attempt).
 */

import { getResend } from '@/lib/resend'
import { getAppUrl } from '@/lib/app-config'
import {
  buildRtoSubmissionNotificationHtml,
  buildRtoApprovedHtml,
  buildRtoDeniedHtml,
} from '@/lib/email-templates'

// Resend does not allow sending from *.vercel.app (you can't add DNS there). Use their default domain or your own verified domain.
const DEFAULT_FROM = 'Brooklinen Backstage <onboarding@resend.dev>'

function getFromAddress(): string {
  return process.env.EMAIL_FROM?.trim() || process.env.NOTIFICATIONS_EMAIL_FROM?.trim() || DEFAULT_FROM
}

export interface RTORequestData {
  employeeName: string
  employeeEmail: string
  storeId: number
  storeName: string
  requestType: string
  requestedDays: string
  note: string | null
}

export interface RTOLoadedRequest {
  id: string
  employeeName: string
  employeeEmail: string
  storeId: number
  storeName: string
  requestType: string
  requestedDays: string
  leaderNote: string | null
  status: 'approved' | 'denied'
}

export interface LeaderRecipient {
  email: string
  name: string
}

/**
 * Send one notification email per leader when an employee submits an RTO request.
 * Reply-To is set to the employee's email. Only call with leaders for the same store.
 */
export async function sendRTOSubmissionNotification(
  requestData: RTORequestData,
  leaders: LeaderRecipient[]
): Promise<{ sent: number; failed: number }> {
  const baseUrl = getAppUrl()
  const reviewUrl = `${baseUrl}/rto`
  const html = buildRtoSubmissionNotificationHtml({
    employeeName: requestData.employeeName,
    storeName: requestData.storeName,
    requestType: requestData.requestType,
    requestedDays: requestData.requestedDays,
    note: requestData.note,
    reviewUrl,
  })
  const from = getFromAddress()
  const subject = `New time off request from ${requestData.employeeName} — ${requestData.storeName}`
  let sent = 0
  let failed = 0
  try {
    const resend = getResend()
    for (const leader of leaders) {
      if (!leader.email?.trim()) continue
      try {
        const { error } = await resend.emails.send({
          from,
          to: leader.email,
          replyTo: requestData.employeeEmail,
          subject,
          html,
        })
        if (error) {
          console.error(`[RTO email] submission notification failed to ${leader.email}:`, error)
          failed++
        } else {
          console.log(`[RTO email] submission notification sent to ${leader.email} at ${new Date().toISOString()}`)
          sent++
        }
      } catch (e) {
        console.error(`[RTO email] submission notification exception to ${leader.email}:`, e)
        failed++
      }
    }
  } catch (e) {
    console.error('[RTO email] Resend client error (submission):', e)
    failed = leaders.filter((l) => l.email?.trim()).length
  }
  return { sent, failed }
}

/**
 * Send approval or denial email to the employee. FROM displays leader name; Reply-To is leader's email.
 */
export async function sendRTODecisionEmail(
  request: RTOLoadedRequest,
  leader: { email: string; name: string },
  decision: 'approved' | 'denied',
  reason?: string | null
): Promise<{ success: boolean }> {
  const baseUrl = getAppUrl()
  const viewRequestsUrl = `${baseUrl}/rto/submit`
  const firstName = request.employeeName.trim().split(/\s+/)[0] || request.employeeName
  try {
    const resend = getResend()
    const baseFrom = getFromAddress()
    const emailPart = baseFrom.includes('<') ? baseFrom.replace(/^[^<]*<([^>]*)>.*$/, '$1').trim() : baseFrom
    const from = `"${leader.name.replace(/"/g, '')} via Brooklinen Backstage" <${emailPart}>`
    if (decision === 'approved') {
      const html = buildRtoApprovedHtml({
        employeeFirstName: firstName,
        leaderName: leader.name,
        storeName: request.storeName,
        requestType: request.requestType,
        requestedDays: request.requestedDays,
        viewRequestsUrl,
      })
      const { error } = await resend.emails.send({
        from,
        to: request.employeeEmail,
        replyTo: leader.email,
        subject: `Your ${request.requestType} request has been approved — ${request.storeName}`,
        html,
      })
      if (error) {
        console.error(`[RTO email] approval failed to ${request.employeeEmail}:`, error)
        return { success: false }
      }
      console.log(`[RTO email] approval sent to ${request.employeeEmail} at ${new Date().toISOString()}`)
    } else {
      const html = buildRtoDeniedHtml({
        employeeFirstName: firstName,
        leaderName: leader.name,
        storeName: request.storeName,
        requestType: request.requestType,
        requestedDays: request.requestedDays,
        reason: reason ?? request.leaderNote ?? null,
        viewRequestsUrl,
      })
      const { error } = await resend.emails.send({
        from,
        to: request.employeeEmail,
        replyTo: leader.email,
        subject: `Your ${request.requestType} request was not approved — ${request.storeName}`,
        html,
      })
      if (error) {
        console.error(`[RTO email] denial failed to ${request.employeeEmail}:`, error)
        return { success: false }
      }
      console.log(`[RTO email] denial sent to ${request.employeeEmail} at ${new Date().toISOString()}`)
    }
    return { success: true }
  } catch (e) {
    console.error('[RTO email] Resend client error (decision):', e)
    return { success: false }
  }
}
