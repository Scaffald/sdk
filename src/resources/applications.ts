import { NotFoundError } from '../http/errors.js'
import { Resource } from './base.js'

/**
 * Generate a per-call Idempotency-Key. The value only needs to be stable
 * across the SDK's internal retries of a single logical request (which
 * `HttpClient.request` does by threading the same `options` through the
 * recursive call); a fresh UUID per `create()` invocation is sufficient.
 */
function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID (very old Node).
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export interface ApplicationJobSummary {
  id: string
  title: string | null
  location: string | null
  employment_type: string | null
  remote_option: string | null
  pay_range_min_cents: number | null
  pay_range_max_cents: number | null
  pay_range_type: string | null
  organization?: {
    id: string
    name: string | null
    logo_url: string | null
  } | null
}

export interface ApplicationActivity {
  id: string
  application_id: string
  event_type: string
  details?: Record<string, unknown> | null
  created_at: string
}

export interface Application {
  id: string
  job_id: string
  user_id: string
  status:
    | 'pending'
    | 'reviewing'
    | 'inquired'
    | 'interview'
    | 'offer'
    | 'hired'
    | 'rejected'
    | 'withdrawn'
  screening_answers?: Record<string, unknown>
  attachment_metadata?: Record<string, unknown>
  completed_steps?: string[]
  created_at: string
  stage_changed_at?: string | null
  score?: number | null
  job?: ApplicationJobSummary | null
  /** Source of hire — how the candidate found this job (Issue #91) */
  source?: 'scaffald' | 'referral' | 'external_board' | 'social_media' | 'company_website' | 'other'
  /** Union status for union-aware hiring (Issue #98) */
  union_status?: {
    is_union_member: boolean
    union_name?: string
    local_number?: string
    membership_id?: string
    journeyman_status?: 'apprentice' | 'journeyman' | 'master'
    prevailing_wage_eligible?: boolean
  }
}

export interface CustomQuestionAnswer {
  question_id: string
  question: string
  answer: string | string[] | boolean
  type: 'short_text' | 'long_text' | 'single_choice' | 'multiple_choice' | 'yes_no'
}

export interface AttachmentMetadata {
  path: string
  filename: string
  size: number
  mime_type: string
  uploaded_at: string
}

export interface CreateApplicationParams {
  job_id: string
  current_location?: string
  willing_to_relocate?: boolean
  years_experience?: number
  is_authorized_to_work?: boolean
  earliest_start_date?: string
  screening_answers?: Record<string, unknown>
  custom_question_answers?: CustomQuestionAnswer[]
  attachments?: Record<string, AttachmentMetadata>
  completed_steps?: string[]
  is_complete?: boolean
  notes?: Record<string, unknown>
  metadata?: Record<string, unknown>
  /** Source tracking — how the candidate found this job (Issue #91) */
  source?: 'scaffald' | 'referral' | 'external_board' | 'social_media' | 'company_website' | 'other'
}

export interface UpdateApplicationParams {
  /**
   * NOTE: no `status`. PATCH /v1/applications/{id} is the applicant's endpoint
   * and the server strips status from its body — while it did not, an
   * applicant could promote their own application to `hired`. Employer-side
   * moves go through `updateForOrganization`.
   */
  current_location?: string
  willing_to_relocate?: boolean
  years_experience?: number
  is_authorized_to_work?: boolean
  earliest_start_date?: string
  screening_answers?: Record<string, unknown>
  custom_question_answers?: CustomQuestionAnswer[]
  attachments?: Record<string, AttachmentMetadata>
  completed_steps?: string[]
  is_complete?: boolean
  notes?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface WithdrawApplicationParams {
  reason?: string
}

export interface ListApplicationsParams {
  status?: Application['status']
  limit?: number
  offset?: number
}

export interface ListApplicationsResponse {
  data: Application[]
  total: number
  limit: number
  offset: number
}

export interface UpdateEmployerApplicationParams {
  /** Target pipeline stage. Validated server-side against the transition table. */
  status?: Application['status']
  /** Team member to assign, or null to unassign. */
  assigned_to?: string | null
}

/** Filters for the employer-side pipeline list. */
export interface ListEmployerApplicationsParams {
  /** Narrow to one organization. Omit to span every organization the caller can act for. */
  organization_id?: string
  job_id?: string
  status?: Application['status']
  /** Team member the application is assigned to. */
  assigned_to?: string
  /** Minimum `score_total`. */
  min_score?: number
  /** ISO timestamp; filters on application creation. */
  date_from?: string
  /** ISO timestamp; filters on application creation. */
  date_to?: string
  limit?: number
  offset?: number
}

/**
 * Candidate identity attached to an employer-side application.
 *
 * Only what a pipeline card needs — this is not the full profile, and it is
 * deliberately not the applicant's contact details.
 */
export interface EmployerApplicationCandidate {
  id: string
  display_name: string | null
  username: string | null
  headline: string | null
  avatar_url: string | null
  avatar_path: string | null
}

export interface EmployerApplicationJob {
  id: string
  title: string | null
  location: string | null
  employment_type: string | null
  organization_id: string | null
  pay_range_min_cents: number | null
  pay_range_max_cents: number | null
  pay_range_type: string | null
}

/** One recorded pipeline transition. */
export interface EmployerApplicationStageChange {
  /** Null for the first recorded transition. */
  from_status: string | null
  to_status: string
  actor_user_id: string | null
  changed_at: string
}

/**
 * An application as the hiring side sees it.
 *
 * Field names mirror the database rather than the older office UI's
 * assumptions: the score is `score_total`, and the flat screening answers live
 * inside `screening_answers` rather than as columns.
 */
export interface EmployerApplication {
  id: string
  job_id: string
  user_id: string
  status: Application['status']
  created_at: string
  updated_at: string | null
  stage_changed_at: string | null
  score_total: number | null
  source: string | null
  union_status: Record<string, unknown> | null
  assigned_to: string | null
  is_shortlisted: boolean | null
  screening_answers: Record<string, unknown> | null
  attachment_metadata: Record<string, unknown> | null
  /**
   * Ordered stage transitions. Time-to-hire and funnel conversion are computed
   * from this — while it was absent the office UI hardcoded it empty and both
   * metrics were structurally zero.
   */
  stage_history: EmployerApplicationStageChange[]
  candidate: EmployerApplicationCandidate | null
  job: EmployerApplicationJob | null
}

export interface ListEmployerApplicationsResponse {
  data: EmployerApplication[]
  total: number
  limit: number
  offset: number
}

export interface GetUploadUrlParams {
  application_id: string
  attachment_type: 'resume' | 'cover_letter' | 'portfolio' | 'assessment' | 'video_interview'
  filename: string
  content_type: string
}

export interface GetUploadUrlResponse {
  uploadUrl: string
  path: string
}

export interface ConfirmUploadParams {
  application_id: string
  attachment_type: 'resume' | 'cover_letter' | 'portfolio' | 'assessment' | 'video_interview'
  path: string
  filename: string
  size: number
  mime_type: string
}

export interface ApplicationMessage {
  id: string
  application_id: string
  sender_id: string
  body: string
  created_at: string
  sender_name?: string
  sender_role?: 'applicant' | 'recruiter' | 'system'
}

export interface GetMessagesResponse {
  data: ApplicationMessage[]
}

export interface SendMessageParams {
  applicationId: string
  body: string
}

export class Applications extends Resource {
  /**
   * Create a new job application.
   *
   * SC-109: always attaches a per-call Idempotency-Key so SDK-internal retries
   * (enabled in SC-106 for POSTs that carry a key) dedupe at the server
   * instead of double-creating an application row on a transient 5xx.
   */
  async create(params: CreateApplicationParams): Promise<Application> {
    return this.post<Application>(
      '/v1/applications',
      params,
      generateIdempotencyKey()
    )
  }

  /**
   * Retrieve an application by ID
   */
  async retrieve(id: string): Promise<Application> {
    return this.get<Application>(`/v1/applications/${id}`)
  }

  /**
   * Update an application
   */
  async update(id: string, params: UpdateApplicationParams): Promise<Application> {
    return this.patch<Application>(`/v1/applications/${id}`, params)
  }

  /**
   * Withdraw an application
   */
  async withdraw(id: string, params?: WithdrawApplicationParams): Promise<Application> {
    return this.post<Application>(`/v1/applications/${id}/withdraw`, params)
  }

  /**
   * Get the current user's application for a job (parity with tRPC jobs.getMyApplicationForJob).
   * Returns null if the user has not applied to the job.
   *
   * SC-104: previously the catch swallowed *any* error and returned null, so
   * a UI consumer couldn't distinguish "no application exists" from "API
   * unreachable / 500 / network down" — both rendered as the empty state.
   * Now: 404 still maps to null (no application), every other error
   * propagates so the caller can show a real error UI or retry.
   */
  async getMyForJob(jobId: string): Promise<Application | null> {
    try {
      const res = await this.get<{ data: Application }>(
        `/v1/jobs/${encodeURIComponent(jobId)}/applications/me`
      )
      return res?.data ?? null
    } catch (error) {
      if (error instanceof NotFoundError) return null
      throw error
    }
  }

  /**
   * List the current user's applications
   * @param params - Filter and pagination parameters
   * @returns List of applications with pagination metadata
   */
  async list(params?: ListApplicationsParams): Promise<ListApplicationsResponse> {
    const queryParams = new URLSearchParams()
    if (params?.status) queryParams.append('status', params.status)
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())

    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return this.get<ListApplicationsResponse>(`/v1/applications${query}`)
  }

  /**
   * Get one application from the hiring side.
   *
   * Distinct from `retrieve()`, which is the applicant's projection: this
   * returns the same row shape `listForOrganization()` does — candidate
   * identity and stage history included — so a detail view and a kanban card
   * can be built from one transform rather than two that drift apart.
   *
   * 404 rather than 403 for an application outside the caller's
   * organizations, so the endpoint cannot be used to probe which ids exist.
   *
   * @param id - Application id
   * @returns The application with candidate, job and stage history embedded
   */
  async retrieveForOrganization(id: string): Promise<EmployerApplication> {
    return this.get<EmployerApplication>(`/v1/employer/applications/${id}`)
  }

  /**
   * List applications to jobs posted by organizations the caller can act for.
   *
   * This is the hiring side of the pipeline, not the candidate's own
   * applications — `list()` is scoped to the authenticated user and is what an
   * applicant sees. Access requires organization ownership or a qualifying
   * role; callers with no organizations receive an empty list rather than a
   * 403, so a personal account renders an empty pipeline instead of an error.
   *
   * @param params - Organization, job, stage and pagination filters
   * @returns Applications with candidate and job embedded
   */
  async listForOrganization(
    params?: ListEmployerApplicationsParams
  ): Promise<ListEmployerApplicationsResponse> {
    const queryParams = new URLSearchParams()
    if (params?.organization_id) queryParams.append('organization_id', params.organization_id)
    if (params?.job_id) queryParams.append('job_id', params.job_id)
    if (params?.status) queryParams.append('status', params.status)
    if (params?.assigned_to) queryParams.append('assigned_to', params.assigned_to)
    if (params?.min_score !== undefined) {
      queryParams.append('min_score', params.min_score.toString())
    }
    if (params?.date_from) queryParams.append('date_from', params.date_from)
    if (params?.date_to) queryParams.append('date_to', params.date_to)
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())

    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return this.get<ListEmployerApplicationsResponse>(`/v1/employer/applications${query}`)
  }

  /**
   * Move an application through the pipeline, or reassign it.
   *
   * The employer-side counterpart to `update()`, which is the applicant's and
   * cannot change status. Requires organization access; the server validates
   * the stage transition and records it in the activity log.
   *
   * @param id - The application ID
   * @param params - Status and/or assignee changes
   * @returns The updated application
   */
  async updateForOrganization(
    id: string,
    params: UpdateEmployerApplicationParams
  ): Promise<EmployerApplication> {
    return this.patch<EmployerApplication>(`/v1/employer/applications/${id}`, params)
  }

  /**
   * Get a presigned URL for uploading an application attachment
   * @param params - Upload parameters including application ID, attachment type, filename, and content type
   * @returns Presigned upload URL and storage path
   */
  async getUploadUrl(params: GetUploadUrlParams): Promise<GetUploadUrlResponse> {
    return this.post<GetUploadUrlResponse>('/v1/applications/upload-url', params)
  }

  /**
   * Confirm that a file was successfully uploaded
   * @param params - Upload confirmation including application ID, attachment type, path, and file metadata
   * @returns Updated application with the new attachment
   */
  async confirmUpload(params: ConfirmUploadParams): Promise<Application> {
    return this.post<Application>('/v1/applications/confirm-upload', params)
  }

  /**
   * Get activity feed for an application
   * @param applicationId - The application ID
   * @returns List of activity entries for the application
   */
  async getActivity(applicationId: string): Promise<{ data: ApplicationActivity[] }> {
    return this.get<{ data: ApplicationActivity[] }>(`/v1/applications/${applicationId}/activity`)
  }

  /**
   * Get messages for an application
   * @param applicationId - The application ID
   * @returns List of messages for the application
   */
  async getMessages(applicationId: string): Promise<GetMessagesResponse> {
    return this.get<GetMessagesResponse>(`/v1/applications/${applicationId}/messages`)
  }

  /**
   * Send a message on an application
   * @param params - Message parameters including application ID and message body
   * @returns The created message
   */
  async sendMessage(params: SendMessageParams): Promise<ApplicationMessage> {
    const { applicationId, body } = params
    return this.post<ApplicationMessage>(`/v1/applications/${applicationId}/messages`, { body })
  }
}
