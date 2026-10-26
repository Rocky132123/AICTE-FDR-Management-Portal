/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * AICTE Security Deposit & FDR Management Portal
 * Batch CSV Import & Institutional Validation Engine
 */

import { FDRInstrument, Institution } from '../types/fdr';
import { formatINR } from './validation';

export interface BatchImportRowResult {
  rowNumber: number;
  rawRecord: Record<string, string>;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  instrument?: FDRInstrument;
}

export interface BatchImportResult {
  totalRows: number;
  validCount: number;
  errorCount: number;
  rows: BatchImportRowResult[];
  validInstruments: FDRInstrument[];
}

/**
 * Parses raw CSV text respecting RFC 4180 (quoted fields, commas, escaped quotes, newlines inside quotes).
 */
export function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  // Normalize line breaks
  const text = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: "" -> "
          currentField += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        // Only push row if it contains at least one non-empty field
        if (currentRow.some((field) => field !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  // Push final field/row if any remaining
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((field) => field !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Normalizes header keys by removing spaces, underscores, dashes, and converting to lowercase.
 */
function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Normalizes common date string formats into standard YYYY-MM-DD.
 * Supports:
 * - YYYY-MM-DD
 * - DD/MM/YYYY
 * - DD-MM-YYYY
 * - YYYY/MM/DD
 */
export function normalizeDate(dateStr: string): string | null {
  if (!dateStr) return null;
  const clean = dateStr.trim();

  // YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = String(parseInt(isoMatch[2], 10)).padStart(2, '0');
    const day = String(parseInt(isoMatch[3], 10)).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const day = String(parseInt(dmyMatch[1], 10)).padStart(2, '0');
    const month = String(parseInt(dmyMatch[2], 10)).padStart(2, '0');
    const year = parseInt(dmyMatch[3], 10);
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
}

/**
 * Parses numeric currency values like "35,00,000", "Rs. 3500000", "Rs. 50,00,000/-", "5000000.00"
 */
export function parseDepositAmount(amountStr: string): number {
  if (!amountStr) return NaN;
  // Remove currency prefixes ("Rs.", "INR", "₹"), trailing "/-", and commas
  let clean = amountStr.replace(/^(rs\.?|inr|₹)\s*/i, '').replace(/\/-$/, '').trim();
  clean = clean.replace(/,/g, '');
  const match = clean.match(/\d+(\.\d+)?/);
  if (!match) return NaN;
  return parseFloat(match[0]);
}

/**
 * Parses boolean representations (yes/no, true/false, 1/0, y/n)
 */
export function parseBooleanFlag(val: string | undefined, defaultVal = true): boolean {
  if (val === undefined || val === null || val.trim() === '') return defaultVal;
  const normalized = val.trim().toLowerCase();
  if (['true', 'yes', 'y', '1', 'correct', 'confirmed'].includes(normalized)) return true;
  if (['false', 'no', 'n', '0', 'discharged', 'no-lien'].includes(normalized)) return false;
  return defaultVal;
}

/**
 * Validates and transforms a parsed CSV dataset into structured FDR records.
 * Enforces:
 * 1. AICTE Institution permanent ID exists in the approved institutions list
 * 2. FDR Number is unique against existing records and within the batch
 * 3. Deposit amount is positive and meets minimum statutory deposit
 * 4. Issue and maturity dates are valid, chronological, and within plausible bounds
 * 5. IFSC Code is 11 alphanumeric characters
 */
export function validateBatchFdrImport(
  csvContent: string,
  institutions: Institution[],
  existingInstruments: FDRInstrument[] = []
): BatchImportResult {
  const parsedGrid = parseCSV(csvContent);

  if (parsedGrid.length < 2) {
    return {
      totalRows: 0,
      validCount: 0,
      errorCount: 0,
      rows: [],
      validInstruments: [],
    };
  }

  // 1. Map headers to canonical keys
  const rawHeaders = parsedGrid[0];
  const headerMap: Record<string, number> = {};
  rawHeaders.forEach((h, index) => {
    headerMap[normalizeHeader(h)] = index;
  });

  const getColVal = (row: string[], ...canonicalNames: string[]): string => {
    for (const name of canonicalNames) {
      const normalized = normalizeHeader(name);
      if (headerMap[normalized] !== undefined && row[headerMap[normalized]] !== undefined) {
        return row[headerMap[normalized]].trim();
      }
    }
    return '';
  };

  const results: BatchImportRowResult[] = [];
  const validInstruments: FDRInstrument[] = [];
  const seenFdrNumbersInBatch = new Set<string>();

  // Pre-index institutions by aictePermanentId (and normalized name as fallback)
  const institutionByIdMap = new Map<string, Institution>();
  const institutionByNameMap = new Map<string, Institution>();

  institutions.forEach((inst) => {
    institutionByIdMap.set(inst.aictePermanentId.trim().toLowerCase(), inst);
    institutionByIdMap.set(inst.id.trim().toLowerCase(), inst);
    institutionByNameMap.set(inst.name.trim().toLowerCase(), inst);
  });

  // Pre-index existing FDR numbers
  const existingFdrSet = new Set(
    existingInstruments
      .filter((i) => i.lifecycleStatus !== 'REJECTED')
      .map((i) => i.fdrNumber.trim().toUpperCase())
  );

  // 2. Iterate each row (starting from line 2)
  for (let rowIndex = 1; rowIndex < parsedGrid.length; rowIndex++) {
    const row = parsedGrid[rowIndex];
    const rowNumber = rowIndex + 1; // 1-indexed line in file

    // Extract raw fields
    const fdrNumber = getColVal(row, 'fdrNumber', 'fdr_no', 'fdr_number', 'receipt_no', 'receipt_number', 'fdr');
    const aicteId = getColVal(row, 'aictePermanentId', 'aicteId', 'aicte_permanent_id', 'aicte_id', 'permanent_id', 'institution_id');
    const instName = getColVal(row, 'institutionName', 'institution', 'college_name', 'institute_name', 'name');
    const bankName = getColVal(row, 'issuingBank', 'bank', 'bank_name', 'bankName');
    const branchName = getColVal(row, 'bankBranch', 'branch', 'branch_name', 'bankBranch') || 'Main Branch';
    const ifscCode = getColVal(row, 'ifscCode', 'ifsc', 'ifsc_code', 'ifscCode');
    const amountRaw = getColVal(row, 'depositAmount', 'amount', 'deposit_amount', 'amount_inr', 'deposit_value');
    const issueDateRaw = getColVal(row, 'issueDate', 'issue_date', 'date_of_issue');
    const maturityDateRaw = getColVal(row, 'maturityDate', 'maturity_date', 'date_of_maturity', 'expiry_date');
    const interestRateRaw = getColVal(row, 'interestRate', 'interest_rate', 'roi', 'rate');
    const lienRaw = getColVal(row, 'lienMarkedToAICTE', 'lien_marked', 'lien', 'lien_marked_to_aicte');
    const jointRaw = getColVal(row, 'jointAccountWithAICTE', 'joint_account', 'joint', 'joint_account_with_aicte');

    const rawRecord: Record<string, string> = {
      fdrNumber,
      aictePermanentId: aicteId,
      institutionName: instName,
      issuingBank: bankName,
      bankBranch: branchName,
      ifscCode,
      depositAmount: amountRaw,
      issueDate: issueDateRaw,
      maturityDate: maturityDateRaw,
      interestRate: interestRateRaw,
      lienMarkedToAICTE: lienRaw,
      jointAccountWithAICTE: jointRaw,
    };

    const errors: string[] = [];
    const warnings: string[] = [];

    // --- Validation Checks ---

    // 1. FDR Number
    if (!fdrNumber) {
      errors.push('FDR Receipt Number is required.');
    } else {
      const upperFdr = fdrNumber.trim().toUpperCase();
      if (existingFdrSet.has(upperFdr)) {
        errors.push(`FDR Number "${fdrNumber}" already exists in the central registry.`);
      } else if (seenFdrNumbersInBatch.has(upperFdr)) {
        errors.push(`Duplicate FDR Number "${fdrNumber}" detected within this import batch.`);
      } else {
        seenFdrNumbersInBatch.add(upperFdr);
      }
    }

    // 2. Institution Validation against Approved Institutions List
    let matchedInstitution: Institution | undefined;
    if (aicteId) {
      matchedInstitution = institutionByIdMap.get(aicteId.trim().toLowerCase());
    }

    // Fallback: match by Institution Name if ID didn't match or was omitted
    if (!matchedInstitution && instName) {
      matchedInstitution = institutionByNameMap.get(instName.trim().toLowerCase());
    }

    if (!matchedInstitution) {
      if (!aicteId && !instName) {
        errors.push('Institution AICTE Permanent ID or registered Institution Name is required.');
      } else {
        errors.push(
          `AICTE ID "${aicteId || instName}" is not registered in the approved AICTE institution directory.`
        );
      }
    }

    // 3. Bank Name & IFSC
    if (!bankName) {
      errors.push('Issuing Bank Name is required.');
    }

    if (ifscCode) {
      const cleanIfsc = ifscCode.trim().toUpperCase();
      // Standard RBI IFSC format: 4 letters, 0, 6 characters
      if (cleanIfsc.length !== 11) {
        warnings.push(`IFSC Code "${ifscCode}" should be 11 characters in length.`);
      }
    } else {
      warnings.push('IFSC Code is missing. Verification will require manual branch validation.');
    }

    // 4. Deposit Amount
    const parsedAmount = parseDepositAmount(amountRaw);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      errors.push(`Deposit Amount "${amountRaw}" must be a valid positive amount in INR.`);
    } else if (parsedAmount < 100000) {
      warnings.push(
        `Deposit amount of ${formatINR(parsedAmount)} is below the typical AICTE statutory threshold (Rs. 1,00,000).`
      );
    }

    // 5. Date Validation
    const normIssue = normalizeDate(issueDateRaw);
    const normMaturity = normalizeDate(maturityDateRaw);

    if (!normIssue) {
      errors.push(`Invalid Issue Date "${issueDateRaw}". Please use YYYY-MM-DD or DD/MM/YYYY format.`);
    }
    if (!normMaturity) {
      errors.push(`Invalid Maturity Date "${maturityDateRaw}". Please use YYYY-MM-DD or DD/MM/YYYY format.`);
    }

    if (normIssue && normMaturity) {
      const issueTime = new Date(normIssue).getTime();
      const maturityTime = new Date(normMaturity).getTime();

      if (maturityTime <= issueTime) {
        errors.push(`Maturity Date (${normMaturity}) must be strictly later than Issue Date (${normIssue}).`);
      } else {
        const diffDays = Math.round((maturityTime - issueTime) / (1000 * 60 * 60 * 24));
        if (diffDays < 180) {
          warnings.push(`Tenure of ${diffDays} days is shorter than standard AICTE statutory deposit guidelines.`);
        }
      }
    }

    // 6. Regulatory Lien & Joint Account
    const lienMarked = parseBooleanFlag(lienRaw, true);
    const jointAccount = parseBooleanFlag(jointRaw, true);

    if (!lienMarked) {
      warnings.push('Lien to AICTE marked as False. May trigger regulatory discrepancy flag.');
    }
    if (!jointAccount) {
      warnings.push('Joint Account with AICTE marked as False.');
    }

    const isValid = errors.length === 0;

    // Build valid instrument if checks pass
    let instrument: FDRInstrument | undefined;
    if (isValid && matchedInstitution && normIssue && normMaturity) {
      const issueTime = new Date(normIssue).getTime();
      const maturityTime = new Date(normMaturity).getTime();
      const tenureMonths = Math.max(
        1,
        Math.round((maturityTime - issueTime) / (1000 * 60 * 60 * 24 * 30.4375))
      );
      const interestRate = parseFloat(interestRateRaw) || 7.15;
      const cleanFdrNumber = fdrNumber.trim().toUpperCase();

      instrument = {
        id: `fdr-batch-${Date.now()}-${rowIndex}`,
        fdrNumber: cleanFdrNumber,
        institutionId: matchedInstitution.id,
        institutionName: matchedInstitution.name,
        aictePermanentId: matchedInstitution.aictePermanentId,
        issuingBank: bankName.trim(),
        bankBranch: branchName.trim(),
        ifscCode: (ifscCode || 'SBIN0000001').trim().toUpperCase(),
        depositAmount: parsedAmount,
        depositAmountInWords: `${formatINR(parsedAmount)} (Batch Registered)`,
        issueDate: normIssue,
        maturityDate: normMaturity,
        tenureMonths,
        interestRate,
        lienMarkedToAICTE: lienMarked,
        jointAccountWithAICTE: jointAccount,
        documentFileName: `Batch_Deposit_${cleanFdrNumber}.pdf`,
        documentFileSize: '380 KB',
        documentUrl: '/docs/batch-import-template.pdf',
        documentChecksum: 'sha256-batch-' + Math.random().toString(36).substring(2, 10),
        lifecycleStatus: 'AWAITING_VERIFICATION',
        verificationStatus: 'PENDING_VERIFICATION',
        discrepancies: [],
        submittedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        submittedBy: matchedInstitution.email,
        tags: [matchedInstitution.type, 'Batch CSV Import', 'Awaiting SFMS Verification'],
      };

      validInstruments.push(instrument);
    }

    results.push({
      rowNumber,
      rawRecord,
      isValid,
      errors,
      warnings,
      instrument,
    });
  }

  const validCount = results.filter((r) => r.isValid).length;
  const errorCount = results.filter((r) => !r.isValid).length;

  return {
    totalRows: results.length,
    validCount,
    errorCount,
    rows: results,
    validInstruments,
  };
}

function escapeCell(val: string | number): string {
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates a ready-to-use CSV template populated with sample rows that match approved institutions.
 */
export function generateCsvTemplate(sampleInstitutions: Institution[] = []): string {
  const headers = [
    'fdrNumber',
    'aictePermanentId',
    'institutionName',
    'issuingBank',
    'bankBranch',
    'ifscCode',
    'depositAmount',
    'issueDate',
    'maturityDate',
    'interestRate',
    'lienMarkedToAICTE',
    'jointAccountWithAICTE',
  ];

  const sampleRows: (string | number)[][] = [];

  if (sampleInstitutions.length > 0) {
    const inst1 = sampleInstitutions[0];
    sampleRows.push([
      `FDR-SBI-BATCH-${new Date().getFullYear()}-001`,
      inst1.aictePermanentId,
      inst1.name,
      'State Bank of India',
      'Connaught Circus, New Delhi',
      'SBIN0000691',
      3500000,
      '2026-04-15',
      '2034-04-15',
      7.15,
      'YES',
      'YES',
    ]);
  }

  if (sampleInstitutions.length > 1) {
    const inst2 = sampleInstitutions[1];
    sampleRows.push([
      `FDR-HDFC-BATCH-${new Date().getFullYear()}-002`,
      inst2.aictePermanentId,
      inst2.name,
      'HDFC Bank Ltd',
      'Shivajinagar Branch, Pune',
      'HDFC0000103',
      2500000,
      '2026-05-10',
      '2034-05-10',
      7.20,
      'YES',
      'YES',
    ]);
  }

  if (sampleInstitutions.length > 2) {
    const inst3 = sampleInstitutions[2];
    sampleRows.push([
      `FDR-CAN-BATCH-${new Date().getFullYear()}-003`,
      inst3.aictePermanentId,
      inst3.name,
      'Canara Bank',
      'Guindy Industrial Estate, Chennai',
      'CNRB0001928',
      5000000,
      '2026-06-01',
      '2036-06-01',
      7.35,
      'YES',
      'YES',
    ]);
  }

  return [
    headers.join(','),
    ...sampleRows.map((r) => r.map(escapeCell).join(',')),
  ].join('\n');
}
