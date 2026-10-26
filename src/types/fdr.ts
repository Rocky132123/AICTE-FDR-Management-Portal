/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * AICTE Security Deposit & FDR Management Portal
 * Core Data Models & Schema Definitions (Phase 1)
 */

export type UserRole = 'AICTE_RO' | 'AICTE_HQ_ADMIN' | 'INSTITUTION_REP' | 'BANK_AUDITOR';

export type LifecycleStatus = 
  | 'SUBMITTED' 
  | 'UNDER_OCR_REVIEW' 
  | 'FLAGGED_DISCREPANCY' 
  | 'AWAITING_VERIFICATION' 
  | 'VERIFIED_ACTIVE' 
  | 'APPROACHING_MATURITY' 
  | 'MATURED' 
  | 'RENEWAL_SUBMITTED' 
  | 'RENEWED_REPLACED' 
  | 'RELEASE_REQUESTED' 
  | 'RELEASE_APPROVED' 
  | 'RELEASED' 
  | 'REJECTED';

export type VerificationStatus = 
  | 'PENDING_VERIFICATION' 
  | 'BANK_CONFIRMED' 
  | 'MANUALLY_VERIFIED' 
  | 'DISCREPANCY_UNRESOLVED' 
  | 'BANK_REJECTED';

export type DiscrepancySeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface DiscrepancyItem {
  id: string;
  field: string;
  declaredValue: string | number;
  extractedValue: string | number;
  severity: DiscrepancySeverity;
  message: string;
  isResolved: boolean;
  resolutionNote?: string;
}

export interface OcrExtractionData {
  extractedFdrNumber: string;
  extractedBank: string;
  extractedBranch: string;
  extractedAmount: number;
  extractedIssueDate: string; // YYYY-MM-DD
  extractedMaturityDate: string; // YYYY-MM-DD
  extractedInterestRate: number;
  extractedLienStatus: boolean;
  extractedJointAccount: boolean;
  confidenceScore: number; // 0 - 100
  fieldConfidence: Record<string, number>;
  rawExtractedText: string;
  processedAt: string;
}

export interface Institution {
  id: string;
  aictePermanentId: string;
  name: string;
  region: 'Northern' | 'Western' | 'Eastern' | 'Southern' | 'South-Western' | 'Central';
  state: string;
  type: 'Engineering & Technology' | 'Management' | 'Pharmacy' | 'Architecture' | 'Polytechnic';
  email: string;
  phone: string;
  contactPerson: string;
  address: string;
}

export interface VerificationEvidence {
  verified: boolean;
  verificationSource: 'SFMS_GATEWAY' | 'BANK_API_SIMULATED' | 'OFFICIAL_MANUAL_AUDIT';
  verifiedBy: string;
  verifiedAt: string;
  bankReferenceNumber?: string;
  officialRemarks?: string;
  evidenceDocumentUrl?: string;
}

export interface RenewalLinkage {
  isRenewal: boolean;
  originalFdrId?: string;
  previousFdrNumber?: string;
  renewalSequenceNumber: number;
  tenureExtensionMonths: number;
  renewalDate: string;
  replacementReason?: string;
}

export interface ReleaseWorkflow {
  id: string;
  requestedAt: string;
  requestedBy: string;
  reason: 'TENURE_COMPLETED_COMPLIANCE_MET' | 'CLOSURE_OF_INSTITUTION' | 'SUBSTITUTION_OF_INSTRUMENT' | 'OTHER';
  justification: string;
  complianceChecks: {
    noPendingDues: boolean;
    aicteApprovalLetterAttached: boolean;
    landBuildingComplianceMet: boolean;
    courtCasesClear: boolean;
  };
  approvalTier: 'TIER_1_REGIONAL_OFFICER' | 'TIER_2_HQ_DIRECTOR' | 'FINAL_DISBURSEMENT';
  status: 'PENDING_RO_REVIEW' | 'PENDING_DIRECTOR_APPROVAL' | 'APPROVED' | 'REJECTED';
  actionHistory: Array<{
    actor: string;
    role: UserRole;
    action: string;
    timestamp: string;
    comment: string;
  }>;
}

export interface FDRInstrument {
  id: string;
  fdrNumber: string;
  institutionId: string;
  institutionName: string;
  aictePermanentId: string;
  issuingBank: string;
  bankBranch: string;
  ifscCode: string;
  depositAmount: number; // in INR
  depositAmountInWords: string;
  issueDate: string; // YYYY-MM-DD
  maturityDate: string; // YYYY-MM-DD
  tenureMonths: number;
  interestRate: number; // percentage
  lienMarkedToAICTE: boolean;
  jointAccountWithAICTE: boolean;
  
  // Document representation
  documentFileName: string;
  documentFileSize: string;
  documentUrl: string;
  documentChecksum: string;
  
  // Lifecycle & Intelligence
  lifecycleStatus: LifecycleStatus;
  verificationStatus: VerificationStatus;
  ocrData?: OcrExtractionData;
  discrepancies: DiscrepancyItem[];
  verificationEvidence?: VerificationEvidence;
  renewalInfo?: RenewalLinkage;
  releaseRequest?: ReleaseWorkflow;
  
  // Timestamps
  submittedAt: string;
  lastUpdatedAt: string;
  submittedBy: string;
  tags: string[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entityType: 'FDR' | 'INSTITUTION' | 'VERIFICATION' | 'RELEASE_REQUEST' | 'POLICY';
  entityId: string;
  details: string;
  ipAddress: string;
  hash: string;
}

export interface MetricSummary {
  totalDepositsCount: number;
  totalDepositValue: number; // in INR
  activeFDRCount: number;
  pendingVerificationCount: number;
  approachingMaturityCount: number;
  maturedCount: number;
  flaggedDiscrepanciesCount: number;
  pendingReleaseRequestsCount: number;
}
