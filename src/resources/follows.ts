import { Resource } from './base.js'

export interface Follow {
  id: string
  follower_id: string
  follower_type: 'user'
  followee_id: string
  followee_type: 'user' | 'organization' | 'job'
  created_at: string
  follower?: {
    id: string
    first_name: string
    last_name: string
    avatar_url?: string
  }
  followee?: {
    id: string
    name: string
    avatar_url?: string
  }
}

export interface FollowUserParams {
  targetUserId: string
}

export interface FollowsListResponse {
  data: Follow[]
  total: number
}

export interface FollowStatusResponse {
  isFollowing: boolean
  followId?: string
}

export interface SavedJobFollow {
  id: string
  followee_id: string
  created_at: string
}

export interface SavedJobsResponse {
  data: SavedJobFollow[]
  total: number
}

export class Follows extends Resource {
  /**
   * Get users that the current user is following
   */
  async getFollowing(params?: { limit?: number; offset?: number }): Promise<FollowsListResponse> {
    const queryParams = new URLSearchParams()
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString())
    if (params?.offset !== undefined) queryParams.append('offset', params.offset.toString())
    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return this.get<FollowsListResponse>(`/v1/follows/following${query}`)
  }

  /**
   * Get users following the current user
   */
  async getFollowers(params?: { limit?: number; offset?: number }): Promise<FollowsListResponse> {
    const queryParams = new URLSearchParams()
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString())
    if (params?.offset !== undefined) queryParams.append('offset', params.offset.toString())
    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return this.get<FollowsListResponse>(`/v1/follows/followers${query}`)
  }

  /**
   * Check if current user is following another user
   */
  async getStatus(userId: string): Promise<FollowStatusResponse> {
    return this.get<FollowStatusResponse>(`/v1/follows/status/${userId}`)
  }

  /**
   * Follow a user
   */
  async followUser(params: FollowUserParams): Promise<Follow> {
    // The route wraps in `{ data }` and the http client returns the body
    // verbatim, so unwrap here rather than widen the signature — every caller
    // and the hook's own generic already expect the payload (#744).
    const res = await this.post<{ data: Follow }>('/v1/follows/user', params)
    return res.data
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(userId: string): Promise<void> {
    return this.del<void>(`/v1/follows/user/${userId}`)
  }

  /**
   * Save (follow) a job so it can be revisited later.
   */
  async followJob(jobId: string): Promise<Follow> {
    // The route wraps in `{ data }` and the http client returns the body
    // verbatim, so unwrap here rather than widen the signature — every caller
    // and the hook's own generic already expect the payload (#744).
    const res = await this.post<{ data: Follow }>('/v1/follows/job', { jobId })
    return res.data
  }

  /**
   * Remove a job from saved jobs.
   */
  async unfollowJob(jobId: string): Promise<void> {
    return this.del<void>(`/v1/follows/job/${jobId}`)
  }

  /**
   * Check whether the current user has saved a job.
   */
  async getJobFollowStatus(jobId: string): Promise<FollowStatusResponse> {
    return this.get<FollowStatusResponse>(`/v1/follows/status/job/${jobId}`)
  }

  /**
   * List the current user's saved jobs (follow rows; pair the followee_id with
   * job data from the jobs resource to render).
   */
  async listSavedJobs(params?: { limit?: number; offset?: number }): Promise<SavedJobsResponse> {
    const queryParams = new URLSearchParams()
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString())
    if (params?.offset !== undefined) queryParams.append('offset', params.offset.toString())
    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return this.get<SavedJobsResponse>(`/v1/follows/saved-jobs${query}`)
  }
}
