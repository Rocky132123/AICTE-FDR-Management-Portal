/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * AICTE Security Deposit & FDR Management Portal
 * Institutional Audit Export Engine (CSV & PDF Dossier Generator)
 */

import { FDRInstrument, LifecycleStatus } from '../types/fdr';
import { formatINR } from './validation';

export interface AuditSummary {
  totalCount: number;
  totalPrincipalAmount: number;
  formattedPrincipalAmount: string;
  verifiedActiveCount: number;
  flaggedDiscrepancyCount: number;
  approachingMaturityCount: number;
  maturedCount: number;
  awaitingVerificationCount: number;
  releaseRequestedCount: number;
  renewedReplacedCount: number;
  releasedCount: number;
  totalUnresolvedDiscrepancies: number;
  criticalDiscrepanciesCount: number;
  lienEndorsementComplianceRate: number; // percentage (0-100)
  jointAccountComplianceRate: number; // percentage (0-100)
}

/**
 * Aggregates institutional audit metrics across a set of FDR instruments.
 */
export function computeAuditSummary(instruments: FDRInstrument[]): AuditSummary {
  const totalCount = instruments.length;
  let totalPrincipal = 0;
  let verifiedActive = 0;
  let flaggedDiscrepancy = 0;
  let approachingMaturity = 0;
  let matured = 0;
  let awaitingVerification = 0;
  let releaseRequested = 0;
  let renewedReplaced = 0;
  let released = 0;

  let totalUnresolvedDisc = 0;
  let criticalDisc = 0;
  let lienEndorsed = 0;
  let jointAccount = 0;

  for (const item of instruments) {
    totalPrincipal += item.depositAmount || 0;

    switch (item.lifecycleStatus) {
      case 'VERIFIED_ACTIVE':
        verifiedActive++;
        break;
      case 'FLAGGED_DISCREPANCY':
        flaggedDiscrepancy++;
        break;
      case 'APPROACHING_MATURITY':
        approachingMaturity++;
        break;
      case 'MATURED':
        matured++;
        break;
      case 'AWAITING_VERIFICATION':
        awaitingVerification++;
        break;
      case 'RELEASE_REQUESTED':
        releaseRequested++;
        break;
      case 'RENEWED_REPLACED':
        renewedReplaced++;
        break;
      case 'RELEASED':
        released++;
        break;
    }

    if (item.lienMarkedToAICTE) lienEndorsed++;
    if (item.jointAccountWithAICTE) jointAccount++;

    if (item.discrepancies && item.discrepancies.length > 0) {
      for (const d of item.discrepancies) {
        if (!d.isResolved) {
          totalUnresolvedDisc++;
          if (d.severity === 'CRITICAL') {
            criticalDisc++;
          }
        }
      }
    }
  }

  const lienRate = totalCount > 0 ? Math.round((lienEndorsed / totalCount) * 100) : 100;
  const jointRate = totalCount > 0 ? Math.round((jointAccount / totalCount) * 100) : 100;

  return {
    totalCount,
    totalPrincipalAmount: totalPrincipal,
    formattedPrincipalAmount: formatINR(totalPrincipal),
    verifiedActiveCount: verifiedActive,
    flaggedDiscrepancyCount: flaggedDiscrepancy,
    approachingMaturityCount: approachingMaturity,
    maturedCount: matured,
    awaitingVerificationCount: awaitingVerification,
    releaseRequestedCount: releaseRequested,
    renewedReplacedCount: renewedReplaced,
    releasedCount: released,
    totalUnresolvedDiscrepancies: totalUnresolvedDisc,
    criticalDiscrepanciesCount: criticalDisc,
    lienEndorsementComplianceRate: lienRate,
    jointAccountComplianceRate: jointRate,
  };
}

/**
 * Safely escapes CSV field values per RFC 4180
 */
export function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }
  const str = String(value).trim();
  // If string contains comma, quote, or newline, escape quotes by doubling them and wrap in quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

export interface CSVExportOptions {
  filterName?: string;
  searchQuery?: string;
  exportedBy?: string;
  auditSessionId?: string;
}

/**
 * Generates an official statutory AICTE Audit CSV export from the given instruments.
 */
export function generateFDRRegistryCSV(
  instruments: FDRInstrument[],
  options?: CSVExportOptions
): string {
  const exportTimestamp = new Date().toISOString();
  const filterLabel = options?.filterName || 'ALL';
  const queryLabel = options?.searchQuery || 'None';
  const auditor = options?.exportedBy || 'AICTE Regional Officer';
  const sessionId = options?.auditSessionId || `AUDIT-REC-${Date.now()}`;

  // Statutory Header Metadata comments (accepted by institutional audit systems)
  const metaLines = [
    `# ALL INDIA COUNCIL FOR TECHNICAL EDUCATION (AICTE) - STATUTORY FDR REGISTRY AUDIT EXPORT`,
    `# Export Generated: ${exportTimestamp}`,
    `# Audit Session ID: ${sessionId}`,
    `# Auditor / Authorized By: ${auditor}`,
    `# Scope Filter Applied: ${filterLabel}`,
    `# Search Query Filter: ${queryLabel}`,
    `# Total Records Included: ${instruments.length}`,
    `# Compliance Standards: AICTE APH 2024-27 Clause 4.8 / SFMS Direct Bank Linkage`,
    `# -----------------------------------------------------------------------------------------`,
  ];

  // Column Headers
  const headers = [
    'S.No',
    'FDR Number',
    'AICTE Permanent ID',
    'Institution Name',
    'Issuing Bank',
    'Branch Name',
    'IFSC Code',
    'Principal Amount (INR)',
    'Amount in Words',
    'Issue Date (YYYY-MM-DD)',
    'Maturity Date (YYYY-MM-DD)',
    'Tenure (Months)',
    'Interest Rate (%)',
    'Lien Marked to AICTE',
    'Joint Account with AICTE',
    'Lifecycle Status',
    'Verification Status',
    'Verification Channel',
    'Bank Ref / Confirmation Code',
    'Unresolved Discrepancies Count',
    'Discrepancy Summaries',
    'Renewal Sequence',
    'Original FDR Ref (If Renewed)',
  ];

  const dataRows: string[] = [];

  instruments.forEach((fdr, index) => {
    const unresolvedDiscs = (fdr.discrepancies || []).filter((d) => !d.isResolved);
    const discSummary = unresolvedDiscs
      .map((d) => `[${d.severity}] ${d.field}: ${d.message}`)
      .join(' | ');

    const row = [
      escapeCsvField(index + 1),
      escapeCsvField(fdr.fdrNumber),
      escapeCsvField(fdr.aictePermanentId),
      escapeCsvField(fdr.institutionName),
      escapeCsvField(fdr.issuingBank),
      escapeCsvField(fdr.bankBranch),
      escapeCsvField(fdr.ifscCode),
      escapeCsvField(fdr.depositAmount),
      escapeCsvField(fdr.depositAmountInWords || formatINR(fdr.depositAmount)),
      escapeCsvField(fdr.issueDate),
      escapeCsvField(fdr.maturityDate),
      escapeCsvField(fdr.tenureMonths),
      escapeCsvField(fdr.interestRate ? `${fdr.interestRate}%` : 'N/A'),
      escapeCsvField(fdr.lienMarkedToAICTE ? 'YES' : 'NO'),
      escapeCsvField(fdr.jointAccountWithAICTE ? 'YES' : 'NO'),
      escapeCsvField(fdr.lifecycleStatus),
      escapeCsvField(fdr.verificationStatus),
      escapeCsvField(fdr.verificationEvidence?.verificationSource || 'NOT_VERIFIED'),
      escapeCsvField(fdr.verificationEvidence?.bankReferenceNumber || 'NONE'),
      escapeCsvField(unresolvedDiscs.length),
      escapeCsvField(discSummary || 'NONE (CLEAN)'),
      escapeCsvField(fdr.renewalInfo?.renewalSequenceNumber || 0),
      escapeCsvField(fdr.renewalInfo?.previousFdrNumber || 'ORIGINAL'),
    ];

    dataRows.push(row.join(','));
  });

  return [...metaLines, headers.map(escapeCsvField).join(','), ...dataRows].join('\r\n');
}

/**
 * Triggers a browser download of the generated CSV file.
 */
export function triggerCSVDownload(
  csvContent: string,
  filename: string = `AICTE_FDR_Registry_Audit_${new Date().toISOString().split('T')[0]}.csv`
): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
