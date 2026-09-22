import { Resource } from './base.js'

/**
 * Platform settings held in `core.system_config`.
 *
 * The table is service-role only by design — it holds operational limits
 * (storage caps, photo limits, the site-overlap threshold) that only the
 * office role may read or change. Clients reach it through these endpoints
 * rather than through PostgREST, which is why the admin screen that queried
 * the table directly answered 42501 on every load.
 */

export interface GeographicSettings {
  /**
   * How much two sites may overlap before the platform flags them, as a
   * percentage. Stored as `site_overlap_threshold_percent`.
   */
  siteOverlapThresholdPercent: number
  updatedAt: string | null
}

export class OfficeSettings extends Resource {
  async getGeographic(): Promise<GeographicSettings> {
    return this.get<GeographicSettings>('/v1/office/settings/geographic')
  }

  async updateGeographic(
    params: Pick<GeographicSettings, 'siteOverlapThresholdPercent'>,
  ): Promise<GeographicSettings> {
    return this.put<GeographicSettings>('/v1/office/settings/geographic', params)
  }
}
