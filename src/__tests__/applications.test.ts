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
})
