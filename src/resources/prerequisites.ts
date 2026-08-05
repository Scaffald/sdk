import { Resource } from './base.js'

// ============================================================================
// Type Definitions
// ============================================================================

// Onboarding prerequisites types
export interface PrerequisiteAddress {
  street: string
  city: string
  state: string
  zip: string
  country: string
  latitude?: number
  longitude?: number
}

export type UserType = 'worker' | 'employer' | 'customer'

export interface PrerequisitesData {
  first_name: string
  last_name: string
  address: PrerequisiteAddress | null
  user_types: UserType[]
  industry_id: string
}

/**
 * Per-document acceptance state. `requiredVersion` comes from the server's
 * core.legal_documents is_current row — clients never embed a version
 * constant. Versions are opaque, equality-compared strings.
 */
export interface LegalDocState {
  requiredVersion: string
  effectiveAt: string
  url: string
  acceptedVersion: string | null
  acceptedAt: string | null
  needsAcceptance: boolean
}

export interface LegalState {
  needsAcceptance: boolean
  documents: {
    terms_of_service: LegalDocState
    privacy_policy: LegalDocState
  }
}

export interface PrerequisitesCheckResponse {
  /** Profile complete AND both legal docs accepted at their current versions */
  isComplete: boolean
  hasName: boolean
  hasAddress: boolean
  hasUserTypes: boolean
  hasIndustry: boolean
  /** Accepted AND the accepted version equals the current published version */
  hasAcceptedPrivacy: boolean
  hasAcceptedTerms: boolean
  completedAt: string | null
  /** Profile fields missing → route to the full onboarding form */
  needsOnboarding: boolean
  /** Profile complete but legal missing/stale → route to the re-accept screen */
  needsLegalAcceptance: boolean
  legal: LegalState
  data: PrerequisitesData
}

export interface CompletePrerequisitesParams {
  first_name: string
  last_name: string
  address: PrerequisiteAddress
  user_types: UserType[]
  industry_id: string
  // SC-113: server requires both legal acceptances (z.literal(true) per
  // SC-110). Declaring them on the SDK type so a typed builder can't silently
  // strip them in transit. Modeled as `boolean` to match the typical
  // form-state source; server enforces truthiness on receipt.
  accepts_privacy_policy: boolean
  accepts_terms_of_service: boolean
}

export interface CompletePrerequisitesResponse {
  success: boolean
}

export interface AcceptLegalParams {
  accepts_terms_of_service: boolean
  accepts_privacy_policy: boolean
}

export interface AcceptLegalResponse {
  success: boolean
}

// ============================================================================
// Prerequisites Resource
// ============================================================================

/**
 * Prerequisites resource for managing user onboarding requirements
 */
export class Prerequisites extends Resource {
  /**
   * Check overall prerequisites status for current user, including whether
   * the currently-published legal document versions have been accepted.
   */
  async check(): Promise<PrerequisitesCheckResponse> {
    return this.get<PrerequisitesCheckResponse>('/v1/prerequisites/check')
  }

  /**
   * Complete prerequisites (onboarding flow)
   */
  async complete(params: CompletePrerequisitesParams): Promise<CompletePrerequisitesResponse> {
    return this.post<CompletePrerequisitesResponse>('/v1/prerequisites/complete', params)
  }

  /**
   * Accept the currently-published legal document versions. Used by the
   * lightweight re-acceptance screen shown after a terms version bump.
   */
  async acceptLegal(params: AcceptLegalParams): Promise<AcceptLegalResponse> {
    return this.post<AcceptLegalResponse>('/v1/prerequisites/accept-legal', params)
  }
}
