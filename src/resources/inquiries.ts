import { Resource } from './base.js'

// ===========================
// Types
// ===========================

export type InquiryStatus = 'pending' | 'responded' | 'archived'
export type InquiryType = 'general' | 'job_inquiry' | 'support' | 'feedback'

export interface Inquiry {
  id: string
  sender_id: string
  recipient_id: string
  subject: string
  message: string
  inquiry_type: InquiryType
  job_id?: string | null
  status: InquiryStatus
  response?: string | null
  responded_at?: string | null
  template_id?: string | null
  created_at: string
  updated_at: string
}

export interface InquiryTemplate {
  id: string
  name: string
  subject: string
  message: string
  inquiry_type: InquiryType
}

// ===========================
// Request Types
// ===========================

export interface CreateInquiryParams {
  recipient_id: string
  subject?: string
  message?: string
  inquiry_type?: InquiryType
  job_id?: string
  template_id?: string
}

export interface ListInquiriesParams {
  direction?: 'sent' | 'received'
  status?: InquiryStatus
  inquiry_type?: InquiryType
  page?: number
  limit?: number
}

export interface RespondToInquiryParams {
  message: string
}

export interface TemplatesParams {
  inquiry_type?: InquiryType
}

// ===========================
// Response Types
// ===========================

export interface InquiriesListResponse {
  data: Inquiry[]
  pagination: {
    total: number
    page: number
    limit: number
    total_pages: number
  }
}

export interface InquiryResponse {
  data: Inquiry
}

/**
 * A capability inquiry attached to an application, with everything hanging off
 * it. Distinct from `Inquiry`: this models the ATS capability-inquiry feature
 * (`core.application_inquiries`), not sender/recipient messaging.
 *
 * Returned bare rather than under a `data` key, matching the endpoint.
 */
export interface InquiryDetails {
  inquiry: ApplicationInquiry
  sections: InquirySection[]
  comments: InquiryComment[]
  capabilityResponses: InquiryCapabilityResponse[]
}

export interface ApplicationInquiry {
  id: string
  application_id: string
  status: string
  created_at: string
  updated_at: string
  created_by?: string | null
  sent_at?: string | null
  /** The schema carries a wide set of negotiable-term columns; passed through. */
  [key: string]: unknown
}

export interface InquirySection {
  id: string
  inquiry_id: string
  section_name: string
  [key: string]: unknown
}

/** Mirrors core.inquiry_comments; every field below is NOT NULL in the schema. */
export interface InquiryComment {
  id: string
  inquiry_id: string
  section_name: string
  sender_id: string
  content: string
  read_by: string[]
  created_at: string
  [key: string]: unknown
}

export interface InquiryCapabilityResponse {
  id: string
  inquiry_id: string
  capability_name: string
  response_value?: boolean | null
  response_text?: string | null
  [key: string]: unknown
}

export interface TemplatesResponse {
  data: InquiryTemplate[]
}

export interface BulkMarkAsReadResponse {
  data: {
    updated_count: number
  }
}

export interface BulkArchiveResponse {
  data: {
    archived_count: number
  }
}

/**
 * Inquiries resource - messaging and inquiry operations
 * Handles creating, sending, and managing inquiries between users
 */
export class Inquiries extends Resource {
  /**
   * List inquiries (sent or received)
   */
  async list(params?: ListInquiriesParams): Promise<InquiriesListResponse> {
    return super.get<InquiriesListResponse>('/v1/inquiries', params)
  }

  /**
   * Get inquiry by ID
   */
  async getById(id: string): Promise<InquiryResponse> {
    return super.get<InquiryResponse>(`/v1/inquiries/${id}`)
  }

  /**
   * Create a new inquiry
   */
  async create(params: CreateInquiryParams): Promise<InquiryResponse> {
    return this.post<InquiryResponse>('/v1/inquiries', params)
  }

  /**
   * Respond to an inquiry
   */
  async respond(id: string, params: RespondToInquiryParams): Promise<InquiryResponse> {
    return this.post<InquiryResponse>(`/v1/inquiries/${id}/respond`, params)
  }

  /**
   * Get inquiry templates
   */
  async templates(params?: TemplatesParams): Promise<TemplatesResponse> {
    return super.get<TemplatesResponse>('/v1/inquiries/templates', params)
  }

  /**
   * Mark multiple inquiries as read
   */
  async bulkMarkAsRead(inquiryIds: string[]): Promise<BulkMarkAsReadResponse> {
    return this.post<BulkMarkAsReadResponse>('/v1/inquiries/bulk/mark-read', {
      inquiry_ids: inquiryIds,
    })
  }

  /**
   * Archive multiple inquiries
   */
  async bulkArchive(inquiryIds: string[]): Promise<BulkArchiveResponse> {
    return this.post<BulkArchiveResponse>('/v1/inquiries/bulk/archive', {
      inquiry_ids: inquiryIds,
    })
  }

  /**
   * Get templates for a specific application
   */
  async getTemplates(applicationId: string): Promise<any[]> {
    return super.get<any[]>('/v1/inquiries/templates', { application_id: applicationId })
  }

  /**
   * Get inquiry history / audit trail
   */
  async getHistory(inquiryId: string): Promise<any[]> {
    return super.get<any[]>(`/v1/inquiries/${inquiryId}/history`)
  }

  /**
   * Get the capability inquiry attached to an application, with its sections,
   * comments and capability responses.
   *
   * Resolves to `null` when the application has no inquiry yet — that is a
   * normal state, not an error, and callers should render an empty state rather
   * than a failure.
   *
   * Note this reads the ATS capability-inquiry feature
   * (`core.application_inquiries`), which is a different concept from the
   * sender/recipient `Inquiry` that `list` and `create` model.
   */
  async getByApplication(applicationId: string): Promise<InquiryDetails | null> {
    return super.get<InquiryDetails | null>(
      `/v1/inquiries/by-application/${applicationId}`,
    )
  }
}
