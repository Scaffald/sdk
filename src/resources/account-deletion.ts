import { Resource } from './base.js'

/**
 * A deletion request as the API reports it. The account is deleted on
 * `scheduledFor` (14 days after the request, Scaffald/SaaS#1313); until then
 * the owner can still sign in and cancel.
 */
export interface RequestDeletionResponse {
  id: string
  /** pending | in_progress | failed | partial (open); completed | cancelled */
  status: string
  createdAt: string
  requestedAt: string
  scheduledFor: string
  /** True while the owner may still cancel (pending, or failed before anything was deleted). */
  canCancel: boolean
}

export interface RequestWorkerDeletionParams {
  reason?: string
}

export interface RequestOrganizationDeletionParams {
  organizationId: string
  reason?: string
}

export interface DeletionStatusResponse {
  /** The signed-in user's open request, or null. */
  request: RequestDeletionResponse | null
}

export interface CancelDeletionResponse {
  id: string
  status: 'cancelled'
  cancelledAt: string
}

export interface OfficeAccountDeletion {
  id: string
  deletionType: 'worker' | 'organization'
  deletedUserId: string | null
  deletedOrganizationId: string | null
  status: string
  requestedAt: string
  scheduledFor: string
  attempts: number
  lastAttemptAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  errorMessage: string | null
  /** Not finished 30 days after the request. */
  overdue: boolean
  /** Organization requests are not carried out automatically. */
  needsManualHandling: boolean
}

export interface ListOfficeAccountDeletionsParams {
  /** `attention` (default): failed, partial, overdue, organization. */
  filter?: 'attention' | 'all'
  limit?: number
}

export class AccountDeletion extends Resource {
  async requestWorkerDeletion(
    params?: RequestWorkerDeletionParams
  ): Promise<RequestDeletionResponse> {
    return this.post<RequestDeletionResponse>('/v1/account-deletion/worker', params ?? {})
  }

  async requestOrganizationDeletion(
    params: RequestOrganizationDeletionParams
  ): Promise<RequestDeletionResponse> {
    return this.post<RequestDeletionResponse>('/v1/account-deletion/organization', params)
  }

  /** The signed-in user's open deletion request, if any. */
  async getStatus(): Promise<DeletionStatusResponse> {
    return this.get<DeletionStatusResponse>('/v1/account-deletion/status')
  }

  /** Cancel the signed-in user's request during the grace period. */
  async cancel(): Promise<CancelDeletionResponse> {
    return this.post<CancelDeletionResponse>('/v1/account-deletion/cancel', {})
  }

  /** Office: requests that need a person (office role). */
  async listForOffice(
    params?: ListOfficeAccountDeletionsParams
  ): Promise<{ requests: OfficeAccountDeletion[] }> {
    return this.get<{ requests: OfficeAccountDeletion[] }>('/v1/office/account-deletions', params)
  }
}
