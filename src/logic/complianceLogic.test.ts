/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * AICTE Security Deposit & FDR Management Portal
 * Compliance Logic Unit Tests using Node's test runner
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateComplianceScore,
  buildInstitutionComplianceProfile,
  DEFAULT_COMPLIANCE_ITEMS,
  ComplianceItem,
} from './complianceLogic.ts';
import { Institution, FDRInstrument } from '../types/fdr.ts';

test('calculateComplianceScore returns 100% and Grade A when all mandatory items are compliant', () => {
  const items: ComplianceItem[] = DEFAULT_COMPLIANCE_ITEMS.map((item) => ({
    ...item,
    status: 'COMPLIANT',
  }));

  const result = calculateComplianceScore(items);
  assert.equal(result.score, 100);
  assert.equal(result.grade, 'A');
  assert.equal(result.statusText, 'Fully Compliant');
  assert.equal(result.compliantCount, 6);
  assert.equal(result.totalMandatoryCount, 6);
});

test('calculateComplianceScore assigns partial weight (50%) to PENDING_REVIEW items', () => {
  const items: ComplianceItem[] = [
    {
      id: 'i1',
      category: 'INFRASTRUCTURE',
      title: 'Land Docs',
      description: 'Desc',
      mandatory: true,
      weight: 50,
      status: 'COMPLIANT',
    },
    {
      id: 'i2',
      category: 'LEGAL',
      title: 'Court Affidavit',
      description: 'Desc',
      mandatory: true,
      weight: 50,
      status: 'PENDING_REVIEW', // 50 * 0.5 = 25
    },
  ];

  const result = calculateComplianceScore(items);
  // Passed weight = 50 + 25 = 75 out of 100 -> 75%
  assert.equal(result.score, 75);
  assert.equal(result.grade, 'B');
  assert.equal(result.statusText, 'Conditionally Compliant');
});

test('calculateComplianceScore flags Grade C when multiple critical filings are deficient', () => {
  const items: ComplianceItem[] = [
    {
      id: 'i1',
      category: 'REGULATORY_DEPOSIT',
      title: 'FDR Lien',
      description: 'Desc',
      mandatory: true,
      weight: 40,
      status: 'DEFICIENT',
    },
    {
      id: 'i2',
      category: 'FACULTY_FINANCE',
      title: 'Salary',
      description: 'Desc',
      mandatory: true,
      weight: 40,
      status: 'DEFICIENT',
    },
    {
      id: 'i3',
      category: 'LEGAL',
      title: 'Affidavit',
      description: 'Desc',
      mandatory: true,
      weight: 20,
      status: 'COMPLIANT',
    },
  ];

  const result = calculateComplianceScore(items);
  assert.equal(result.score, 20);
  assert.equal(result.grade, 'C');
  assert.equal(result.statusText, 'Non-Compliant (Action Required)');
});

test('calculateComplianceScore handles empty items gracefully', () => {
  const result = calculateComplianceScore([]);
  assert.equal(result.score, 0);
  assert.equal(result.grade, 'C');
});

test('buildInstitutionComplianceProfile constructs valid profile linking to institution details', () => {
  const mockInst: Institution = {
    id: 'inst-1',
    aictePermanentId: '1-10928374',
    name: 'Delhi Institute of Engineering & Advanced Technology',
    region: 'Northern',
    state: 'Delhi (NCT)',
    type: 'Engineering & Technology',
    email: 'test@diet.edu',
    phone: '1234567890',
    contactPerson: 'Director',
    address: 'Delhi',
  };

  const profile = buildInstitutionComplianceProfile(mockInst, []);
  assert.equal(profile.institutionId, 'inst-1');
  assert.equal(profile.aictePermanentId, '1-10928374');
  assert.equal(profile.items.length, 6);
  assert.ok(profile.items.some((i) => i.id === 'item-land-building'));
  assert.ok(profile.items.some((i) => i.id === 'item-court-cases'));
  assert.ok(profile.items.some((i) => i.id === 'item-faculty-salary'));
});
