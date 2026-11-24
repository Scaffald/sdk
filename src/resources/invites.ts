/**
 * Invites Resource (Scaffald/SaaS#1393, #1398)
 *
 * Worker-to-friend invites. Email invites are sent by Scaffald (through
 * NevarMail, with an unsubscribe link); phone invites are NEVER texted by
 * Scaffald: `create` returns an `sms:` link and share text for the inviter to
 * send from their own phone.
 */

import { Resource } from './base.js'

export interface InviteContact {
  name?: string | null
  email?: string | null
  phone?: string | null
}

export interface CreateInvitesParams {
  /** 1–50 contacts. */
  contacts: InviteContact[]
  /** Personal note added to the email or text, up to 500 characters. */
  message?: string | null
  /** `app`, `onboarding`, `share`, or `script:<file>`. */
  source?: string
}

export type InviteSkipReason =
  | 'invalid'
  | 'duplicate'
  | 'self'
  | 'member'
  | 'recently_invited'
  | 'daily_limit'
  | 'suppressed'

export type InviteFailReason = 'email_not_configured' | 'send_limit' | 'test_mode' | 'send_failed'

/** One result per contact, in the order sent (`index`). */
export type InviteResult =
  | { index: number; status: 'sent'; invitationId: string; email: string }
  | {
      index: number
      status: 'ready'
      invitationId: string
      phone: string
      link: string
      /** Opens the inviter's messaging app with the text filled in. */
      smsUrl: string
      shareText: string
    }
  | { index: number; status: 'skipped'; reason: InviteSkipReason }
  | { index: number; status: 'failed'; reason: InviteFailReason }

export interface CreateInvitesResponse {
  results: InviteResult[]
  summary: { sent: number; ready: number; skipped: number; failed: number }
}

export type InviteListStatus = 'pending' | 'joined' | 'onboarded' | 'accepted' | 'declined' | 'expired'

export interface Invite {
  id: string
  kind: 'targeted' | 'link'
  channel: 'email' | 'sms_self' | 'share' | 'import' | null
  name: string | null
  email: string | null
  phone: string | null
  status: InviteListStatus
  createdAt: string
  emailSentAt: string | null
  emailOpenedAt: string | null
  emailClickedAt: string | null
}

export interface InvitesListResponse {
  invites: Invite[]
  counts: { invited: number; joined: number; onboarded: number }
}

export interface InviteLink {
  code: string
  link: string
  shareText: string
}

export interface InvitePreview {
  kind: 'link' | 'targeted'
  inviter: { firstName: string; avatarUrl: string | null }
}

export type ClaimInviteResult =
  | { claimed: true; referrer: { firstName: string } }
  | { claimed: false; reason: string }

export class Invites extends Resource {
  /** Invite contacts by email or phone. Auth required. */
  async create(params: CreateInvitesParams): Promise<CreateInvitesResponse> {
    return this.post<CreateInvitesResponse>('/v1/invites', params)
  }

  /** The caller's invites, newest first, with counts. Auth required. */
  async list(): Promise<InvitesListResponse> {
    return this.get<InvitesListResponse>('/v1/invites')
  }

  /** The caller's personal invite link and share text. Auth required. */
  async link(): Promise<InviteLink> {
    return this.get<InviteLink>('/v1/invites/link')
  }

  /** Who sent an invite code: first name and avatar only. Public. */
  async preview(code: string): Promise<InvitePreview> {
    return this.get<InvitePreview>(`/v1/invites/${encodeURIComponent(code)}/preview`)
  }

  /**
   * Credit a new account to an invite. Without `code`, the server uses the
   * newest pending email invite sent to the caller's own address. Auth required.
   */
  async claim(params: { code?: string; landedAt?: string } = {}): Promise<ClaimInviteResult> {
    return this.post<ClaimInviteResult>('/v1/invites/claim', params)
  }
}
