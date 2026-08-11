import { describe, it, expect } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from './mocks/server'
import { Scaffald } from '../client'

const BASE = 'https://api.scaffald.com'

function category(overrides: Record<string, unknown> = {}) {
  return {
    category: 'white',
    applications: 10,
    interviewed: 6,
    offers: 3,
    hired: 2,
    withdrawn: 0,
    selectionRate: 0.2,
    impactRatio: 0.4,
    suppressed: false,
    ...overrides,
  }
}

const REPORT = {
  jobGroups: [
    {
      jobGroup: 'uncategorized',
      totalApplications: 10,
      totalHired: 2,
      categories: [category()],
    },
  ],
  gender: [category({ category: 'male' })],
  veteranStatus: [category({ category: 'non_veteran' })],
  disabilityStatus: [category({ category: 'no' })],
  totals: {
    applications: 10,
    hired: 2,
    withdrawn: 0,
    jobGroups: 1,
    selfIdentified: 10,
  },
  minCellSize: 5,
  coverage: { totalApplications: 40, selfIdentified: 10, uncategorizedJobs: 3 },
  periodStart: null,
  periodEnd: null,
}

describe('Compliance Resource — EEO report', () => {
  const client = new Scaffald({ apiKey: 'sk_test_123' })

  it('returns the report body as-is, with no envelope to unwrap', async () => {
    server.use(
      http.get(`${BASE}/v1/employer/eeo-report`, () => HttpResponse.json(REPORT)),
    )

    const report = await client.compliance.getEEOReport()

    expect(report.totals.applications).toBe(10)
    expect(report.jobGroups).toHaveLength(1)
    expect(report.minCellSize).toBe(5)
  })

  it('omits absent params rather than sending them as undefined', async () => {
    let search: string | null = null
    server.use(
      http.get(`${BASE}/v1/employer/eeo-report`, ({ request }) => {
        search = new URL(request.url).search
        return HttpResponse.json(REPORT)
      }),
    )

    await client.compliance.getEEOReport()

    // `organization_id=undefined` would 400 against the uuid schema.
    expect(search).toBe('')
  })

  it('passes organisation and period through', async () => {
    let params: URLSearchParams | null = null
    server.use(
      http.get(`${BASE}/v1/employer/eeo-report`, ({ request }) => {
        params = new URL(request.url).searchParams
        return HttpResponse.json(REPORT)
      }),
    )

    await client.compliance.getEEOReport({
      organization_id: 'org_1',
      period_start: '2026-01-01',
      period_end: '2026-03-31',
    })

    expect(params!.get('organization_id')).toBe('org_1')
    expect(params!.get('period_start')).toBe('2026-01-01')
    expect(params!.get('period_end')).toBe('2026-03-31')
  })

  it('preserves a null impactRatio instead of coercing it to zero', async () => {
    // Null means "cannot be computed" — no applicants, nobody hired anywhere,
    // or a suppressed cell. Coercing it to 0 would render as "0% ⚠ Flag" and
    // report adverse impact that was never measured.
    server.use(
      http.get(`${BASE}/v1/employer/eeo-report`, () =>
        HttpResponse.json({
          ...REPORT,
          gender: [
            category({ category: 'male', impactRatio: null, selectionRate: null }),
          ],
        }),
      ),
    )

    const report = await client.compliance.getEEOReport()

    expect(report.gender[0]?.impactRatio).toBeNull()
    expect(report.gender[0]?.selectionRate).toBeNull()
  })
})
