/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * AICTE Security Deposit & FDR Management Portal
 * Deterministic Validation Engine & State Machine (Phase 1)
 */

import { DiscrepancyItem, FDRInstrument, LifecycleStatus, OcrExtractionData } from '../types/fdr';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  discrepancies: DiscrepancyItem[];
}

/**
 * Validates deterministic business rules for a submitted FDR record.
 */
export function validateFDRSubmission(
  instrument: Partial<FDRInstrument>,
  existingInstruments: FDRInstrument[] = []
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const discrepancies: DiscrepancyItem[] = [];

  // 1. Mandatory Fields
  if (!instrument.fdrNumber || instrument.fdrNumber.trim() === '') {
    errors.push('FDR Receipt Number is mandatory.');
  }
  if (!instrument.institutionId || instrument.institutionId.trim() === '') {
    errors.push('Institution AICTE Permanent ID is mandatory.');
  }
  if (!instrument.issuingBank || instrument.issuingBank.trim() === '') {
    errors.push('Issuing Bank name is mandatory.');
  }
  if (!instrument.depositAmount || instrument.depositAmount <= 0) {
    errors.push('Deposit amount must be greater than zero.');
  }

  // 2. Date Logic & Consistency
  if (!instrument.issueDate) {
    errors.push('Issue date is mandatory.');
  }
  if (!instrument.maturityDate) {
    errors.push('Maturity date is mandatory.');
  }

  if (instrument.issueDate && instrument.maturityDate) {
    const issueTime = new Date(instrument.issueDate).getTime();
    const maturityTime = new Date(instrument.maturityDate).getTime();

    if (isNaN(issueTime) || isNaN(maturityTime)) {
      errors.push('Provided dates are in an invalid format.');
    } else if (maturityTime <= issueTime) {
      errors.push('Maturity date must be chronologically after the issue date.');
    } else {
      const diffDays = Math.round((maturityTime - issueTime) / (1000 * 60 * 60 * 24));
      // AICTE security deposits usually require minimum 1 year (365 days) up to 8-10 years
      if (diffDays < 180) {
        warnings.push(`FDR duration is ${diffDays} days, which is less than the standard AICTE minimum tenure (minimum 6-12 months).`);
      }
    }
  }

  // 3. AICTE Specific Regulatory Conditions
  if (instrument.lienMarkedToAICTE === false) {
    warnings.push('FDR does not indicate a Lien marked in favor of Member Secretary, AICTE.');
  }
  if (instrument.jointAccountWithAICTE === false) {
    warnings.push('FDR is not recorded as a Joint Account with AICTE Regional Officer.');
  }

  // 4. Duplicate Reference Detection
  if (instrument.fdrNumber) {
    const cleanFdrNumber = instrument.fdrNumber.trim().toUpperCase();
    const isDuplicate = existingInstruments.some(
      (existing) =>
        existing.id !== instrument.id &&
        existing.fdrNumber.trim().toUpperCase() === cleanFdrNumber &&
        existing.lifecycleStatus !== 'REJECTED'
    );
    if (isDuplicate) {
      errors.push(`Duplicate FDR Reference: "${instrument.fdrNumber}" is already registered in the system.`);
    }
  }

  // 5. OCR Discrepancy Comparison (if OCR data is provided)
  if (instrument.ocrData) {
    const ocrDiscrepancies = compareDeclaredWithOcr(instrument as FDRInstrument, instrument.ocrData);
    discrepancies.push(...ocrDiscrepancies);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    discrepancies,
  };
}

/**
 * Normalizes text for forgiving comparison of bank names and strings.
 */
export function normalizeText(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Compares declared institution data with OCR extracted data.
 * Distinguishes submitted values vs extracted machine values.
 */
export function compareDeclaredWithOcr(
  declared: Partial<FDRInstrument>,
  ocr: OcrExtractionData
): DiscrepancyItem[] {
  const discrepancies: DiscrepancyItem[] = [];

  // FDR Reference comparison
  if (declared.fdrNumber && ocr.extractedFdrNumber) {
    const normDeclared = normalizeText(declared.fdrNumber);
    const normExtracted = normalizeText(ocr.extractedFdrNumber);
    if (normDeclared !== normExtracted) {
      discrepancies.push({
        id: `disc-fdr-${Date.now()}`,
        field: 'FDR Number',
        declaredValue: declared.fdrNumber,
        extractedValue: ocr.extractedFdrNumber,
        severity: 'CRITICAL',
        message: 'Declared FDR number does not match document text extracted by OCR.',
        isResolved: false,
      });
    }
  }

  // Deposit Amount comparison
  if (declared.depositAmount && ocr.extractedAmount) {
    const diff = Math.abs(declared.depositAmount - ocr.extractedAmount);
    if (diff > 1) { // allow 1 rupee rounding
      discrepancies.push({
        id: `disc-amt-${Date.now()}`,
        field: 'Deposit Amount',
        declaredValue: declared.depositAmount,
        extractedValue: ocr.extractedAmount,
        severity: 'CRITICAL',
        message: `Amount mismatch: Declared Rs. ${declared.depositAmount.toLocaleString('en-IN')} vs Extracted Rs. ${ocr.extractedAmount.toLocaleString('en-IN')}.`,
        isResolved: false,
      });
    }
  }

  // Issuing Bank comparison
  if (declared.issuingBank && ocr.extractedBank) {
    const normBankDeclared = normalizeText(declared.issuingBank);
    const normBankExtracted = normalizeText(ocr.extractedBank);
    if (!normBankDeclared.includes(normBankExtracted) && !normBankExtracted.includes(normBankDeclared)) {
      discrepancies.push({
        id: `disc-bank-${Date.now()}`,
        field: 'Issuing Bank',
        declaredValue: declared.issuingBank,
        extractedValue: ocr.extractedBank,
        severity: 'WARNING',
        message: `Bank name differs: Declared "${declared.issuingBank}" vs Extracted "${ocr.extractedBank}".`,
        isResolved: false,
      });
    }
  }

  // Maturity Date comparison
  if (declared.maturityDate && ocr.extractedMaturityDate) {
    if (declared.maturityDate !== ocr.extractedMaturityDate) {
      discrepancies.push({
        id: `disc-mat-${Date.now()}`,
        field: 'Maturity Date',
        declaredValue: declared.maturityDate,
        extractedValue: ocr.extractedMaturityDate,
        severity: 'CRITICAL',
        message: `Maturity date mismatch: Declared ${declared.maturityDate} vs Extracted ${ocr.extractedMaturityDate}.`,
        isResolved: false,
      });
    }
  }

  // Lien marking check
  if (declared.lienMarkedToAICTE === true && ocr.extractedLienStatus === false) {
    discrepancies.push({
      id: `disc-lien-${Date.now()}`,
      field: 'Lien Clause',
      declaredValue: 'Claimed Lien Marked',
      extractedValue: 'No Lien Clause Detected',
      severity: 'WARNING',
      message: 'Document OCR did not detect standard lien endorsement text to Member Secretary, AICTE.',
      isResolved: false,
    });
  }

  return discrepancies;
}

/**
 * Evaluates the effective status of an instrument relative to current date and lifecycle rules.
 */
export function calculateEffectiveLifecycleStatus(
  instrument: FDRInstrument,
  referenceDate: Date = new Date()
): LifecycleStatus {
  // If already in terminal states, retain
  if (['RELEASED', 'REJECTED', 'RENEWED_REPLACED'].includes(instrument.lifecycleStatus)) {
    return instrument.lifecycleStatus;
  }

  // If in release process
  if (instrument.lifecycleStatus === 'RELEASE_REQUESTED' || instrument.lifecycleStatus === 'RELEASE_APPROVED') {
    return instrument.lifecycleStatus;
  }

  // If in renewal process
  if (instrument.lifecycleStatus === 'RENEWAL_SUBMITTED') {
    return instrument.lifecycleStatus;
  }

  // If there are unresolved critical discrepancies
  const hasCriticalDiscrepancy = instrument.discrepancies.some(
    (d) => !d.isResolved && d.severity === 'CRITICAL'
  );
  if (hasCriticalDiscrepancy) {
    return 'FLAGGED_DISCREPANCY';
  }

  // Check verification
  if (instrument.verificationStatus === 'PENDING_VERIFICATION') {
    return 'AWAITING_VERIFICATION';
  }

  // If verified active, check maturity timeframe
  const maturityTime = new Date(instrument.maturityDate).getTime();
  const nowTime = referenceDate.getTime();
  const diffDays = Math.ceil((maturityTime - nowTime) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return 'MATURED';
  } else if (diffDays <= 60) {
    return 'APPROACHING_MATURITY';
  }

  return 'VERIFIED_ACTIVE';
}

/**
 * Evaluates whether an FDR instrument is coming due within the specified window (default: 90 days).
 * Helps institutions and administrators manage renewal pipelines proactively.
 */
export type FdrMaturityCategory =
  | 'EXPIRED'
  | 'CRITICAL'
  | 'UPCOMING'
  | 'ACTIVE'
  | 'NOT_APPLICABLE';

/**
 * Returns whole calendar days until maturity. Negative values mean the FDR has
 * passed its maturity date. Returns null when the maturity date is missing or invalid.
 */
export function getFdrDaysRemaining(
  instrument: FDRInstrument,
  referenceDate: Date = new Date()
): number | null {
  if (!instrument.maturityDate) return null;

  const maturityTime = Date.parse(`${instrument.maturityDate.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(maturityTime) || Number.isNaN(referenceDate.getTime())) return null;

  // Compare calendar dates rather than elapsed hours to avoid timezone/DST errors.
  const referenceDay = Date.UTC(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );

  return Math.round((maturityTime - referenceDay) / (1000 * 60 * 60 * 24));
}

/**
 * Classifies maturity urgency for dashboard alerts. This is an alert category,
 * not a replacement for the instrument's lifecycle or verification status.
 */
export function getFdrMaturityCategory(
  instrument: FDRInstrument,
  referenceDate: Date = new Date()
): FdrMaturityCategory {
  if (
    ['RELEASED', 'REJECTED', 'RENEWED_REPLACED'].includes(instrument.lifecycleStatus)
  ) {
    return 'NOT_APPLICABLE';
  }

  const daysRemaining = getFdrDaysRemaining(instrument, referenceDate);
  if (daysRemaining === null) return 'NOT_APPLICABLE';
  if (daysRemaining < 0) return 'EXPIRED';
  if (daysRemaining <= 7) return 'CRITICAL';
  if (daysRemaining <= 30) return 'UPCOMING';
  return 'ACTIVE';
}

/**
 * Evaluates whether an FDR instrument is coming due within the specified window
 * (default: 90 days), excluding terminal lifecycle states.
 */
export function isFdrComingDue(
  instrument: FDRInstrument,
  days: number = 90,
  referenceDate: Date = new Date()
): boolean {
  if (
    ['RELEASED', 'REJECTED', 'RENEWED_REPLACED'].includes(instrument.lifecycleStatus)
  ) {
    return false;
  }

  const daysRemaining = getFdrDaysRemaining(instrument, referenceDate);
  return daysRemaining !== null && daysRemaining > 0 && daysRemaining <= days;
}

/**
 * Checks eligibility for deposit release request based on AICTE criteria.
 */
export function evaluateReleaseEligibility(instrument: FDRInstrument): {
  eligible: boolean;
  blockers: string[];
} {
  const blockers: string[] = [];

  if (instrument.verificationStatus !== 'BANK_CONFIRMED' && instrument.verificationStatus !== 'MANUALLY_VERIFIED') {
    blockers.push('Instrument must have completed authorized bank verification.');
  }

  const unresolvedDiscrepancies = instrument.discrepancies.filter((d) => !d.isResolved);
  if (unresolvedDiscrepancies.length > 0) {
    blockers.push(`Instrument has ${unresolvedDiscrepancies.length} unresolved discrepancy flag(s).`);
  }

  if (['RELEASED', 'REJECTED', 'RENEWED_REPLACED'].includes(instrument.lifecycleStatus)) {
    blockers.push(`Instrument is already in a non-actionable status (${instrument.lifecycleStatus}).`);
  }

  if (instrument.releaseRequest && instrument.releaseRequest.status !== 'REJECTED') {
    blockers.push('A release request is already actively being processed.');
  }

  return {
    eligible: blockers.length === 0,
    blockers,
  };
}

/**
 * Formats Indian Currency (INR Lakhs/Crores)
 * Follows AICTE official gazette notation (Rs. Lakhs/Cr)
 */
export function formatINR(amount: number): string {
  if (amount >= 10000000) {
    return `Rs. ${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    return `Rs. ${(amount / 100000).toFixed(2)} Lakh`;
  }
  return `Rs. ${amount.toLocaleString('en-IN')}`;
}
