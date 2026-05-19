import { Resource } from './base.js'

// ===========================
// Types
// ===========================

export type PunchlistStatus = 'active' | 'completed' | 'archived'

export interface Punchlist {
  id: string
  organization_id: string
  project_id: string | null
  name: string
  description: string | null
  status: PunchlistStatus
  target_date: string | null
  created_by_user_id: string
  created_at: string
  updated_at: string
}

export interface PunchlistsListResponse {
  punchlists: Punchlist[]
  totalCount: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface ListPunchlistsParams {
  organizationId?: string
  status?: PunchlistStatus
  projectId?: string
  search?: string
  page?: number
  pageSize?: number
}

export interface CreatePunchlistParams {
  organizationId: string
  name: string
  description?: string
  status?: PunchlistStatus
  projectId?: string | null
  targetDate?: string
}

export interface UpdatePunchlistParams {
  punchlistId: string
  name?: string
  description?: string | null
  status?: PunchlistStatus
  projectId?: string | null
  targetDate?: string | null
}

/**
 * Punchlists resource — named buckets of Tasks (sprint / milestone / release).
 * Backed by `core.punchlists` and exposed at `/v1/punchlists`.
 */
export class Punchlists extends Resource {
  async list(params?: ListPunchlistsParams): Promise<PunchlistsListResponse> {
    return this.get<PunchlistsListResponse>('/v1/punchlists', params)
  }

  async getById(punchlistId: string): Promise<Punchlist> {
    return this.get<Punchlist>(`/v1/punchlists/${punchlistId}`)
  }

  async create(params: CreatePunchlistParams): Promise<Punchlist> {
    return this.post<Punchlist>('/v1/punchlists', params)
  }

  async update(params: UpdatePunchlistParams): Promise<Punchlist> {
    const { punchlistId, ...body } = params
    return this.patch<Punchlist>(`/v1/punchlists/${punchlistId}`, body)
  }

  async delete(punchlistId: string): Promise<void> {
    return this.del<void>(`/v1/punchlists/${punchlistId}`)
  }
}
