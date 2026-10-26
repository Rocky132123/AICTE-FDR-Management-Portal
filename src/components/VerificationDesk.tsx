/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2, Clock, RefreshCw, Send, Check } from 'lucide-react';
import { FDRInstrument, UserRole } from '../types/fdr';
import { formatINR } from '../logic/validation';

interface VerificationDeskProps {
  instruments: FDRInstrument[];
  currentUserRole: UserRole;
  onSelectInstrument: (instrument: FDRInstrument) => void;
  onTriggerBankVerification: (fdrId: string) => void;
  onFlagBackToInstitution: (fdrId: string, reason: string) => void;
}

export const VerificationDesk: React.FC<VerificationDeskProps> = ({
  instruments,
  currentUserRole,
  onSelectInstrument,
  onTriggerBankVerification,
  onFlagBackToInstitution,
}) => {
  const [activeFdrActionId, setActiveFdrActionId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Queue: Instruments awaiting verification or flagged with discrepancies
  const queueItems = instruments.filter(
    (i) =>
      i.verificationStatus === 'PENDING_VERIFICATION' ||
      i.verificationStatus === 'DISCREPANCY_UNRESOLVED' ||
      i.lifecycleStatus === 'AWAITING_VERIFICATION' ||
      i.lifecycleStatus === 'FLAGGED_DISCREPANCY'
  );

  const handleRunVerification = (id: string) => {
    setProcessingId(id);
    setTimeout(() => {
      onTriggerBankVerification(id);
      setProcessingId(null);
    }, 700);
  };

  const handleSendFlag = (id: string) => {
    if (!flagReason) return;
    onFlagBackToInstitution(id, flagReason);
    setActiveFdrActionId(null);
    setFlagReason('');
  };

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="bg-linear-to-r from-orange-50 via-amber-50 to-orange-100/60 border border-orange-200/90 p-5 rounded-xl text-slate-900 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start space-x-3 max-w-3xl">
            <span className="p-2 rounded-lg bg-orange-600 text-white shrink-0 mt-0.5 shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">Authorized Bank Verification &amp; Discrepancy Queue</h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Passing OCR and form checks does NOT verify financial authenticity. This desk manages independent verification via simulated RBI SFMS Gateway, Direct Core Banking API connector, or documented physical scrutiny.
              </p>
            </div>
          </div>
          <div className="text-right bg-white px-4 py-2.5 rounded-xl border border-orange-200 shadow-2xs">
            <span className="text-2xl font-black text-orange-600">{queueItems.length}</span>
            <div className="text-[11px] font-semibold text-slate-600">Pending Review Cases</div>
          </div>
        </div>
      </div>

      {queueItems.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <h3 className="font-bold text-slate-900 text-sm">All Submissions Verified</h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            There are currently no instruments pending bank confirmation or blocked by unresolved discrepancy flags.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {queueItems.map((fdr) => {
            const hasCritical = fdr.discrepancies.some((d) => !d.isResolved && d.severity === 'CRITICAL');
            const isProcessing = processingId === fdr.id;

            return (
              <div
                key={fdr.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {fdr.fdrNumber}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                      {fdr.issuingBank}
                    </span>
                    {hasCritical ? (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-900 border border-red-300">
                        Discrepancy Flagged
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        Awaiting Verification
                      </span>
                    )}
                  </div>

                  <div className="text-xs font-semibold text-slate-900">
                    {fdr.institutionName} <span className="text-slate-500 font-mono text-[11px]">(AICTE: {fdr.aictePermanentId})</span>
                  </div>

                  <div className="text-xs text-slate-600 flex flex-wrap items-center gap-4">
                    <span>Principal: <strong className="text-slate-900">{formatINR(fdr.depositAmount)}</strong></span>
                    <span>Maturity: <strong className="text-slate-900">{fdr.maturityDate}</strong></span>
                    <span>Branch: <strong className="text-slate-900">{fdr.bankBranch}</strong></span>
                  </div>

                  {/* Discrepancy highlights */}
                  {fdr.discrepancies.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {fdr.discrepancies.filter((d) => !d.isResolved).map((d) => (
                        <div key={d.id} className="text-[11px] text-red-700 flex items-center gap-1.5 font-medium bg-red-50 p-1.5 rounded border border-red-200">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span>{d.message?.replace(/₹/g, 'Rs. ')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectInstrument(fdr)}
                    className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 cursor-pointer"
                  >
                    View Details
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRunVerification(fdr.id)}
                    disabled={isProcessing}
                    className="px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Pinging Bank API...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Execute SFMS Verification
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveFdrActionId(activeFdrActionId === fdr.id ? null : fdr.id)}
                    className="px-3 py-2 rounded-lg text-xs font-semibold text-red-800 bg-red-50 border border-red-200 cursor-pointer hover:bg-red-100"
                  >
                    Flag to Institution
                  </button>
                </div>

                {/* Drawer to send notice to institution */}
                {activeFdrActionId === fdr.id && (
                  <div className="w-full md:basis-full mt-3 pt-3 border-t border-slate-200 space-y-2">
                    <label className="block text-xs font-semibold text-slate-800">
                      Reason for Clarification / Resubmission Notice to Institution:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Please submit fresh FDR with explicit AICTE lien clause endorsement and rectify Rs. 13.5L amount deficit."
                        value={flagReason}
                        onChange={(e) => setFlagReason(e.target.value)}
                        className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => handleSendFlag(fdr.id)}
                        className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer flex items-center gap-1"
                      >
                        <Send className="w-3 h-3" /> Issue Notice
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
