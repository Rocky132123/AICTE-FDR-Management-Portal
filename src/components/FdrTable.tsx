/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Search, Filter, ShieldCheck, AlertTriangle, Clock, ArrowUpDown, 
  ExternalLink, CheckCircle2, XCircle, FileSpreadsheet, Eye, RefreshCw,
  Download, FileText, Printer
} from 'lucide-react';
import { FDRInstrument, LifecycleStatus, UserRole } from '../types/fdr';
import { formatINR, isFdrComingDue } from '../logic/validation';
import { AuditReportModal } from './AuditReportModal';
import { generateFDRRegistryCSV, triggerCSVDownload } from '../logic/exportReports';

interface FdrTableProps {
  instruments: FDRInstrument[];
  onSelectInstrument: (instrument: FDRInstrument) => void;
  selectedFilter: string;
  onFilterChange: (status: string) => void;
  currentUserRole?: UserRole;
  currentUserName?: string;
  onOpenBatchImport?: () => void;
}

export const FdrTable: React.FC<FdrTableProps> = ({
  instruments,
  onSelectInstrument,
  selectedFilter,
  onFilterChange,
  currentUserRole = 'AICTE_RO',
  currentUserName,
  onOpenBatchImport,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  const handleExportCurrentCSV = () => {
    const csv = generateFDRRegistryCSV(filteredInstruments, {
      filterName: selectedFilter === 'COMING_DUE_90' ? 'Coming Due (90 Days)' : selectedFilter,
      searchQuery: searchQuery || 'None',
      exportedBy: currentUserName || (currentUserRole === 'AICTE_RO' ? 'Dr. V. K. Taneja (Regional Officer)' : 'AICTE Audit Authority'),
    });
    triggerCSVDownload(
      csv,
      `AICTE_FDR_Registry_${selectedFilter}_${new Date().toISOString().split('T')[0]}.csv`
    );
  };

  // Filter pipeline
  const filteredInstruments = instruments.filter((fdr) => {
    // 1. Status Filter
    if (selectedFilter !== 'ALL') {
      if (selectedFilter === 'FLAGGED_DISCREPANCY') {
        if (fdr.lifecycleStatus !== 'FLAGGED_DISCREPANCY' && !fdr.discrepancies.some((d) => !d.isResolved)) {
          return false;
        }
      } else if (selectedFilter === 'COMING_DUE_90') {
        if (!isFdrComingDue(fdr, 90)) {
          return false;
        }
      } else if (fdr.lifecycleStatus !== selectedFilter) {
        return false;
      }
    }

    // 2. Search Query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const match =
        fdr.fdrNumber.toLowerCase().includes(q) ||
        fdr.institutionName.toLowerCase().includes(q) ||
        fdr.aictePermanentId.toLowerCase().includes(q) ||
        fdr.issuingBank.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  const getStatusBadge = (status: LifecycleStatus) => {
    switch (status) {
      case 'VERIFIED_ACTIVE':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Verified Active
          </span>
        );
      case 'FLAGGED_DISCREPANCY':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-300">
            <AlertTriangle className="w-3 h-3 mr-1 text-red-600" /> Discrepancy Flagged
          </span>
        );
      case 'APPROACHING_MATURITY':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <Clock className="w-3 h-3 mr-1 text-amber-600" /> Matures Soon (&lt;60d)
          </span>
        );
      case 'MATURED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
            <Clock className="w-3 h-3 mr-1 text-purple-600" /> Matured (Action Req)
          </span>
        );
      case 'AWAITING_VERIFICATION':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
            <ShieldCheck className="w-3 h-3 mr-1 text-blue-600" /> Awaiting Verification
          </span>
        );
      case 'RELEASE_REQUESTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-300">
            Release In Review
          </span>
        );
      case 'RENEWED_REPLACED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
            <RefreshCw className="w-3 h-3 mr-1 text-slate-600" /> Renewed / Replaced
          </span>
        );
      case 'RELEASED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-900 border border-teal-300">
            Released / Refunded
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
            {status}
          </span>
        );
    }
  };

  const calculateDaysLeft = (maturityDateStr: string) => {
    const diff = Math.ceil((new Date(maturityDateStr).getTime() - new Date('2026-10-24').getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return `${Math.abs(diff)} days overdue`;
    if (diff === 0) return 'Matures today';
    return `${diff} days left`;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Search and Filters Header */}
      <div className="p-4 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search FDR No, Institution Name, AICTE ID, Bank..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs sm:text-sm pl-9 pr-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL', label: 'All Records' },
            { id: 'VERIFIED_ACTIVE', label: 'Verified Active' },
            { id: 'FLAGGED_DISCREPANCY', label: 'Flagged Discrepancies' },
            { id: 'COMING_DUE_90', label: 'Coming Due (90d)' },
            { id: 'APPROACHING_MATURITY', label: 'Expiring <60d' },
            { id: 'MATURED', label: 'Matured' },
            { id: 'RELEASE_REQUESTED', label: 'Release Requests' },
          ].map((flt) => (
            <button
              key={flt.id}
              type="button"
              onClick={() => onFilterChange(flt.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                selectedFilter === flt.id
                  ? 'bg-orange-600 text-white font-bold shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {flt.label}
            </button>
          ))}
        </div>

        {/* Institutional Audit & Export Actions */}
        <div className="flex items-center space-x-2 shrink-0">
          {onOpenBatchImport && (
            <button
              type="button"
              onClick={onOpenBatchImport}
              title="Bulk import FDR records via CSV spreadsheet"
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-50 text-orange-950 border border-orange-300 hover:bg-orange-100 transition cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-orange-600" />
              Batch CSV
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCurrentCSV}
            title="Download current filtered registry view as CSV"
            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100 transition cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
            Export CSV
          </button>

          <button
            type="button"
            onClick={() => setIsAuditModalOpen(true)}
            title="Generate and print official institutional audit PDF dossier"
            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-950 border border-amber-300 hover:bg-amber-100 transition cursor-pointer shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
            Audit Dossier (PDF)
          </button>
        </div>
      </div>

      {/* Table view */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              <th className="py-3 px-4">Instrument Reference</th>
              <th className="py-3 px-4">Institution &amp; AICTE ID</th>
              <th className="py-3 px-4 text-right">Deposit Amount</th>
              <th className="py-3 px-4">Maturity Date</th>
              <th className="py-3 px-4">Verification Evidence</th>
              <th className="py-3 px-4">Lifecycle Status</th>
              <th className="py-3 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
            {filteredInstruments.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500 font-medium">
                  No FDR records found matching the current search query or filter.
                </td>
              </tr>
            ) : (
              filteredInstruments.map((fdr) => {
                return (
                  <tr
                    key={fdr.id}
                    className="hover:bg-orange-50/40 transition cursor-pointer"
                    onClick={() => onSelectInstrument(fdr)}
                  >
                    {/* Instrument Reference */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                        {fdr.fdrNumber}
                        {fdr.renewalInfo && (
                          <span className="text-[9px] bg-slate-100 text-slate-700 px-1 py-0.2 rounded font-sans border border-slate-200">
                            Ren#{fdr.renewalInfo.renewalSequenceNumber}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        {fdr.issuingBank} &bull; {fdr.bankBranch}
                      </div>
                    </td>

                    {/* Institution */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 max-w-[280px] truncate" title={fdr.institutionName}>
                        {fdr.institutionName}
                      </div>
                      <div className="text-[11px] font-mono text-slate-600 font-medium">
                        Permanent ID: {fdr.aictePermanentId}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-bold text-slate-900 text-sm">
                        {formatINR(fdr.depositAmount)}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Rs. {fdr.depositAmount.toLocaleString('en-IN')}
                      </div>
                    </td>

                    {/* Dates */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900">
                        {fdr.maturityDate}
                      </div>
                      <div className={`text-[10px] font-semibold ${
                        calculateDaysLeft(fdr.maturityDate).includes('overdue') 
                          ? 'text-red-700 font-bold' 
                          : calculateDaysLeft(fdr.maturityDate).includes('days left') && parseInt(calculateDaysLeft(fdr.maturityDate)) < 60
                          ? 'text-amber-700 font-bold'
                          : 'text-slate-500'
                      }`}>
                        {calculateDaysLeft(fdr.maturityDate)}
                      </div>
                    </td>

                    {/* Verification Source */}
                    <td className="py-3.5 px-4">
                      {fdr.verificationStatus === 'BANK_CONFIRMED' && (
                        <span className="inline-flex items-center text-[11px] text-emerald-800 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          {fdr.verificationEvidence?.verificationSource === 'SFMS_GATEWAY' ? 'SFMS Gateway' : 'Bank API'}
                        </span>
                      )}
                      {fdr.verificationStatus === 'PENDING_VERIFICATION' && (
                        <span className="inline-flex items-center text-[11px] text-amber-800 font-semibold">
                          <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" /> Pending Bank Ping
                        </span>
                      )}
                      {fdr.verificationStatus === 'DISCREPANCY_UNRESOLVED' && (
                        <span className="inline-flex items-center text-[11px] text-red-800 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 mr-1 text-red-600" />
                          {fdr.discrepancies.length} Flagged Item(s)
                        </span>
                      )}
                      {fdr.verificationStatus === 'MANUALLY_VERIFIED' && (
                        <span className="inline-flex items-center text-[11px] text-blue-800 font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5 mr-1 text-blue-600" /> Manual RO Audit
                        </span>
                      )}
                    </td>

                    {/* Status Pill */}
                    <td className="py-3.5 px-4">
                      {getStatusBadge(fdr.lifecycleStatus)}
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectInstrument(fdr);
                        }}
                        className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-orange-100 hover:text-orange-950 border border-slate-200 transition cursor-pointer"
                      >
                        <Eye className="w-3 h-3 mr-1 text-slate-600" /> Inspect
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-3">
          <span>Showing <strong className="text-slate-900">{filteredInstruments.length}</strong> of {instruments.length} total AICTE security deposit instruments</span>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={handleExportCurrentCSV}
            className="text-emerald-700 hover:underline font-bold flex items-center cursor-pointer"
          >
            <Download className="w-3 h-3 mr-1" /> Quick CSV
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={() => setIsAuditModalOpen(true)}
            className="text-amber-800 hover:underline font-bold flex items-center cursor-pointer"
          >
            <Printer className="w-3 h-3 mr-1" /> Audit Dossier
          </button>
        </div>
        <span className="font-mono text-slate-500 font-medium">Reference Date: 2026-10-24 (AICTE Audit System)</span>
      </div>

      {/* Institutional Audit Dossier Modal */}
      <AuditReportModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        instruments={filteredInstruments}
        activeFilter={selectedFilter}
        searchQuery={searchQuery}
        currentUserRole={currentUserRole}
        currentUserName={currentUserName}
      />
    </div>
  );
};
