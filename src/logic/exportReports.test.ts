/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * AICTE Security Deposit & FDR Management Portal
 * Unit tests for CSV and Audit Summary Export Logic
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  computeAuditSummary, 
  escapeCsvField, 
  generateFDRRegistryCSV 
} from './exportReports';
import { FDRInstrument } from '../types/fdr';

const sampleFDRs: FDRInstrument[] = [
  {
    id: 'fdr-1',
    fdrNumber: 'SBIN-2024-998812',
    institutionId: '1-332991002',
    institutionName: 'Apex Institute of Technology, Pune',
    aictePermanentId: '1-332991002',
    issuingBank: 'State Bank of India',
    bankBranch: 'Shivajinagar Branch, Pune',
    ifscCode: 'SBIN0001110',
    depositAmount: 3500000,
    depositAmountInWords: 'Rs. 35,00,000 (Rupees Thirty Five Lakhs Only)',
    issueDate: '2022-04-10',
    maturityDate: '2030-04-10',
    tenureMonths: 96,
    interestRate: 7.25,
    lienMarkedToAICTE: true,
    jointAccountWithAICTE: true,
    documentFileName: 'Apex_SBI_FDR.pdf',
    documentFileSize: '300 KB',
    documentUrl: '/docs/sample.pdf',
    documentChecksum: 'abc1234',
    verificationStatus: 'BANK_CONFIRMED',
    lifecycleStatus: 'VERIFIED_ACTIVE',
    verificationEvidence: {
      verified: true,
      verificationSource: 'SFMS_GATEWAY',
      verifiedBy: 'SFMS Daemon',
      verifiedAt: '2024-05-01T10:00:00.000Z',
      bankReferenceNumber: 'SFMS-SBI-77881',
      officialRemarks: 'Valid lien confirmed',
    },
    discrepancies: [],
    submittedAt: '2022-04-10T00:00:00.000Z',
    submittedBy: 'registrar@apex.edu.in',
    lastUpdatedAt: '2024-05-01T10:00:00.000Z',
    tags: ['Engineering'],
  },
  {
    id: 'fdr-2',
    fdrNumber: 'HDFC-88219-X',
    institutionId: '1-992817261',
    institutionName: 'Global Engineering Academy "Campus A", Delhi',
    aictePermanentId: '1-992817261',
    issuingBank: 'HDFC Bank Ltd',
    bankBranch: 'Connaught Place, New Delhi',
    ifscCode: 'HDFC0000100',
    depositAmount: 1500000,
    depositAmountInWords: 'Rs. 15,00,000 (Rupees Fifteen Lakhs Only)',
    issueDate: '2023-01-15',
    maturityDate: '2026-11-20',
    tenureMonths: 46,
    interestRate: 6.8,
    lienMarkedToAICTE: false,
    jointAccountWithAICTE: true,
    documentFileName: 'Global_HDFC.pdf',
    documentFileSize: '400 KB',
    documentUrl: '/docs/sample2.pdf',
    documentChecksum: 'def5678',
    verificationStatus: 'DISCREPANCY_UNRESOLVED',
    lifecycleStatus: 'FLAGGED_DISCREPANCY',
    discrepancies: [
      {
        id: 'disc-1',
        field: 'Lien Clause',
        declaredValue: 'Marked to AICTE',
        extractedValue: 'Standard Non-Lien Deposit',
        severity: 'CRITICAL',
        message: 'Lien clause missing on physical certificate',
        isResolved: false,
      },
    ],
    submittedAt: '2023-01-15T00:00:00.000Z',
    submittedBy: 'admin@global.ac.in',
    lastUpdatedAt: '2023-01-15T00:00:00.000Z',
    tags: ['Discrepancy'],
  },
];

describe('Institutional Audit Export Engine', () => {
  it('correctly escapes CSV fields containing commas and quotes per RFC 4180', () => {
    assert.strictEqual(escapeCsvField('CleanText'), '"CleanText"');
    assert.strictEqual(
      escapeCsvField('Apex Institute, Pune'),
      '"Apex Institute, Pune"'
    );
    assert.strictEqual(
      escapeCsvField('Global "Campus A" Delhi'),
      '"Global ""Campus A"" Delhi"'
    );
    assert.strictEqual(escapeCsvField(null), '""');
    assert.strictEqual(escapeCsvField(undefined), '""');
  });

  it('computes accurate audit summary metrics', () => {
    const summary = computeAuditSummary(sampleFDRs);
    assert.strictEqual(summary.totalCount, 2);
    assert.strictEqual(summary.totalPrincipalAmount, 5000000);
    assert.strictEqual(summary.verifiedActiveCount, 1);
    assert.strictEqual(summary.flaggedDiscrepancyCount, 1);
    assert.strictEqual(summary.totalUnresolvedDiscrepancies, 1);
    assert.strictEqual(summary.criticalDiscrepanciesCount, 1);
    assert.strictEqual(summary.lienEndorsementComplianceRate, 50); // 1 out of 2
    assert.strictEqual(summary.jointAccountComplianceRate, 100); // 2 out of 2
    assert.ok(summary.formattedPrincipalAmount.includes('50.00 Lakh'));
  });

  it('generates a valid CSV report containing statutory metadata and data rows', () => {
    const csv = generateFDRRegistryCSV(sampleFDRs, {
      filterName: 'TEST_FILTER',
      searchQuery: 'Apex',
      exportedBy: 'Dr. Test Officer',
    });

    // Check metadata presence
    assert.ok(csv.includes('# ALL INDIA COUNCIL FOR TECHNICAL EDUCATION (AICTE)'));
    assert.ok(csv.includes('Scope Filter Applied: TEST_FILTER'));
    assert.ok(csv.includes('Auditor / Authorized By: Dr. Test Officer'));

    // Check header columns
    assert.ok(csv.includes('"FDR Number"'));
    assert.ok(csv.includes('"Principal Amount (INR)"'));
    assert.ok(csv.includes('"Lien Marked to AICTE"'));

    // Check rows data
    assert.ok(csv.includes('"SBIN-2024-998812"'));
    assert.ok(csv.includes('"Apex Institute of Technology, Pune"'));
    assert.ok(csv.includes('"3500000"'));
    assert.ok(csv.includes('"HDFC-88219-X"'));
    assert.ok(csv.includes('"Global Engineering Academy ""Campus A"", Delhi"'));
    assert.ok(csv.includes('Lien clause missing on physical certificate'));
  });
});
