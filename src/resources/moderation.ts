import { Resource } from './base.js'

/**
 * Reporting content and people, and blocking people.
 *
 * Required by Google Play's User Generated Content policy and Apple
 * Guideline 1.2 — an app carrying UGC must let users report content, report a
 * person, and block a person. See Scaffald/SaaS#690.
 */

export type ReportSubjectType =
  | 'community_post'
  | 'community_comment'
  | 'inquiry_message'
  | 'user'
  | 'job'

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'sexual_content'
  | 'violence_or_threats'
  | 'scam_or_fraud'
  | 'off_platform_solicitation'
  | 'other'

export type ReportStatus = 'open' | 'reviewing' | 'actioned' | 'dismissed'

export interface ContentReport {
  id: string
  reporter_id: string
  subject_type: ReportSubjectType
  subject_id: string
  /** Author of the reported content, resolved server-side. Null if it could not be determined. */
  reported_user_id: string | null
  reason: ReportReason
  details: string | null
  status: ReportStatus
  created_at: string
}

export interface CreateReportParams {
  subjectType: ReportSubjectType
  subjectId: string
  reason: ReportReason
  /** Required when reason is 'other' — the API rejects an empty one. */
  details?: string
}

export interface UserBlock {
  id: string
  blocker_id: string
  blocked_id: string
  created_at: string
}

export interface ReportsListResponse {
  data: ContentReport[]
  total: number
}

export interface BlocksListResponse {
  data: UserBlock[]
  total: number
}

export class Moderation extends Resource {
  /**
   * File a report for moderator review.
   *
   * One open report per person per subject: a second attempt while the first
   * is still open comes back 409, which the UI should treat as "already done"
   * rather than as a failure.
   */
  async report(params: CreateReportParams): Promise<ContentReport> {
    return this.post<ContentReport>('/v1/moderation/reports', params)
  }

  /** Reports you have filed. Nobody else can see them, including the reported party. */
  async listReports(params?: { limit?: number; offset?: number }): Promise<ReportsListResponse> {
    const q = new URLSearchParams()
    if (params?.limit !== undefined) q.append('limit', String(params.limit))
    if (params?.offset !== undefined) q.append('offset', String(params.offset))
    const query = q.toString() ? `?${q.toString()}` : ''
    return this.get<ReportsListResponse>(`/v1/moderation/reports${query}`)
  }

  /**
   * Block someone. Takes effect immediately and in both directions — neither
   * of you sees the other's messages or posts.
   *
   * Idempotent: blocking someone already blocked returns the existing block
   * rather than erroring.
   */
  async blockUser(userId: string): Promise<UserBlock> {
    return this.post<UserBlock>('/v1/moderation/blocks', { userId })
  }

  /** Unblock, restoring delivery both ways. */
  async unblockUser(userId: string): Promise<void> {
    await this.del<void>(`/v1/moderation/blocks/${userId}`)
  }

  /** People you have blocked. */
  async listBlocks(params?: { limit?: number; offset?: number }): Promise<BlocksListResponse> {
    const q = new URLSearchParams()
    if (params?.limit !== undefined) q.append('limit', String(params.limit))
    if (params?.offset !== undefined) q.append('offset', String(params.offset))
    const query = q.toString() ? `?${q.toString()}` : ''
    return this.get<BlocksListResponse>(`/v1/moderation/blocks${query}`)
  }
}
