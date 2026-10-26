/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * AICTE Security Deposit & FDR Management Portal
 * Logic Unit Tests using Node's test runner
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateFDRSubmission,
  compareDeclaredWithOcr,
  calculateEffectiveLifecycleStatus,
  evaluateReleaseEligibility,
  isFdrComingDue,
  normalizeText,
} from './validation.ts';
import { FDRInstrument, OcrExtractionData } from '../types/fdr.ts';

test('normalizeText strips punctuation, spaces and converts to lowercase', () => {
  assert.equal(normalizeText('State Bank of India - Connaught Place!'), 'statebankofindiaconnaughtplace');
  assert.equal(normalizeText('FDR/2026/098-B'), 'fdr2026098b');
  assert.equal(normalizeText(null), '');
});

test('validateFDRSubmission catches mandatory missing fields', () => {
  const result = validateFDRSubmission({});
  assert.equal(result.isValid, false);
  assert.ok(result.errors.some((e) => e.includes('FDR Receipt Number is mandatory')));
  assert.ok(result.errors.some((e) => e.includes('AICTE Permanent ID is mandatory')));
  assert.ok(result.errors.some((e) => e.includes('Issuing Bank name is mandatory')));
  assert.ok(result.errors.some((e) => e.includes('Deposit amount must be greater than zero')));
});

test('validateFDRSubmission catches date logic violation (maturity <= issue)', () => {
  const invalidDates = {
    fdrNumber: 'FDR-123456',
    institutionId: '1-10928374',
    issuingBank: 'State Bank of India',
    depositAmount: 1500000,
    issueDate: '2026-05-10',
    maturityDate: '2026-01-01', // Before issue date!
  };
  const result = validateFDRSubmission(invalidDates);
  assert.equal(result.isValid, false);
  assert.ok(result.errors.some((e) => e.includes('Maturity date must be chronologically after the issue date')));
});

test('validateFDRSubmission detects duplicate FDR numbers in existing records', () => {
  const existingRecords = [
    {
      id: 'existing-1',
      fdrNumber: 'FDR-SBI-998877',
      institutionId: '1-0001',
      lifecycleStatus: 'VERIFIED_ACTIVE',
    } as FDRInstrument,
  ];

  const duplicateCandidate = {
    id: 'new-2',
    fdrNumber: 'fdr-sbi-998877', // case-insensitive duplicate
    institutionId: '1-0002',
    issuingBank: 'SBI',
    depositAmount: 2500000,
    issueDate: '2026-01-01',
    maturityDate: '2031-01-01',
  };

  const result = validateFDRSubmission(duplicateCandidate, existingRecords);
  assert.equal(result.isValid, false);
  assert.ok(result.errors.some((e) => e.includes('Duplicate FDR Reference')));
});

test('compareDeclaredWithOcr flags critical discrepancy when amounts or numbers differ', () => {
  const declared: Partial<FDRInstrument> = {
    fdrNumber: 'FDR-PNB-445566',
    depositAmount: 1000000, // Declared ₹10 Lakhs
    issuingBank: 'Punjab National Bank',
    maturityDate: '2030-12-31',
    lienMarkedToAICTE: true,
  };

  const ocrData: OcrExtractionData = {
    extractedFdrNumber: 'FDR-PNB-445566',
    extractedBank: 'Punjab National Bank',
    extractedBranch: 'Sector 17, Chandigarh',
    extractedAmount: 100000, // Extracted ₹1 Lakh (Mismatch!)
    extractedIssueDate: '2025-12-31',
    extractedMaturityDate: '2030-12-31',
    extractedInterestRate: 7.25,
    extractedLienStatus: false, // Lien missing on doc!
    extractedJointAccount: true,
    confidenceScore: 92,
    fieldConfidence: { amount: 96, fdrNumber: 99 },
    rawExtractedText: 'PUNJAB NATIONAL BANK FIXED DEPOSIT RECEIPT Rs. 1,00,000...',
    processedAt: '2026-10-24T10:00:00Z',
  };

  const discrepancies = compareDeclaredWithOcr(declared, ocrData);
  assert.equal(discrepancies.length, 2);

  const amtDisc = discrepancies.find((d) => d.field === 'Deposit Amount');
  assert.ok(amtDisc);
  assert.equal(amtDisc?.severity, 'CRITICAL');

  const lienDisc = discrepancies.find((d) => d.field === 'Lien Clause');
  assert.ok(lienDisc);
  assert.equal(lienDisc?.severity, 'WARNING');
});

test('calculateEffectiveLifecycleStatus correctly identifies approaching maturity and matured', () => {
  const baseFdr: FDRInstrument = {
    id: 'fdr-1',
    fdrNumber: 'FDR-100',
    institutionId: '1-999',
    institutionName: 'Apex Institute of Technology',
    aictePermanentId: '1-999',
    issuingBank: 'Canara Bank',
    bankBranch: 'Main',
    ifscCode: 'CNRB0001',
    depositAmount: 3500000,
    depositAmountInWords: 'Rupees Thirty Five Lakhs Only',
    issueDate: '2020-01-01',
    maturityDate: '2026-11-15', // ~22 days away from Oct 24, 2026
    tenureMonths: 82,
    interestRate: 7.0,
    lienMarkedToAICTE: true,
    jointAccountWithAICTE: true,
    documentFileName: 'canara_fdr.pdf',
    documentFileSize: '412 KB',
    documentUrl: '',
    documentChecksum: 'sha256-abc',
    lifecycleStatus: 'VERIFIED_ACTIVE',
    verificationStatus: 'BANK_CONFIRMED',
    discrepancies: [],
    submittedAt: '2020-01-02',
    lastUpdatedAt: '2026-10-01',
    submittedBy: 'Registrar',
    tags: ['Degree Engineering'],
  };

  const refDate = new Date('2026-10-24T00:00:00Z');
  const statusSoon = calculateEffectiveLifecycleStatus(baseFdr, refDate);
  assert.equal(statusSoon, 'APPROACHING_MATURITY');

  // If already matured
  const pastFdr = { ...baseFdr, maturityDate: '2026-10-01' };
  const statusMatured = calculateEffectiveLifecycleStatus(pastFdr, refDate);
  assert.equal(statusMatured, 'MATURED');
});

test('evaluateReleaseEligibility requires bank confirmation and zero unresolved discrepancies', () => {
  const unverifiedFdr: FDRInstrument = {
    id: 'fdr-test',
    fdrNumber: 'FDR-UNVERIFIED',
    verificationStatus: 'PENDING_VERIFICATION',
    lifecycleStatus: 'AWAITING_VERIFICATION',
    discrepancies: [],
  } as unknown as FDRInstrument;

  const result1 = evaluateReleaseEligibility(unverifiedFdr);
  assert.equal(result1.eligible, false);
  assert.ok(result1.blockers.some((b) => b.includes('authorized bank verification')));

  const flaggedFdr: FDRInstrument = {
    id: 'fdr-flagged',
    verificationStatus: 'BANK_CONFIRMED',
    lifecycleStatus: 'FLAGGED_DISCREPANCY',
    discrepancies: [
      {
        id: 'd1',
        field: 'Deposit Amount',
        declaredValue: 2000000,
        extractedValue: 1000000,
        severity: 'CRITICAL',
        message: 'Amount mismatch',
        isResolved: false,
      },
    ],
  } as unknown as FDRInstrument;

  const result2 = evaluateReleaseEligibility(flaggedFdr);
  assert.equal(result2.eligible, false);
  assert.ok(result2.blockers.some((b) => b.includes('unresolved discrepancy')));
});

test('isFdrComingDue accurately detects instruments maturing within 90 days', () => {
  const refDate = new Date('2026-10-24T00:00:00Z');

  // Maturing in 25 days (within 90)
  const comingSoon = {
    lifecycleStatus: 'VERIFIED_ACTIVE',
    maturityDate: '2026-11-18',
  } as unknown as FDRInstrument;
  assert.equal(isFdrComingDue(comingSoon, 90, refDate), true);

  // Maturing in 85 days (within 90)
  const eightyFiveDays = {
    lifecycleStatus: 'VERIFIED_ACTIVE',
    maturityDate: '2027-01-17',
  } as unknown as FDRInstrument;
  assert.equal(isFdrComingDue(eightyFiveDays, 90, refDate), true);

  // Maturing in 120 days (> 90 days)
  const farFuture = {
    lifecycleStatus: 'VERIFIED_ACTIVE',
    maturityDate: '2027-02-21',
  } as unknown as FDRInstrument;
  assert.equal(isFdrComingDue(farFuture, 90, refDate), false);

  // Already matured in past (diff <= 0)
  const alreadyMatured = {
    lifecycleStatus: 'MATURED',
    maturityDate: '2026-10-10',
  } as unknown as FDRInstrument;
  assert.equal(isFdrComingDue(alreadyMatured, 90, refDate), false);

  // Discharged / released record should not be coming due
  const released = {
    lifecycleStatus: 'RELEASED',
    maturityDate: '2026-11-10',
  } as unknown as FDRInstrument;
  assert.equal(isFdrComingDue(released, 90, refDate), false);
});
