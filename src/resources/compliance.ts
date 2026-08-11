import { Resource } from './base.js'

/**
 * One row of an EEO tabulation — a category within a dimension.
 *
 * Every field is a count or a derived rate. There is deliberately no
 * identifier here: the API returns aggregates only, because
 * `core.eeo_self_identification` holds protected-class data that employers
 * must never read at row level.
 */
export interface EEOCategoryTotals {
  category: string
  applications: number
  interviewed: number
  offers: number
  hired: number
  /** Counted separately: a withdrawal is not a rejection. */
  withdrawn: number
  /** hired / applications, excluding withdrawn. Null when nobody applied. */
  selectionRate: number | null
  /**
   * Four-fifths ratio against the most-selected group. **Null is meaningful**
   * — it means the ratio cannot be computed (no applicants, nobody hired
   * anywhere, or the cell is suppressed), not that the ratio is zero. Render
   * it as "—", never as 0%.
   */
  impactRatio: number | null
  /** True when the cell is too small to publish without re-identifying people. */
  suppressed: boolean
}

export interface EEOJobGroup {
  jobGroup: string
  totalApplications: number
  totalHired: number
  categories: EEOCategoryTotals[]
}

export interface EEOReport {
  /** Ethnicity, tabulated within each `jobs.eeo_job_category`. */
  jobGroups: EEOJobGroup[]
  gender: EEOCategoryTotals[]
  veteranStatus: EEOCategoryTotals[]
  disabilityStatus: EEOCategoryTotals[]
  totals: {
    applications: number
    hired: number
    withdrawn: number
    jobGroups: number
    selfIdentified: number
  }
  /** Cells with fewer applicants than this are suppressed. */
  minCellSize: number
  /**
   * How much of the pipeline this report actually covers.
   *
   * `selfIdentified` out of `totalApplications` is the denominator a reader
   * needs before acting on any ratio — self-identification is voluntary, so a
   * report over 4 of 900 applicants is not evidence of anything.
   */
  coverage: {
    totalApplications: number
    selfIdentified: number
    /** Requisitions with no `eeo_job_category`, which roll up as uncategorized. */
    uncategorizedJobs: number
  }
  periodStart: string | null
  periodEnd: string | null
}

export interface GetEEOReportParams {
  organization_id?: string
  /** ISO date. Filters on application creation. */
  period_start?: string
  period_end?: string
}

export class Compliance extends Resource {
  /**
   * Aggregate EEO report for the organisations the caller can act for.
   *
   * Counts only — there is no endpoint that returns an individual
   * self-identification, by design.
   */
  async getEEOReport(params?: GetEEOReportParams): Promise<EEOReport> {
    const queryParams = new URLSearchParams()
    if (params?.organization_id) {
      queryParams.append('organization_id', params.organization_id)
    }
    if (params?.period_start) queryParams.append('period_start', params.period_start)
    if (params?.period_end) queryParams.append('period_end', params.period_end)

    const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return this.get<EEOReport>(`/v1/employer/eeo-report${query}`)
  }
}
