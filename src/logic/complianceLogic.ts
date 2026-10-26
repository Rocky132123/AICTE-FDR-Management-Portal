/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * AICTE Security Deposit & FDR Management Portal
 * Institutional Compliance Scoring & Statutory Checklist Engine
 */

import { Institution, FDRInstrument } from '../types/fdr';

export type ComplianceStatus = 'COMPLIANT' | 'PENDING_REVIEW' | 'DEFICIENT' | 'EXEMPT';

export interface ComplianceItem {
  id: string;
  category: 'INFRASTRUCTURE' | 'LEGAL' | 'FACULTY_FINANCE' | 'REGULATORY_DEPOSIT' | 'DISCLOSURE';
  title: string;
  description: string;
  mandatory: boolean;
  weight: number; // percentage weighting, sum = 100
  status: ComplianceStatus;
  referenceDocNumber?: string;
  lastUpdated?: string;
  remarks?: string;
}

export interface InstitutionalComplianceProfile {
  institutionId: string;
  aictePermanentId: string;
  institutionName: string;
  region: string;
  items: ComplianceItem[];
  lastAuditedDate: string;
}

export interface ComplianceScoreResult {
  score: number; // 0 to 100
  grade: 'A' | 'B' | 'C';
  statusText: string;
  badgeColor: string;
  compliantCount: number;
  totalMandatoryCount: number;
  passedWeight: number;
  totalWeight: number;
}

/**
 * Standard mandatory checklist items specified by AICTE Approval Process Handbook (APH).
 */
export const DEFAULT_COMPLIANCE_ITEMS: ComplianceItem[] = [
  {
    id: 'item-land-building',
    category: 'INFRASTRUCTURE',
    title: 'Land & Building Title Clearance',
    description: 'Registered unencumbered title deed, occupancy certificate, and approved master building layout.',
    mandatory: true,
    weight: 20,
    status: 'COMPLIANT',
    referenceDocNumber: 'LND-DEL-2022-8819',
    lastUpdated: '2026-06-15',
    remarks: 'Clearance endorsed by local municipal authority with zero mortgage encumbrance.',
  },
  {
    id: 'item-court-cases',
    category: 'LEGAL',
    title: 'Non-Litigation & Court Cases Clearance',
    description: 'Sworn legal affidavit verifying absence of court injunctions or contempt petitions against admissions.',
    mandatory: true,
    weight: 15,
    status: 'COMPLIANT',
    referenceDocNumber: 'AFF-HC-2026-4402',
    lastUpdated: '2026-08-01',
    remarks: 'No active judicial stay orders on academic sessions.',
  },
  {
    id: 'item-faculty-salary',
    category: 'FACULTY_FINANCE',
    title: '7th CPC Faculty Salary & Bank Disbursal',
    description: 'Proof of electronic salary disbursement into faculty bank accounts meeting AICTE cadre ratio norms.',
    mandatory: true,
    weight: 20,
    status: 'COMPLIANT',
    referenceDocNumber: 'PFMS-SAL-2026-Q3',
    lastUpdated: '2026-09-30',
    remarks: 'Quarterly bank statement validated with 100% digital direct transfers.',
  },
  {
    id: 'item-fdr-security',
    category: 'REGULATORY_DEPOSIT',
    title: 'Statutory Security Deposit & AICTE Lien',
    description: 'Active FDR maintained in joint name with irrevocable lien marked to Member Secretary, AICTE.',
    mandatory: true,
    weight: 25,
    status: 'COMPLIANT',
    referenceDocNumber: 'FDR-ACTIVE-VERIFIED',
    lastUpdated: '2026-10-20',
    remarks: 'Confirmed via automated RBI SFMS 2.0 gateway.',
  },
  {
    id: 'item-public-disclosure',
    category: 'DISCLOSURE',
    title: 'Mandatory Public Disclosure & Anti-Ragging',
    description: 'Annual mandatory public disclosures uploaded to college portal and UGC anti-ragging compliance.',
    mandatory: true,
    weight: 10,
    status: 'COMPLIANT',
    referenceDocNumber: 'WEB-DISC-2026-27',
    lastUpdated: '2026-07-10',
    remarks: 'Published with complete fee structures and faculty profiles.',
  },
  {
    id: 'item-audited-accounts',
    category: 'FACULTY_FINANCE',
    title: 'Audited Financial Statements & Balance Sheet',
    description: 'Chartered Accountant certified balance sheet and income/expenditure audit for preceding fiscal year.',
    mandatory: true,
    weight: 10,
    status: 'COMPLIANT',
    referenceDocNumber: 'CA-AUD-2025-26',
    lastUpdated: '2026-09-15',
    remarks: 'CA certified with zero adverse qualification notes.',
  },
];

/**
 * Calculates deterministic institutional compliance score from checklist items.
 */
export function calculateComplianceScore(items: ComplianceItem[]): ComplianceScoreResult {
  if (!items || items.length === 0) {
    return {
      score: 0,
      grade: 'C',
      statusText: 'No Filings Found',
      badgeColor: 'red',
      compliantCount: 0,
      totalMandatoryCount: 0,
      passedWeight: 0,
      totalWeight: 0,
    };
  }

  const mandatoryItems = items.filter((item) => item.mandatory);
  const totalWeight = mandatoryItems.reduce((acc, item) => acc + item.weight, 0);

  let passedWeight = 0;
  let compliantCount = 0;

  mandatoryItems.forEach((item) => {
    if (item.status === 'COMPLIANT') {
      passedWeight += item.weight;
      compliantCount++;
    } else if (item.status === 'PENDING_REVIEW') {
      // Partial credit for submitted filings under review
      passedWeight += item.weight * 0.5;
    }
  });

  const rawScore = totalWeight > 0 ? (passedWeight / totalWeight) * 100 : 0;
  const score = Math.round(rawScore);

  let grade: 'A' | 'B' | 'C' = 'C';
  let statusText = 'Non-Compliant (Action Required)';
  let badgeColor = 'red';

  if (score >= 85) {
    grade = 'A';
    statusText = 'Fully Compliant';
    badgeColor = 'emerald';
  } else if (score >= 60) {
    grade = 'B';
    statusText = 'Conditionally Compliant';
    badgeColor = 'amber';
  }

  return {
    score,
    grade,
    statusText,
    badgeColor,
    compliantCount,
    totalMandatoryCount: mandatoryItems.length,
    passedWeight: Math.round(passedWeight),
    totalWeight,
  };
}

/**
 * Derives the initial compliance profile for an institution, dynamically cross-checking
 * whether an active, bank-confirmed FDR exists in the central instruments registry.
 */
export function buildInstitutionComplianceProfile(
  institution: Institution,
  instruments: FDRInstrument[] = []
): InstitutionalComplianceProfile {
  // Check if institution has a verified active FDR
  const institutionFdrs = instruments.filter(
    (i) => i.institutionId === institution.id || i.aictePermanentId === institution.aictePermanentId
  );
  const hasVerifiedActiveFdr = institutionFdrs.some(
    (i) => i.lifecycleStatus === 'VERIFIED_ACTIVE' && i.verificationStatus === 'BANK_CONFIRMED'
  );
  const hasDiscrepancyFdr = institutionFdrs.some(
    (i) => i.lifecycleStatus === 'FLAGGED_DISCREPANCY'
  );

  // Customize based on known mock presets for rich demonstration
  let items: ComplianceItem[] = DEFAULT_COMPLIANCE_ITEMS.map((item) => ({ ...item }));

  if (institution.id === 'inst-2' || institution.aictePermanentId === '1-43289012') {
    // Pune College has a discrepancy flag on FDR and pending faculty salary audit
    items = items.map((item) => {
      if (item.id === 'item-fdr-security') {
        return {
          ...item,
          status: 'DEFICIENT' as ComplianceStatus,
          remarks: 'FDR PNB-PUN-2024-44120 flagged with Rs. 13.5 Lakh shortfall and absent lien clause.',
        };
      }
      if (item.id === 'item-faculty-salary') {
        return {
          ...item,
          status: 'PENDING_REVIEW' as ComplianceStatus,
          remarks: 'Faculty DA arrears compliance under verification with State Directorate.',
        };
      }
      return item;
    });
  } else if (institution.id === 'inst-5' || institution.aictePermanentId === '1-88392019') {
    // Kolkata School has an overdue matured FDR
    items = items.map((item) => {
      if (item.id === 'item-fdr-security') {
        return {
          ...item,
          status: 'DEFICIENT' as ComplianceStatus,
          remarks: 'FDR BOB-KOL-2016-11894 matured on 05-Oct-2026. Renewal instrument pending submission.',
        };
      }
      return item;
    });
  } else if (hasVerifiedActiveFdr) {
    items = items.map((item) => {
      if (item.id === 'item-fdr-security') {
        return {
          ...item,
          status: 'COMPLIANT' as ComplianceStatus,
          remarks: 'Irrevocable lien confirmed via SFMS 2.0 digital gateway.',
        };
      }
      return item;
    });
  } else if (hasDiscrepancyFdr) {
    items = items.map((item) => {
      if (item.id === 'item-fdr-security') {
        return {
          ...item,
          status: 'DEFICIENT' as ComplianceStatus,
          remarks: 'FDR record contains unresolved discrepancies.',
        };
      }
      return item;
    });
  }

  return {
    institutionId: institution.id,
    aictePermanentId: institution.aictePermanentId,
    institutionName: institution.name,
    region: institution.region,
    items,
    lastAuditedDate: '2026-10-18',
  };
}
