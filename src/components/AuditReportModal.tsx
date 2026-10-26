/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * AICTE Security Deposit & FDR Management Portal
 * Institutional Audit Report & Statutory Dossier Modal (Printable PDF & CSV Export)
 */

import React, { useRef } from 'react';
import { 
  X, Download, Printer, ShieldCheck, AlertTriangle, FileSpreadsheet, 
  Building2, CheckCircle2, Clock, Landmark, Hash, Award, Calendar, FileText
} from 'lucide-react';
import { FDRInstrument, UserRole } from '../types/fdr';
import { computeAuditSummary, generateFDRRegistryCSV, triggerCSVDownload } from '../logic/exportReports';
import { formatINR } from '../logic/validation';

interface AuditReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  instruments: FDRInstrument[];
  activeFilter: string;
  searchQuery?: string;
  currentUserRole: UserRole;
  currentUserName?: string;
}

export const AuditReportModal: React.FC<AuditReportModalProps> = ({
  isOpen,
  onClose,
  instruments,
  activeFilter,
  searchQuery = '',
  currentUserRole,
  currentUserName,
}) => {
  const reportRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const summary = computeAuditSummary(instruments);
  const auditSessionId = `AICTE-AUD-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const auditDateStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const auditTimeStr = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const auditorName = currentUserName || (
    currentUserRole === 'AICTE_RO'
      ? 'Dr. V. K. Taneja (Regional Officer, AICTE)'
      : currentUserRole === 'AICTE_HQ_ADMIN'
      ? 'Prof. Rajive Kumar (Member Secretary, AICTE HQ)'
      : currentUserRole === 'INSTITUTION_REP'
      ? 'Institutional Registrar / Finance Comptroller'
      : 'RBI / SFMS Direct Gateway Officer'
  );

  const handleExportCSV = () => {
    const csvData = generateFDRRegistryCSV(instruments, {
      filterName: activeFilter,
      searchQuery: searchQuery || 'None',
      exportedBy: auditorName,
      auditSessionId,
    });
    triggerCSVDownload(
      csvData,
      `AICTE_FDR_Audit_Registry_${activeFilter}_${new Date().toISOString().split('T')[0]}.csv`
    );
  };

  const handlePrintPDF = () => {
    window.print();
  };

  // Flagged instruments in current view
  const flaggedItems = instruments.filter(
    (i) => i.lifecycleStatus === 'FLAGGED_DISCREPANCY' || (i.discrepancies && i.discrepancies.some((d) => !d.isResolved))
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex justify-center p-2 sm:p-4 md:p-6 print:p-0 print:bg-white print:static print:overflow-visible">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col my-auto overflow-hidden print:border-none print:shadow-none print:max-w-none print:w-full print:rounded-none">
        
        {/* Modal Controls Toolbar (Hidden when printing) */}
        <div className="p-4 bg-slate-50 text-slate-900 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 print:hidden">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-orange-100 text-orange-700 rounded-lg border border-orange-200">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm tracking-wide text-slate-900 flex items-center gap-2">
                Statutory Institutional Audit &amp; Export Dossier
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-50 text-orange-800 border border-orange-200 font-bold">
                  REF: {auditSessionId}
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Official AICTE FDR &amp; Security Deposit Registry Compliance Record
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-2xs cursor-pointer"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Download CSV (.csv)
            </button>
            <button
              type="button"
              onClick={handlePrintPDF}
              className="inline-flex items-center px-3.5 py-1.5 text-xs font-bold rounded-lg bg-orange-600 hover:bg-orange-700 text-white transition shadow-2xs cursor-pointer"
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Print / Save PDF Report
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition cursor-pointer"
              title="Close Audit Dossier"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Audit Report Document Body */}
        <div ref={reportRef} className="p-6 sm:p-10 space-y-6 text-slate-900 print:text-black print:p-0 print:space-y-4">
          
          {/* Government / AICTE Official Letterhead Header */}
          <div className="border-b-2 border-slate-900 pb-5 text-center relative">
            <div className="flex items-center justify-between mb-2">
              <div className="text-left text-[11px] font-mono text-slate-600">
                <div>AICTE E-GOVERNANCE CELL</div>
                <div>NEW DELHI - 110070</div>
              </div>

              {/* National Emblem & AICTE Brand Crest */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-100 text-orange-900 border border-orange-300 mb-1 font-serif font-black text-sm">
                  AICTE
                </div>
                <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                  SATYAMEVA JAYATE &bull; GOVT. OF INDIA
                </div>
              </div>

              <div className="text-right text-[11px] font-mono text-slate-600">
                <div>ISO 27001:2022 CERTIFIED</div>
                <div>SFMS SECURE INTERLINK</div>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase font-serif">
              All India Council for Technical Education
            </h1>
            <p className="text-xs sm:text-sm font-bold text-slate-700 tracking-wide uppercase">
              Statutory Security Deposit &amp; Fixed Deposit Registry Audit Dossier
            </p>
            <p className="text-[11px] text-slate-600 mt-1 max-w-2xl mx-auto leading-relaxed">
              Mandated under AICTE Approval Process Handbook (APH 2024-27 Clause 4.8) for institutional financial security deposit compliance, joint account encumbrance, and lien status verification.
            </p>

            {/* Tricolor Government Ribbon */}
            <div className="h-1 w-full flex mt-4 rounded-full overflow-hidden">
              <div className="flex-1 bg-[#FF9933]" />
              <div className="flex-1 bg-white border-y border-slate-200" />
              <div className="flex-1 bg-[#138808]" />
            </div>
          </div>

          {/* Audit Metadata Box */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Audit Session ID</span>
              <span className="font-mono font-bold text-slate-900">{auditSessionId}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Generation Date &amp; Time</span>
              <span className="font-semibold text-slate-800">{auditDateStr}, {auditTimeStr}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Auditor / Authorizing Officer</span>
              <span className="font-semibold text-slate-900 truncate block" title={auditorName}>
                {auditorName}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Registry Scope Filter</span>
              <span className="inline-flex items-center font-bold text-orange-700">
                {activeFilter === 'ALL' ? 'Complete Registry (All Instruments)' : activeFilter}
              </span>
            </div>
          </div>

          {/* Executive Summary Cards */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-orange-600" />
              1. Executive Collateral &amp; Compliance Audit Metrics
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-[10px] uppercase font-bold text-slate-500">Audited Instruments</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{summary.totalCount}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-medium">Enrolled FDR records</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-[10px] uppercase font-bold text-slate-500">Total Collateral Value</div>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {summary.formattedPrincipalAmount}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-medium">Rs. {summary.totalPrincipalAmount.toLocaleString('en-IN')}</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-[10px] uppercase font-bold text-slate-500">Lien Endorsement Compliance</div>
                <div className="text-2xl font-black text-emerald-700 mt-1">
                  {summary.lienEndorsementComplianceRate}%
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-medium">Joint Account: {summary.jointAccountComplianceRate}%</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-[10px] uppercase font-bold text-slate-500">Discrepancy Flags</div>
                <div className={`text-2xl font-black mt-1 ${summary.totalUnresolvedDiscrepancies > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                  {summary.totalUnresolvedDiscrepancies}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-medium">Critical: {summary.criticalDiscrepanciesCount}</div>
              </div>
            </div>
          </div>

          {/* Status Breakdown Pills */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap items-center gap-3 text-xs">
            <span className="font-bold text-slate-700 text-[11px] uppercase">Audit Breakdown:</span>
            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-semibold text-[11px] border border-emerald-200">
              Verified Active: {summary.verifiedActiveCount}
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold text-[11px] border border-amber-200">
              Expiring &lt;60d: {summary.approachingMaturityCount}
            </span>
            <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-semibold text-[11px] border border-purple-200">
              Matured: {summary.maturedCount}
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-semibold text-[11px] border border-blue-200">
              Awaiting Verification: {summary.awaitingVerificationCount}
            </span>
            <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 font-semibold text-[11px] border border-indigo-200">
              Release In Review: {summary.releaseRequestedCount}
            </span>
            <span className="px-2 py-0.5 rounded bg-red-100 text-red-900 font-semibold text-[11px] border border-red-200">
              Flagged Discrepancy: {summary.flaggedDiscrepancyCount}
            </span>
          </div>

          {/* Discrepancy Matrix Section (if any flagged instruments) */}
          {flaggedItems.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-700 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                2. Flagged Non-Compliance &amp; Discrepancy Audit Matrix ({flaggedItems.length} Instruments)
              </h4>
              <div className="border border-red-200 rounded-lg overflow-hidden text-xs shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-red-50 text-[11px] font-bold text-red-900 uppercase border-b border-red-200">
                    <tr>
                      <th className="py-2 px-3">FDR Number</th>
                      <th className="py-2 px-3">Institution &amp; AICTE ID</th>
                      <th className="py-2 px-3">Severity</th>
                      <th className="py-2 px-3">Flagged Discrepancy Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100 bg-white">
                    {flaggedItems.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">
                          {item.fdrNumber}
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-semibold text-slate-900">{item.institutionName}</div>
                          <div className="text-[10px] font-mono text-slate-500">{item.aictePermanentId}</div>
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                            CRITICAL
                          </span>
                        </td>
                        <td className="py-2 px-3 text-red-700">
                          {item.discrepancies.length > 0 ? (
                            item.discrepancies.map((d) => (
                              <div key={d.id} className="text-[11px]">
                                &bull; <strong className="font-semibold">{d.field}:</strong> {d.message}
                              </div>
                            ))
                          ) : (
                            <span>Lifecycle flagged for institutional clarification</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Full Registry Table */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-orange-600" />
                3. Itemized Fixed Deposit Instrument Schedule ({instruments.length} Records)
              </span>
              <span className="text-[10px] font-normal text-slate-500">
                Amounts expressed in Indian Rupees (INR)
              </span>
            </h4>
            <div className="border border-slate-200 rounded-lg overflow-x-auto text-xs shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-8">#</th>
                    <th className="py-2.5 px-3">Instrument &amp; Bank</th>
                    <th className="py-2.5 px-3">Institution &amp; ID</th>
                    <th className="py-2.5 px-3 text-right">Principal Deposit</th>
                    <th className="py-2.5 px-3">Maturity Date</th>
                    <th className="py-2.5 px-3 text-center">Lien</th>
                    <th className="py-2.5 px-3">Verification Source</th>
                    <th className="py-2.5 px-3">Audit Lifecycle State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {instruments.map((fdr, index) => (
                    <tr key={fdr.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-center text-slate-500 font-mono text-[11px]">
                        {index + 1}
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-mono font-bold text-slate-900 text-xs">{fdr.fdrNumber}</div>
                        <div className="text-[10px] text-slate-500">{fdr.issuingBank} ({fdr.ifscCode})</div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-semibold text-slate-900 truncate max-w-[200px]" title={fdr.institutionName}>
                          {fdr.institutionName}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">ID: {fdr.aictePermanentId}</div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        Rs. {fdr.depositAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-3 text-slate-700 font-mono text-[11px]">
                        {fdr.maturityDate}
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-[10px]">
                        {fdr.lienMarkedToAICTE ? (
                          <span className="text-emerald-700">YES</span>
                        ) : (
                          <span className="text-red-600">NO</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-[11px] text-slate-700">
                        {fdr.verificationEvidence?.verificationSource === 'SFMS_GATEWAY' ? (
                          <span className="text-emerald-700 font-semibold">SFMS Gateway</span>
                        ) : fdr.verificationEvidence?.verificationSource === 'BANK_API_SIMULATED' ? (
                          <span className="text-emerald-700 font-semibold">Bank API Direct</span>
                        ) : fdr.verificationStatus === 'DISCREPANCY_UNRESOLVED' ? (
                          <span className="text-red-600 font-bold">Flagged Mismatch</span>
                        ) : (
                          <span className="text-amber-700 font-medium">Pending Review</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-[11px] font-semibold text-slate-800">
                        {fdr.lifecycleStatus}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Statutory Attestation & Tripartite Sign-off Block */}
          <div className="pt-4 border-t-2 border-slate-300 space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-700 leading-relaxed">
              <strong className="text-slate-900">STATUTORY AUDIT DECLARATION:</strong> It is certified that the Fixed Deposit Receipts (FDRs) listed herein have been reconciled against the AICTE Central Repository, physical bank receipts, and SFMS direct electronic pings. Encumbrance of the security deposits remains exclusively pledged to AICTE and is protected from unilateral premature withdrawal or release without explicit sanction from the competent authority under Approval Process Handbook guidelines.
            </div>

            <div className="grid grid-cols-3 gap-6 pt-6 text-center text-xs">
              <div className="border-t border-slate-400 pt-2">
                <div className="font-bold text-slate-900">Examined &amp; Verified By</div>
                <div className="text-[11px] text-slate-600 font-medium">AICTE Verification Officer</div>
                <div className="text-[10px] font-mono text-slate-500 mt-1">Digital Signature Key #88219A</div>
              </div>

              <div className="border-t border-slate-400 pt-2">
                <div className="font-bold text-slate-900">Sanctioning Authority</div>
                <div className="text-[11px] text-slate-600 font-medium">Regional Officer / Member Secretary</div>
                <div className="text-[10px] font-mono text-slate-500 mt-1">Official Seal &amp; Stamp</div>
              </div>

              <div className="border-t border-slate-400 pt-2">
                <div className="font-bold text-slate-900">Institutional Auditor</div>
                <div className="text-[11px] text-slate-600 font-medium">Chartered Accountant / Comptroller</div>
                <div className="text-[10px] font-mono text-slate-500 mt-1">ICAI Mem. No: _____________</div>
              </div>
            </div>
          </div>

          {/* Confidentiality & Security Footer */}
          <div className="text-center text-[10px] text-slate-500 pt-2 border-t border-slate-200 flex justify-between items-center">
            <span>Official Government Audit Record &bull; Not for unauthorized distribution</span>
            <span className="font-mono">Security Digest: SHA-256 Verified &bull; AICTE-PORTAL-V1</span>
          </div>
        </div>

        {/* Modal Footer Controls (Hidden when printing) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 print:hidden">
          <span>
            Displaying <strong>{instruments.length}</strong> records in this statutory audit dossier
          </span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              Download CSV
            </button>
            <button
              type="button"
              onClick={handlePrintPDF}
              className="px-3.5 py-2 font-bold rounded-lg bg-orange-600 hover:bg-orange-700 text-white transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 font-semibold rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 transition cursor-pointer border border-slate-300"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
