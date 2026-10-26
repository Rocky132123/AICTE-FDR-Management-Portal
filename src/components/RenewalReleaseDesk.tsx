/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  RefreshCw, Clock, FileCheck, CheckCircle2, AlertTriangle, 
  Send, ChevronRight, FileText, Check 
} from 'lucide-react';
import { FDRInstrument, UserRole } from '../types/fdr';
import { formatINR, evaluateReleaseEligibility } from '../logic/validation';

interface RenewalReleaseDeskProps {
  instruments: FDRInstrument[];
  currentUserRole: UserRole;
  onSelectInstrument: (instrument: FDRInstrument) => void;
  onSubmitRenewal: (originalFdrId: string, newFdrNumber: string, bank: string, amount: number, maturityDate: string, reason: string) => void;
  onSubmitReleaseRequest: (fdrId: string, justification: string) => void;
}

export const RenewalReleaseDesk: React.FC<RenewalReleaseDeskProps> = ({
  instruments,
  currentUserRole,
  onSelectInstrument,
  onSubmitRenewal,
  onSubmitReleaseRequest,
}) => {
  const [activeTab, setActiveTab] = useState<'MATURITY' | 'RELEASE'>('MATURITY');

  // Renewal Form Modal state
  const [renewalTargetFdr, setRenewalTargetFdr] = useState<FDRInstrument | null>(null);
  const [newFdrNumber, setNewFdrNumber] = useState('');
  const [newBank, setNewBank] = useState('');
  const [newAmount, setNewAmount] = useState<number>(0);
  const [newMaturityDate, setNewMaturityDate] = useState('2034-10-24');
  const [renewalReason, setRenewalReason] = useState('Mandatory renewal upon tenure expiration per AICTE regulation.');

  // Release Request Form Modal state
  const [releaseTargetFdr, setReleaseTargetFdr] = useState<FDRInstrument | null>(null);
  const [releaseJustification, setReleaseJustification] = useState('');
  const [complianceChecked, setComplianceChecked] = useState(false);

  // Filter instruments approaching maturity or matured
  const maturityWatchlist = instruments.filter(
    (i) => i.lifecycleStatus === 'APPROACHING_MATURITY' || i.lifecycleStatus === 'MATURED'
  );

  // Filter release requests
  const releaseWatchlist = instruments.filter(
    (i) => i.releaseRequest !== undefined || i.lifecycleStatus === 'RELEASE_REQUESTED' || i.lifecycleStatus === 'RELEASED'
  );

  const openRenewalModal = (fdr: FDRInstrument) => {
    setRenewalTargetFdr(fdr);
    setNewFdrNumber(`${fdr.issuingBank.substring(0, 3).toUpperCase()}-RNW-${Date.now().toString().slice(-5)}`);
    setNewBank(fdr.issuingBank);
    setNewAmount(fdr.depositAmount);
  };

  const handleConfirmRenewal = () => {
    if (!renewalTargetFdr || !newFdrNumber) return;
    onSubmitRenewal(renewalTargetFdr.id, newFdrNumber, newBank, newAmount, newMaturityDate, renewalReason);
    setRenewalTargetFdr(null);
  };

  const openReleaseModal = (fdr: FDRInstrument) => {
    setReleaseTargetFdr(fdr);
    setReleaseJustification('Completed mandatory approval tenure and met all permanent campus infrastructure benchmarks without deficit.');
    setComplianceChecked(true);
  };

  const handleConfirmRelease = () => {
    if (!releaseTargetFdr || !releaseJustification) return;
    onSubmitReleaseRequest(releaseTargetFdr.id, releaseJustification);
    setReleaseTargetFdr(null);
  };

  return (
    <div className="space-y-6">
      {/* Desk Switcher Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('MATURITY')}
          className={`pb-3 flex items-center space-x-2 border-b-2 cursor-pointer ${
            activeTab === 'MATURITY'
              ? 'border-orange-500 text-orange-600 font-bold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Maturity Monitoring &amp; Renewal Replacement ({maturityWatchlist.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('RELEASE')}
          className={`pb-3 flex items-center space-x-2 border-b-2 cursor-pointer ${
            activeTab === 'RELEASE'
              ? 'border-indigo-600 text-indigo-700 font-bold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Security Deposit Release &amp; Refund Applications ({releaseWatchlist.length})</span>
        </button>
      </div>

      {/* TAB 1: MATURITY MONITORING & RENEWALS */}
      {activeTab === 'MATURITY' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs text-amber-950">
            <strong>AICTE Validity &amp; Renewal Protocol:</strong> When an FDR reaches maturity or enters the 60-day window, institutions must either submit an approved renewal instrument or apply for authorized release under Regulation 14. Replacement instruments preserve the full lineage chain back to original establishment.
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase border-b border-slate-200">
                  <th className="p-3.5">FDR Reference</th>
                  <th className="p-3.5">Institution</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">Maturity Date</th>
                  <th className="p-3.5">Automated Alert Status</th>
                  <th className="p-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {maturityWatchlist.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No instruments currently approaching maturity or overdue.
                    </td>
                  </tr>
                ) : (
                  maturityWatchlist.map((fdr) => (
                    <tr key={fdr.id} className="hover:bg-slate-50">
                      <td className="p-3.5 font-mono font-bold text-slate-900">
                        {fdr.fdrNumber}
                        <div className="text-[11px] font-normal text-slate-600">{fdr.issuingBank}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-900">{fdr.institutionName}</div>
                        <div className="text-[11px] text-slate-500">Permanent ID: {fdr.aictePermanentId}</div>
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">
                        {formatINR(fdr.depositAmount)}
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-red-600">{fdr.maturityDate}</div>
                        <span className="text-[10px] text-slate-500">
                          {fdr.lifecycleStatus === 'MATURED' ? 'Overdue for renewal' : 'Expiring soon (<60d)'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          60d &amp; 30d Email Alerts Dispatched
                        </span>
                      </td>
                      <td className="p-3.5 text-center space-x-2">
                        <button
                          type="button"
                          onClick={() => openRenewalModal(fdr)}
                          className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                        >
                          <RefreshCw className="w-3 h-3" /> Submit Renewal
                        </button>
                        <button
                          type="button"
                          onClick={() => openReleaseModal(fdr)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-semibold text-xs cursor-pointer inline-flex items-center"
                        >
                          Request Release
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: RELEASE APPLICATIONS */}
      {activeTab === 'RELEASE' && (
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl text-xs text-indigo-950">
            <strong>Release &amp; Lien Discharge Governance:</strong> Fixed deposit refunds are strictly governed by AICTE regulations. Release requests undergo two-tier scrutiny: (1) Regional Officer site and dues verification, and (2) AICTE HQ Member Secretary / Director financial sanction.
          </div>

          <div className="grid grid-cols-1 gap-4">
            {releaseWatchlist.map((fdr) => (
              <div
                key={fdr.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">
                      {fdr.fdrNumber}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-600 text-white">
                      {fdr.releaseRequest?.status || fdr.lifecycleStatus}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-900 mt-1">
                    {fdr.institutionName} &bull; {formatINR(fdr.depositAmount)}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    Application Reason: {fdr.releaseRequest?.reason || 'Tenure Completed (10 Years)'}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5 italic">
                    &ldquo;{fdr.releaseRequest?.justification}&rdquo;
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectInstrument(fdr)}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer shadow-2xs flex items-center gap-1.5"
                  >
                    Open Official Scrutiny Desk
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RENEWAL MODAL */}
      {renewalTargetFdr && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-orange-600" />
              Submit Replacement / Renewal FDR
            </h3>
            <p className="text-xs text-slate-600">
              This replaces maturing FDR <strong className="font-mono text-slate-900">{renewalTargetFdr.fdrNumber}</strong> and creates an immutable lineage link.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">New FDR Number *</label>
                <input
                  type="text"
                  value={newFdrNumber}
                  onChange={(e) => setNewFdrNumber(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">Issuing Bank</label>
                <input
                  type="text"
                  value={newBank}
                  onChange={(e) => setNewBank(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">Renewed Amount (INR) *</label>
                <input
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(Number(e.target.value))}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">Extended Maturity Date *</label>
                <input
                  type="date"
                  value={newMaturityDate}
                  onChange={(e) => setNewMaturityDate(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">Renewal Justification</label>
                <textarea
                  rows={2}
                  value={renewalReason}
                  onChange={(e) => setRenewalReason(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setRenewalTargetFdr(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRenewal}
                className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition cursor-pointer shadow-2xs"
              >
                Confirm &amp; Link Renewal Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RELEASE REQUEST MODAL */}
      {releaseTargetFdr && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-indigo-600" />
              Initiate Security Deposit Release Request
            </h3>
            <p className="text-xs text-slate-600">
              Applying for refund / lien discharge for instrument <strong className="font-mono text-slate-900">{releaseTargetFdr.fdrNumber}</strong> ({formatINR(releaseTargetFdr.depositAmount)}).
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">Institution Request Justification *</label>
                <textarea
                  rows={3}
                  value={releaseJustification}
                  onChange={(e) => setReleaseJustification(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white text-slate-900"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={complianceChecked}
                    onChange={(e) => setComplianceChecked(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span>
                    We certify that all mandatory AICTE compliance norms have been fulfilled and no inquiries are pending.
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setReleaseTargetFdr(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold cursor-pointer border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRelease}
                disabled={!complianceChecked}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50 shadow-2xs"
              >
                Submit Release Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
