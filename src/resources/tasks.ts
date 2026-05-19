import { Resource } from './base.js'

// ===========================
// Types
// ===========================

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Task {
  id: string
  organization_id: string
  project_id: string | null
  punchlist_id: string | null
  team_slug: string | null
  title: string
  description: string | null
  assignee_user_id: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  source: string | null
  completed_at: string | null
  created_by_user_id: string
  created_at: string
  updated_at: string
}

export interface TasksListResponse {
  tasks: Task[]
  totalCount: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface ListTasksParams {
  organizationId?: string
  status?: TaskStatus | TaskStatus[]
  assigneeUserId?: string
  projectId?: string
  punchlistId?: string
  teamSlug?: string
  search?: string
  page?: number
  pageSize?: number
  sortField?: 'created_at' | 'updated_at' | 'due_date' | 'priority'
  sortDirection?: 'asc' | 'desc'
}

export interface CreateTaskParams {
  organizationId: string
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  dueDate?: string
  assigneeUserId?: string | null
  projectId?: string | null
  punchlistId?: string | null
  teamSlug?: string | null
  source?: string | null
}

export interface UpdateTaskParams {
  taskId: string
  title?: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  dueDate?: string | null
  assigneeUserId?: string | null
  projectId?: string | null
  punchlistId?: string | null
  teamSlug?: string | null
}

export interface CompleteTaskParams {
  taskId: string
  /** Optional work log id to link via core.work_log_tasks. */
  workLogId?: string
}

/**
 * Tasks resource — first-class units of work scoped to an organization.
 * Backed by `core.tasks` and exposed at `/v1/tasks`. See migration
 * `325_tasks_and_punchlists.sql` for the schema.
 */
export class Tasks extends Resource {
  async list(params?: ListTasksParams): Promise<TasksListResponse> {
    const query: Record<string, unknown> = { ...params }
    if (Array.isArray(params?.status)) {
      query.status = params.status.join(',')
    }
    return this.get<TasksListResponse>('/v1/tasks', query)
  }

  async getById(taskId: string): Promise<Task> {
    return this.get<Task>(`/v1/tasks/${taskId}`)
  }

  async create(params: CreateTaskParams): Promise<Task> {
    return this.post<Task>('/v1/tasks', params)
  }

  async update(params: UpdateTaskParams): Promise<Task> {
    const { taskId, ...body } = params
    return this.patch<Task>(`/v1/tasks/${taskId}`, body)
  }

  async delete(taskId: string): Promise<void> {
    return this.del<void>(`/v1/tasks/${taskId}`)
  }

  async complete(params: CompleteTaskParams): Promise<Task> {
    return this.post<Task>(`/v1/tasks/${params.taskId}/complete`, {
      workLogId: params.workLogId,
    })
  }
}
