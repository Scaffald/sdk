import { Resource } from './base.js'

// ============================================================================
// Type Definitions
// ============================================================================

export type LegalDocType = 'terms_of_service' | 'privacy_policy'

export interface LegalDocument {
  doc_type: LegalDocType
  version: string
  effective_at: string
  url: string
  title: string | null
}

export interface LegalDocumentsResponse {
  documents: LegalDocument[]
}

// ============================================================================
// Legal Resource
// ============================================================================

/**
 * Public legal document metadata — the currently-published version of each
 * legal document (Terms of Service, Privacy Policy). No authentication
 * required; the per-user acceptance state lives on prerequisites.check().
 */
export class Legal extends Resource {
  /**
   * Get the currently-published legal documents.
   *
   * @example
   * const { documents } = await client.legal.getCurrent()
   * const terms = documents.find((d) => d.doc_type === 'terms_of_service')
   */
  async getCurrent(): Promise<LegalDocumentsResponse> {
    return this.get<LegalDocumentsResponse>('/v1/legal')
  }
}
