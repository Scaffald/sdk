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
}
