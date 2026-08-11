import { Resource } from './base.js'

export interface SchedulingSlot {
  id: string
  slot_start: string
  slot_end: string
  timezone: string
  location_type: 'video' | 'phone' | 'in_person'
  location_details: string | null
  meeting_link: string | null
}

export interface SchedulingLink {
  organizationName: string
  jobTitle: string
  expiresAt: string
  alreadyBooked: boolean
  slots: SchedulingSlot[]
}

export interface InterviewBooking {
  id: string
  slot_id: string
  booked_at: string
  slot?: SchedulingSlot
}

/**
 * A slot as the *employer* sees it.
 *
 * Distinct from `SchedulingSlot`, which is the candidate's redacted view
 * behind a link token: this one carries the application, organisation and
 * lifecycle status the office pipeline needs.
 */
export interface EmployerInterviewSlot {
  id: string
  application_id: string
  organization_id: string
  proposed_by: string
  slot_start: string
  slot_end: string
  timezone: string
  location_type: 'video' | 'phone' | 'in_person'
  location_details: string | null
  meeting_link: string | null
  status: 'proposed' | 'booked' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  notes: string | null
  created_at: string
}

/**
 * A self-scheduling link row.
 *
 * Distinct from `SchedulingLink`, which is what redeeming a token returns.
 */
export interface EmployerSchedulingLink {
  id: string
  application_id: string
  organization_id: string
  token: string
  expires_at: string
  max_bookings: number | null
  current_bookings: number | null
  is_active: boolean
  created_at: string
}

/**
 * Scope for the employer list calls.
 *
 * `application_id` is optional on purpose: the office scheduling screen is
 * organisation-wide, so omitting it lists across every organisation the caller
 * can act for.
 */
export interface ListEmployerSchedulingParams {
  application_id?: string
}

export interface CreateInterviewSlotParams {
  application_id: string
  slot_start: string
  slot_end: string
  timezone: string
  location_type: 'video' | 'phone' | 'in_person'
  location_details?: string
  meeting_link?: string
  notes?: string
}

export interface CreateSchedulingLinkParams {
  application_id: string
  expires_at: string
  max_bookings?: number
}

export class Scheduling extends Resource {
  /**
   * Resolve a scheduling link by token — returns the proposed interview slots
   * and context (org/job). The caller must be the applicant of the linked
   * application (enforced server-side).
   */
  async getLink(token: string): Promise<SchedulingLink> {
    return this.get<SchedulingLink>(`/v1/scheduling/${token}`)
  }

  /**
   * Book a proposed slot via the scheduling link token.
   */
  async bookSlot(token: string, slotId: string): Promise<InterviewBooking> {
    const res = await this.post<{ data: InterviewBooking }>(
      `/v1/scheduling/${token}/book`,
      { slotId },
    )
    return res.data
  }

  /**
   * List interview slots from the hiring side.
   *
   * Omit `application_id` for the organisation-wide schedule.
   */
  async listSlots(
    params?: ListEmployerSchedulingParams,
  ): Promise<EmployerInterviewSlot[]> {
    const queryParams = new URLSearchParams()
    if (params?.application_id) {
      queryParams.append('application_id', params.application_id)
    }
    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    const res = await this.get<{ data: EmployerInterviewSlot[] }>(
      `/v1/employer/scheduling/slots${query}`,
    )
    return res.data
  }

  /**
   * Propose an interview slot to a candidate.
   */
  async createSlot(
    params: CreateInterviewSlotParams,
  ): Promise<EmployerInterviewSlot> {
    return this.post<EmployerInterviewSlot>(
      '/v1/employer/scheduling/slots',
      params,
    )
  }

  /**
   * List self-scheduling links from the hiring side.
   *
   * Omit `application_id` for every link the caller's organisations have open.
   */
  async listLinks(
    params?: ListEmployerSchedulingParams,
  ): Promise<EmployerSchedulingLink[]> {
    const queryParams = new URLSearchParams()
    if (params?.application_id) {
      queryParams.append('application_id', params.application_id)
    }
    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    const res = await this.get<{ data: EmployerSchedulingLink[] }>(
      `/v1/employer/scheduling/links${query}`,
    )
    return res.data
  }

  /**
   * Mint a self-scheduling link for an application.
   *
   * The token is generated server-side and is not caller-supplied.
   */
  async createLink(
    params: CreateSchedulingLinkParams,
  ): Promise<EmployerSchedulingLink> {
    return this.post<EmployerSchedulingLink>(
      '/v1/employer/scheduling/links',
      params,
    )
  }
}
