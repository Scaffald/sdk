/**
 * ReviewLinks Resource (SC-38)
 *
 * Shareable, no-account-required review request tokens.
 */

import { Resource } from './base.js'

export type ReviewerRelationship =
  | 'instructor'
  | 'manager'
  | 'coworker'
  | 'client'
  | 'foreman'
  | 'supervisor'
  | 'other'

export interface ReviewLink {
  id: string
  token: string
  label: string | null
  expires_at: string | null
  max_uses: number | null
  used_count: number
  is_revoked: boolean
  created_at: string
  share_url: string
}

export interface CreateReviewLinkParams {
  label?: string
  expires_at?: string
  max_uses?: number
}

export interface ReviewLinkSubject {
  id: string
  display_name: string | null
  slug: string | null
  avatar_path: string | null
  headline: string | null
}

export interface ReviewLinkLookup {
  link: {
    id: string
    label: string | null
    expires_at: string | null
  }
  subject: ReviewLinkSubject
}

export interface SubmitReviewByTokenParams {
  reviewer_name: string
  reviewer_email?: string
  reviewer_relationship: ReviewerRelationship
  rating: number
  body: string
  headline?: string
}

export interface SubmitReviewByTokenResponse {
  review_id: string
  subject_slug: string | null
}

export class ReviewLinks extends Resource {
  /**
   * Create a new shareable review-request link. Auth required.
   */
  async create(params: CreateReviewLinkParams = {}): Promise<ReviewLink> {
    return this.post<ReviewLink>('/v1/reviews/links', params)
  }

  /**
   * List the current user's review links. Auth required.
   */
  async list(): Promise<ReviewLink[]> {
    return this.get<ReviewLink[]>('/v1/reviews/links')
  }

  /**
   * Revoke a review link by id. Auth required.
   */
  async revoke(id: string): Promise<{ success: boolean }> {
    return this.del<{ success: boolean }>(`/v1/reviews/links/${id}`)
  }

  /**
   * Look up a review link by its token. Anon-friendly — used by the
   * public review submission route to show the subject's name + photo
   * before the reviewer fills out the form.
   */
  async getByToken(token: string): Promise<ReviewLinkLookup> {
    return this.get<ReviewLinkLookup>(`/v1/reviews/links/by-token/${token}`)
  }

  /**
   * Submit a review using a shared token. Anon — no Scaffald account
   * required.
   */
  async submitByToken(
    token: string,
    params: SubmitReviewByTokenParams
  ): Promise<SubmitReviewByTokenResponse> {
    return this.post<SubmitReviewByTokenResponse>(
      `/v1/reviews/links/by-token/${token}/submit`,
      params
    )
  }
}
