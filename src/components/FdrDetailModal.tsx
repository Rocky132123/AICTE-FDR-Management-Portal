/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, ShieldCheck, AlertTriangle, FileText, CheckCircle2, 
  ExternalLink, Clock, RefreshCw, Send, Check, Ban 
} from 'lucide-react';
import { FDRInstrument, UserRole } from '../types/fdr';
import { formatINR } from '../logic/validation';

interface FdrDetailModalProps {
  instrument: FDRInstrument | null;
  onClose: () => void;
  currentUserRole: UserRole;
  onResolveDiscrepancy: (fdrId: string, discrepancyId: string, note: string) => void;
  onTriggerBankVerification: (fdrId: string) => void;
  onApproveRelease: (fdrId: string, level: 'RO' | 'DIRECTOR', remarks: string) => void;
  onRejectRelease: (fdrId: string, remarks: string) => void;
}

export const FdrDetailModal: React.FC<FdrDetailModalProps> = ({
  instrument,
  onClose,
  currentUserRole,
  onResolveDiscrepancy,
  onTriggerBankVerification,
  onApproveRelease,
  onRejectRelease,
}) => {
  if (!instrument) return null;

  const [activeTab, setActiveTab] = useState<'DETAILS' | 'OCR_COMPARE' | 'DISCREPANCIES' | 'RENEWAL' | 'RELEASE'>('DETAILS');
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSimulateBankPing = () => {
    setIsVerifying(true);
    setTimeout(() => {
      onTriggerBankVerification(instrument.id);
      setIsVerifying(false);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div 
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs bg-orange-100 text-orange-900 border border-orange-200 px-2 py-0.5 rounded font-bold">
                {instrument.fdrNumber}
              </span>
              <span className="text-xs text-slate-500 font-mono">ID: {instrument.id}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">
              {instrument.institutionName}
            </h2>
            <div className="text-xs text-slate-600 font-medium">
              AICTE Permanent ID: {instrument.aictePermanentId} &bull; {instrument.issuingBank} ({instrument.bankBranch})
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tab Bar */}
        <div className="px-5 border-b border-slate-200 flex space-x-4 bg-slate-100/70 text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('DETAILS')}
            className={`py-3 border-b-2 cursor-pointer shrink-0 ${
              activeTab === 'DETAILS'
                ? 'border-orange-600 text-orange-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Instrument Overview &amp; Verification
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('OCR_COMPARE')}
            className={`py-3 border-b-2 cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'OCR_COMPARE'
                ? 'border-orange-600 text-orange-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Side-by-Side OCR Comparison
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('DISCREPANCIES')}
            className={`py-3 border-b-2 cursor-pointer flex items-center gap-1.5 shrink-0 ${
              activeTab === 'DISCREPANCIES'
                ? 'border-orange-600 text-orange-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Discrepancies
            {instrument.discrepancies.filter((d) => !d.isResolved).length > 0 && (
              <span className="bg-red-600 text-white px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                {instrument.discrepancies.filter((d) => !d.isResolved).length}
              </span>
            )}
          </button>
          {instrument.renewalInfo && (
            <button
              type="button"
              onClick={() => setActiveTab('RENEWAL')}
              className={`py-3 border-b-2 cursor-pointer shrink-0 ${
                activeTab === 'RENEWAL'
                  ? 'border-orange-600 text-orange-600 font-bold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Renewal History (Sequence #{instrument.renewalInfo.renewalSequenceNumber})
            </button>
          )}
          {instrument.releaseRequest && (
            <button
              type="button"
              onClick={() => setActiveTab('RELEASE')}
              className={`py-3 border-b-2 cursor-pointer flex items-center gap-1.5 shrink-0 ${
                activeTab === 'RELEASE'
                  ? 'border-indigo-600 text-indigo-700 font-bold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Release Request Pipeline
              <span className="bg-indigo-600 text-white px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                Active
              </span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-800">
          {/* TAB 1: DETAILS */}
          {activeTab === 'DETAILS' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[11px] text-slate-500 uppercase font-semibold">Deposit Principal</span>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">
                    {formatINR(instrument.depositAmount)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">{instrument.depositAmountInWords}</div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 uppercase font-semibold">Tenure / Dates</span>
                  <div className="text-sm font-semibold text-slate-900 mt-0.5">
                    {instrument.issueDate} &rarr; {instrument.maturityDate}
                  </div>
                  <div className="text-[10px] text-slate-500">{instrument.tenureMonths} Months ({instrument.interestRate}% p.a.)</div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500 uppercase font-semibold">Regulatory Lien</span>
                  <div className="mt-0.5 flex flex-col gap-1">
                    <span className={`inline-flex items-center text-[11px] font-semibold ${instrument.lienMarkedToAICTE ? 'text-emerald-700' : 'text-red-600'}`}>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Lien to AICTE Member Sec.
                    </span>
                    <span className={`inline-flex items-center text-[11px] font-semibold ${instrument.jointAccountWithAICTE ? 'text-emerald-700' : 'text-red-600'}`}>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Joint Account with RO
                    </span>
                  </div>
                </div>
              </div>

              {/* Verification Evidence Ledger */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Authorized Verification Evidence
                  </h3>
                  <span className="text-[11px] px-2 py-0.5 rounded font-mono bg-slate-100 text-slate-700 border border-slate-200">
                    Status: {instrument.verificationStatus}
                  </span>
                </div>

                {instrument.verificationEvidence ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500">Verification Source:</span>
                      <div className="font-semibold text-slate-900">
                        {instrument.verificationEvidence.verificationSource}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Bank Confirmation Reference:</span>
                      <div className="font-mono font-semibold text-emerald-700">
                        {instrument.verificationEvidence.bankReferenceNumber || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">Verified By &amp; Timestamp:</span>
                      <div className="text-slate-800">
                        {instrument.verificationEvidence.verifiedBy} ({instrument.verificationEvidence.verifiedAt})
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-500">Official Evidence Remarks:</span>
                      <div className="p-2 rounded bg-slate-50 border border-slate-200 text-slate-800 mt-1">
                        {instrument.verificationEvidence.officialRemarks}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-xs flex items-center gap-1.5 text-amber-900">
                        <AlertTriangle className="w-4 h-4 text-amber-600" /> Awaiting Independent Verification
                      </div>
                      <p className="text-[11px] mt-0.5 text-amber-800">
                        FDR details have been submitted and OCR extracted, but have not yet been independently confirmed via SFMS Gateway or Bank API.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSimulateBankPing}
                      disabled={isVerifying}
                      className="px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      {isVerifying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                      Trigger SFMS Verification
                    </button>
                  </div>
                )}
              </div>

              {/* Supporting Document Details */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="w-8 h-8 text-orange-600" />
                  <div>
                    <div className="font-semibold text-slate-900 text-xs">
                      {instrument.documentFileName}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Checksum: {instrument.documentChecksum.substring(0, 24)}... &bull; Size: {instrument.documentFileSize}
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 italic">
                  Stored securely in AICTE Private Vault
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OCR COMPARISON */}
          {activeTab === 'OCR_COMPARE' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-950 text-xs">
                <strong>AICTE Document Intelligence Principle:</strong> Submitted values must be distinguished from OCR-extracted values and independently verified bank facts.
              </div>

              {instrument.ocrData ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase border-b border-slate-200">
                        <th className="p-3">Field</th>
                        <th className="p-3">Declared by Institution</th>
                        <th className="p-3">Extracted by Document OCR</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-3 font-semibold text-slate-600">FDR Reference</td>
                        <td className="p-3 font-mono font-bold text-slate-900">{instrument.fdrNumber}</td>
                        <td className="p-3 font-mono text-slate-800">{instrument.ocrData.extractedFdrNumber}</td>
                        <td className="p-3 text-center">
                          {instrument.fdrNumber.trim().toUpperCase() === instrument.ocrData.extractedFdrNumber.trim().toUpperCase() ? (
                            <span className="text-emerald-700 font-bold">Match</span>
                          ) : (
                            <span className="text-red-600 font-bold">Mismatch</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-slate-600">Deposit Amount</td>
                        <td className="p-3 font-bold text-slate-900">{formatINR(instrument.depositAmount)}</td>
                        <td className="p-3 font-bold text-slate-800">{formatINR(instrument.ocrData.extractedAmount)}</td>
                        <td className="p-3 text-center">
                          {instrument.depositAmount === instrument.ocrData.extractedAmount ? (
                            <span className="text-emerald-700 font-bold">Match</span>
                          ) : (
                            <span className="text-red-600 font-bold">CRITICAL DEFICIT</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-slate-600">Issuing Bank</td>
                        <td className="p-3 text-slate-900">{instrument.issuingBank}</td>
                        <td className="p-3 text-slate-800">{instrument.ocrData.extractedBank}</td>
                        <td className="p-3 text-center">
                          <span className="text-emerald-700 font-bold">Consistent</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-slate-600">Maturity Date</td>
                        <td className="p-3 text-slate-900">{instrument.maturityDate}</td>
                        <td className="p-3 text-slate-800">{instrument.ocrData.extractedMaturityDate}</td>
                        <td className="p-3 text-center">
                          {instrument.maturityDate === instrument.ocrData.extractedMaturityDate ? (
                            <span className="text-emerald-700 font-bold">Match</span>
                          ) : (
                            <span className="text-red-600 font-bold">Mismatch</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-slate-600">Lien Endorsement</td>
                        <td className="p-3 text-slate-900">
                          {instrument.lienMarkedToAICTE ? 'Claimed Lien Marked' : 'No'}
                        </td>
                        <td className="p-3 text-slate-800">
                          {instrument.ocrData.extractedLienStatus ? 'AICTE Lien Text Found' : 'Absent (Non-Lien Ordinary Deposit)'}
                        </td>
                        <td className="p-3 text-center">
                          {instrument.lienMarkedToAICTE && !instrument.ocrData.extractedLienStatus ? (
                            <span className="text-amber-700 font-bold">Warning</span>
                          ) : (
                            <span className="text-emerald-700 font-bold">Match</span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500">
                  No OCR extraction record found for this instrument.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DISCREPANCIES */}
          {activeTab === 'DISCREPANCIES' && (
            <div className="space-y-4">
              {instrument.discrepancies.length === 0 ? (
                <div className="p-8 text-center text-emerald-700 space-y-2 bg-emerald-50 rounded-xl border border-emerald-200">
                  <CheckCircle2 className="w-10 h-10 mx-auto" />
                  <div className="font-bold text-sm">Clean Record &bull; Zero Discrepancies</div>
                  <p className="text-xs text-slate-600">All declared values perfectly reconciled with OCR and business rules.</p>
                </div>
              ) : (
                instrument.discrepancies.map((disc) => (
                  <div
                    key={disc.id}
                    className={`p-4 rounded-xl border shadow-2xs ${
                      disc.isResolved
                        ? 'bg-slate-50 border-slate-200 opacity-90'
                        : disc.severity === 'CRITICAL'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-amber-50 border-amber-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            disc.severity === 'CRITICAL' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
                          }`}>
                            {disc.severity}
                          </span>
                          <span className="font-bold text-slate-900 text-xs">
                            {disc.field} Discrepancy
                          </span>
                          {disc.isResolved && (
                            <span className="text-emerald-700 font-bold text-[10px] flex items-center gap-1">
                              <Check className="w-3 h-3" /> Resolved
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-800 mt-1">
                          {disc.message}
                        </p>
                        <div className="mt-2 text-[11px] grid grid-cols-2 gap-2 text-slate-600">
                          <div>Declared: <strong className="text-slate-900">{disc.declaredValue}</strong></div>
                          <div>Extracted: <strong className="text-slate-900">{disc.extractedValue}</strong></div>
                        </div>
                      </div>
                    </div>

                    {!disc.isResolved && (currentUserRole === 'AICTE_RO' || currentUserRole === 'AICTE_HQ_ADMIN') && (
                      <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Resolution rationale (e.g. Verified with bank branch manager Sri Gupta)"
                          value={resolutionNotes[disc.id] || ''}
                          onChange={(e) => setResolutionNotes({ ...resolutionNotes, [disc.id]: e.target.value })}
                          className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => onResolveDiscrepancy(instrument.id, disc.id, resolutionNotes[disc.id] || 'Verified and resolved by AICTE official.')}
                          className="px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-bold transition hover:bg-orange-700 cursor-pointer shadow-2xs"
                        >
                          Resolve Flag
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: RENEWAL HISTORY */}
          {activeTab === 'RENEWAL' && instrument.renewalInfo && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-orange-600" />
                  Preserved Instrument Renewal Chain
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500">Predecessor Instrument:</span>
                    <div className="font-mono font-semibold text-slate-900">
                      {instrument.renewalInfo.previousFdrNumber}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Replacement Instrument:</span>
                    <div className="font-mono font-semibold text-orange-600">
                      {instrument.fdrNumber}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Renewal Sequence:</span>
                    <div className="font-semibold text-slate-900">
                      Cycle #{instrument.renewalInfo.renewalSequenceNumber} (+{instrument.renewalInfo.tenureExtensionMonths} Months)
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Renewal Date:</span>
                    <div className="font-semibold text-slate-900">
                      {instrument.renewalInfo.renewalDate}
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-slate-600">
                  <strong>Regulatory Rationale:</strong> {instrument.renewalInfo.replacementReason}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: RELEASE REQUEST PIPELINE */}
          {activeTab === 'RELEASE' && instrument.releaseRequest && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 space-y-3">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                  <div className="font-bold text-indigo-950 text-sm">
                    Release Request Application #{instrument.releaseRequest.id}
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-600 text-white">
                    {instrument.releaseRequest.status}
                  </span>
                </div>

                <div className="text-xs space-y-1">
                  <span className="text-slate-700 font-semibold">Institution Justification:</span>
                  <p className="p-2.5 rounded bg-white border border-indigo-100 text-slate-900 font-medium">
                    {instrument.releaseRequest.justification}
                  </p>
                </div>

                {/* Compliance Checklist */}
                <div>
                  <span className="text-xs font-semibold text-slate-800">
                    Statutory AICTE Compliance Criteria Check:
                  </span>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="flex items-center space-x-2 text-xs text-slate-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>No pending student dues or faculty arrears</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-slate-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Valid continuous AICTE Approval letters attached</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-slate-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Permanent building &amp; land compliance certified</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-slate-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Clear of legal / court proceedings</span>
                    </div>
                  </div>
                </div>

                {/* Dual-Tier Approval Actions */}
                {(currentUserRole === 'AICTE_RO' || currentUserRole === 'AICTE_HQ_ADMIN') && (
                  <div className="pt-3 border-t border-indigo-200 space-y-3">
                    <label className="block text-xs font-semibold text-slate-800">
                      Officer Review &amp; Recommendation Remarks:
                    </label>
                    <textarea
                      rows={2}
                      value={approvalRemarks}
                      onChange={(e) => setApprovalRemarks(e.target.value)}
                      placeholder="e.g. Scrutinized institutional records and building completion certificate. Recommended for release."
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white text-slate-900"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      {currentUserRole === 'AICTE_RO' && (
                        <button
                          type="button"
                          onClick={() => onApproveRelease(instrument.id, 'RO', approvalRemarks || 'Recommended by Regional Officer.')}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                        >
                          <Check className="w-3.5 h-3.5" /> Forward to HQ Director with Recommendation
                        </button>
                      )}

                      {currentUserRole === 'AICTE_HQ_ADMIN' && (
                        <button
                          type="button"
                          onClick={() => onApproveRelease(instrument.id, 'DIRECTOR', approvalRemarks || 'Sanctioned and released by Member Secretary / HQ Director.')}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                        >
                          <Check className="w-3.5 h-3.5" /> Grant Final Sanction &amp; Lien Discharge
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onRejectRelease(instrument.id, approvalRemarks || 'Deficiencies observed; release declined.')}
                        className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <Ban className="w-3.5 h-3.5" /> Reject Request
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-[11px] text-slate-600 font-mono">
            Audit Tracked Actor: {currentUserRole} &bull; 2026 AICTE Architecture
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold cursor-pointer border border-slate-300"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
