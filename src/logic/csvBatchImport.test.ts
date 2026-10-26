/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * AICTE Security Deposit & FDR Management Portal
 * Batch CSV Import Unit Tests using Node Test Runner
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCSV,
  normalizeDate,
  parseDepositAmount,
  parseBooleanFlag,
  validateBatchFdrImport,
  generateCsvTemplate,
} from './csvBatchImport.ts';
import { Institution, FDRInstrument } from '../types/fdr.ts';

const mockInstitutions: Institution[] = [
  {
    id: 'inst-1',
    aictePermanentId: '1-10928374',
    name: 'Delhi Institute of Engineering & Advanced Technology',
    region: 'Northern',
    state: 'Delhi (NCT)',
    type: 'Engineering & Technology',
    email: 'registrar@diet-delhi.ac.in',
    phone: '+91-11-2389-4011',
    contactPerson: 'Dr. Sharma',
    address: 'Rohini Sector 22, New Delhi',
  },
  {
    id: 'inst-2',
    aictePermanentId: '1-43289012',
    name: 'Pune College of Applied Management Studies',
    region: 'Western',
    state: 'Maharashtra',
    type: 'Management',
    email: 'approvals@pcams-pune.edu.in',
    phone: '+91-20-2567-8900',
    contactPerson: 'Prof. Kulkarni',
    address: 'Shivajinagar, Pune',
  },
];

const mockExistingInstruments: FDRInstrument[] = [
  {
    id: 'fdr-existing-001',
    fdrNumber: 'SBI-ND-2023-88910',
    institutionId: 'inst-1',
    institutionName: 'Delhi Institute of Engineering & Advanced Technology',
    aictePermanentId: '1-10928374',
    issuingBank: 'State Bank of India',
    bankBranch: 'Connaught Circus, New Delhi',
    ifscCode: 'SBIN0000691',
    depositAmount: 3500000,
    depositAmountInWords: 'Rupees Thirty Five Lakhs',
    issueDate: '2023-04-15',
    maturityDate: '2031-04-15',
    tenureMonths: 96,
    interestRate: 7.1,
    lienMarkedToAICTE: true,
    jointAccountWithAICTE: true,
    documentFileName: 'test.pdf',
    documentFileSize: '100 KB',
    documentUrl: '/test.pdf',
    documentChecksum: 'abc',
    lifecycleStatus: 'VERIFIED_ACTIVE',
    verificationStatus: 'BANK_CONFIRMED',
    discrepancies: [],
    submittedAt: '2023-04-15T00:00:00Z',
    lastUpdatedAt: '2023-04-15T00:00:00Z',
    submittedBy: 'test@aicte.gov.in',
    tags: [],
  },
];

test('CSV Parser handles RFC 4180 quotes, commas, and escaped quotes', () => {
  const csv = `fdrNumber,institutionName,depositAmount\n"FDR,101","Delhi ""Advanced"" Tech",3500000\nFDR-102,Pune College,2500000`;
  const parsed = parseCSV(csv);
  assert.equal(parsed.length, 3);
  assert.deepEqual(parsed[0], ['fdrNumber', 'institutionName', 'depositAmount']);
  assert.equal(parsed[1][0], 'FDR,101');
  assert.equal(parsed[1][1], 'Delhi "Advanced" Tech');
  assert.equal(parsed[1][2], '3500000');
  assert.equal(parsed[2][0], 'FDR-102');
});

test('normalizeDate converts multiple standard date representations to YYYY-MM-DD', () => {
  assert.equal(normalizeDate('2026-05-15'), '2026-05-15');
  assert.equal(normalizeDate('15/05/2026'), '2026-05-15');
  assert.equal(normalizeDate('15-05-2026'), '2026-05-15');
  assert.equal(normalizeDate('2026/05/15'), '2026-05-15');
  assert.equal(normalizeDate('invalid-date'), null);
});

test('parseDepositAmount strips commas, rupee symbols and currency suffixes', () => {
  assert.equal(parseDepositAmount('35,00,000'), 3500000);
  assert.equal(parseDepositAmount('Rs. 50,00,000/-'), 5000000);
  assert.equal(parseDepositAmount('1250000.50'), 1250000.50);
  assert.ok(isNaN(parseDepositAmount('none')));
});

test('parseBooleanFlag correctly parses truthy and falsy expressions', () => {
  assert.equal(parseBooleanFlag('YES'), true);
  assert.equal(parseBooleanFlag('true'), true);
  assert.equal(parseBooleanFlag('Y'), true);
  assert.equal(parseBooleanFlag('NO'), false);
  assert.equal(parseBooleanFlag('false'), false);
  assert.equal(parseBooleanFlag('0'), false);
  assert.equal(parseBooleanFlag('', true), true);
});

test('validateBatchFdrImport accepts valid records matching approved institution', () => {
  const validCsv = `fdrNumber,aictePermanentId,issuingBank,bankBranch,ifscCode,depositAmount,issueDate,maturityDate,interestRate,lienMarkedToAICTE,jointAccountWithAICTE
FDR-BATCH-TEST-001,1-10928374,State Bank of India,Connaught Circus,SBIN0000691,3500000,2026-04-15,2034-04-15,7.15,YES,YES
FDR-BATCH-TEST-002,1-43289012,HDFC Bank Ltd,Shivajinagar,HDFC0000103,2500000,2026-05-01,2034-05-01,7.20,YES,YES`;

  const result = validateBatchFdrImport(validCsv, mockInstitutions, mockExistingInstruments);
  assert.equal(result.totalRows, 2);
  assert.equal(result.validCount, 2);
  assert.equal(result.errorCount, 0);
  assert.equal(result.validInstruments.length, 2);

  const inst1 = result.validInstruments[0];
  assert.equal(inst1.fdrNumber, 'FDR-BATCH-TEST-001');
  assert.equal(inst1.institutionId, 'inst-1');
  assert.equal(inst1.institutionName, 'Delhi Institute of Engineering & Advanced Technology');
  assert.equal(inst1.depositAmount, 3500000);
  assert.equal(inst1.lifecycleStatus, 'AWAITING_VERIFICATION');
});

test('validateBatchFdrImport rejects unknown AICTE institution permanent ID', () => {
  const unknownInstCsv = `fdrNumber,aictePermanentId,issuingBank,depositAmount,issueDate,maturityDate
FDR-BATCH-UNKNOWN,1-99999999,State Bank of India,3500000,2026-04-15,2034-04-15`;

  const result = validateBatchFdrImport(unknownInstCsv, mockInstitutions, mockExistingInstruments);
  assert.equal(result.totalRows, 1);
  assert.equal(result.validCount, 0);
  assert.equal(result.errorCount, 1);
  assert.ok(result.rows[0].errors.some((e) => e.includes('not registered in the approved AICTE institution directory')));
});

test('validateBatchFdrImport flags duplicate FDR number against existing registry', () => {
  const dupRegistryCsv = `fdrNumber,aictePermanentId,issuingBank,depositAmount,issueDate,maturityDate
sbi-nd-2023-88910,1-10928374,State Bank of India,3500000,2026-04-15,2034-04-15`;

  const result = validateBatchFdrImport(dupRegistryCsv, mockInstitutions, mockExistingInstruments);
  assert.equal(result.errorCount, 1);
  assert.ok(result.rows[0].errors.some((e) => e.includes('already exists in the central registry')));
});

test('validateBatchFdrImport flags duplicate FDR number within the same batch', () => {
  const dupBatchCsv = `fdrNumber,aictePermanentId,issuingBank,depositAmount,issueDate,maturityDate
FDR-SAME-01,1-10928374,State Bank of India,3500000,2026-04-15,2034-04-15
FDR-SAME-01,1-43289012,State Bank of India,2500000,2026-05-01,2034-05-01`;

  const result = validateBatchFdrImport(dupBatchCsv, mockInstitutions, mockExistingInstruments);
  assert.equal(result.totalRows, 2);
  assert.equal(result.validCount, 1);
  assert.equal(result.errorCount, 1);
  assert.ok(result.rows[1].errors.some((e) => e.includes('Duplicate FDR Number "FDR-SAME-01" detected within this import batch')));
});

test('validateBatchFdrImport flags invalid chronological dates (maturity <= issue)', () => {
  const invalidDateCsv = `fdrNumber,aictePermanentId,issuingBank,depositAmount,issueDate,maturityDate
FDR-DATE-ERR,1-10928374,State Bank of India,3500000,2026-05-15,2026-01-01`;

  const result = validateBatchFdrImport(invalidDateCsv, mockInstitutions, mockExistingInstruments);
  assert.equal(result.errorCount, 1);
  assert.ok(result.rows[0].errors.some((e) => e.includes('must be strictly later than Issue Date')));
});

test('generateCsvTemplate outputs a valid CSV string with approved institution IDs', () => {
  const template = generateCsvTemplate(mockInstitutions);
  assert.ok(template.includes('fdrNumber,aictePermanentId,institutionName'));
  assert.ok(template.includes('1-10928374'));
  assert.ok(template.includes('1-43289012'));

  // Ensure template parsed back is 100% valid
  const validation = validateBatchFdrImport(template, mockInstitutions, mockExistingInstruments);
  assert.equal(validation.totalRows, 2);
  assert.equal(validation.validCount, 2);
  assert.equal(validation.errorCount, 0);
});
