import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from './mocks/server'
import { Scaffald } from '../client'
import { APIError } from '../http/errors'

describe('Applications Resource', () => {
  const client = new Scaffald({
    apiKey: 'sk_test_123',
  })

  describe('create', () => {
    it('should create a new application', async () => {
      const newApplication = await client.applications.create({
        job_id: 'job_123',
        current_location: 'San Francisco, CA',
        willing_to_relocate: true,
        years_experience: 5,
        is_authorized_to_work: true,
        earliest_start_date: '2024-02-01',
        is_complete: true,
      })

      expect(newApplication).toHaveProperty('id')
      expect(newApplication.job_id).toBe('job_123')
      expect(newApplication.status).toBe('pending')
    })

    it('should create application with custom questions', async () => {
      const newApplication = await client.applications.create({
        job_id: 'job_123',
        current_location: 'New York, NY',
        willing_to_relocate: false,
        years_experience: 3,
        is_authorized_to_work: true,
        earliest_start_date: '2024-03-01',
        custom_question_answers: [
          {
            question_id: 'q1',
            question: 'Why do you want this job?',
            answer: 'I am passionate about this field',
            type: 'long_text',
          },
        ],
        is_complete: true,
      })

      expect(newApplication.custom_question_answers).toHaveLength(1)
    })
  })

  describe('retrieve', () => {
    it('should retrieve an application by id', async () => {
      const application = await client.applications.retrieve('app_123')

      expect(application).toHaveProperty('id')
      expect(application.id).toBe('app_123')
      expect(application).toHaveProperty('job_id')
      expect(application).toHaveProperty('status')
    })
  })

  describe('update', () => {
    it('should update an application', async () => {
      const updated = await client.applications.update('app_123', {
        status: 'reviewing',
        is_complete: true,
      })

      expect(updated).toHaveProperty('id')
      expect(updated.id).toBe('app_123')
    })

    it('should update application with new answers', async () => {
      const updated = await client.applications.update('app_123', {
        screening_answers: {
          question1: 'Updated answer',
        },
      })

      expect(updated.screening_answers).toBeDefined()
    })
  })

  describe('withdraw', () => {
    it('should withdraw an application', async () => {
      const withdrawn = await client.applications.withdraw('app_123')

      expect(withdrawn).toHaveProperty('id')
      expect(withdrawn.status).toBe('withdrawn')
    })

    it('should withdraw with reason', async () => {
      const withdrawn = await client.applications.withdraw('app_123', {
        reason: 'Accepted another offer',
      })

      expect(withdrawn.status).toBe('withdrawn')
    })
  })

  // SC-104: getMyForJob must distinguish "no application" (404 → null) from
  // every other error so the UI can render a real error state instead of an
  // identical empty state.
  describe('getMyForJob', () => {
    // Use a retry-free client for the non-404 cases so the test doesn't have
    // to wait through exponential backoff on retryable status codes.
    const noRetryClient = new Scaffald({ apiKey: 'sk_test_123', maxRetries: 0 })

    it('returns null on 404', async () => {
      server.use(
        http.get(
          'https://api.scaffald.com/v1/jobs/:jobId/applications/me',
          () =>
            HttpResponse.json(
              { error: { message: 'No application found' } },
              { status: 404 }
            )
        )
      )

      const result = await client.applications.getMyForJob('job_404')
      expect(result).toBeNull()
    })

    it('propagates 5xx errors instead of collapsing to null', async () => {
      server.use(
        http.get(
          'https://api.scaffald.com/v1/jobs/:jobId/applications/me',
          () =>
            HttpResponse.json(
              { error: { message: 'database is down' } },
              { status: 500 }
            )
        )
      )

      await expect(
        noRetryClient.applications.getMyForJob('job_500')
      ).rejects.toThrow(APIError)
    })

    it('propagates 401 unauthorized instead of collapsing to null', async () => {
      server.use(
        http.get(
          'https://api.scaffald.com/v1/jobs/:jobId/applications/me',
          () =>
            HttpResponse.json(
              { error: { message: 'unauthenticated' } },
              { status: 401 }
            )
        )
      )

      await expect(
        noRetryClient.applications.getMyForJob('job_401')
      ).rejects.toThrow()
    })
  })
  describe('listForOrganization', () => {
    const employerRow = {
      id: 'app_1',
      job_id: 'job_1',
      user_id: 'user_1',
      status: 'pending',
      created_at: '2026-08-01T00:00:00Z',
      updated_at: null,
      stage_changed_at: null,
      score_total: 82,
      source: 'scaffald',
      union_status: null,
      assigned_to: null,
      is_shortlisted: false,
      screening_answers: { years_experience: 5 },
      attachment_metadata: {},
      candidate: {
        id: 'user_1',
        display_name: 'Eric Wong',
        username: 'ewong',
        headline: null,
        avatar_url: null,
        avatar_path: null,
      },
      job: {
        id: 'job_1',
        title: 'Senior Software Engineer',
        location: 'Clare, MI',
        employment_type: 'full_time',
        organization_id: 'org_1',
        pay_range_min_cents: 12000000,
        pay_range_max_cents: 16000000,
        pay_range_type: 'salary',
      },
    }

    it('hits the employer route, not the candidate one', async () => {
      let seenPath: string | null = null

      server.use(
        http.get('*/v1/employer/applications', ({ request }) => {
          seenPath = new URL(request.url).pathname
          return HttpResponse.json({
            data: [employerRow],
            total: 1,
            limit: 50,
            offset: 0,
          })
        })
      )

      const result = await client.applications.listForOrganization()

      expect(seenPath).toBe('/v1/employer/applications')
      expect(result.total).toBe(1)
      expect(result.data[0].candidate?.display_name).toBe('Eric Wong')
      expect(result.data[0].job?.title).toBe('Senior Software Engineer')
      expect(result.data[0].score_total).toBe(82)
    })

    it('serialises every filter into the query string', async () => {
      let query = new URLSearchParams()

      server.use(
        http.get('*/v1/employer/applications', ({ request }) => {
          query = new URL(request.url).searchParams
          return HttpResponse.json({ data: [], total: 0, limit: 25, offset: 50 })
        })
      )

      await client.applications.listForOrganization({
        organization_id: 'org_1',
        job_id: 'job_1',
        status: 'interview',
        assigned_to: 'user_9',
        min_score: 0,
        date_from: '2026-01-01',
        date_to: '2026-06-30',
        limit: 25,
        offset: 50,
      })

      expect(query.get('organization_id')).toBe('org_1')
      expect(query.get('job_id')).toBe('job_1')
      expect(query.get('status')).toBe('interview')
      expect(query.get('assigned_to')).toBe('user_9')
      expect(query.get('date_from')).toBe('2026-01-01')
      expect(query.get('date_to')).toBe('2026-06-30')
      expect(query.get('limit')).toBe('25')
      expect(query.get('offset')).toBe('50')
    })

    it('sends min_score=0 rather than dropping it', async () => {
      // A truthiness check would swallow 0, silently turning "show everything"
      // into "no score filter" — same value, but the caller cannot express an
      // explicit floor of zero.
      let query = new URLSearchParams()

      server.use(
        http.get('*/v1/employer/applications', ({ request }) => {
          query = new URL(request.url).searchParams
          return HttpResponse.json({ data: [], total: 0, limit: 50, offset: 0 })
        })
      )

      await client.applications.listForOrganization({ min_score: 0 })

      expect(query.get('min_score')).toBe('0')
    })

    it('omits filters that were not supplied', async () => {
      let query = new URLSearchParams()

      server.use(
        http.get('*/v1/employer/applications', ({ request }) => {
          query = new URL(request.url).searchParams
          return HttpResponse.json({ data: [], total: 0, limit: 50, offset: 0 })
        })
      )

      await client.applications.listForOrganization({ status: 'hired' })

      expect(query.get('status')).toBe('hired')
      expect(query.get('organization_id')).toBeNull()
      expect(query.get('min_score')).toBeNull()
    })
  })
})
