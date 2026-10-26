/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { History, Search, Shield, Filter, Download, CheckCircle2 } from 'lucide-react';
import { AuditLogEntry } from '../types/fdr';

interface AuditTrailViewProps {
  logs: AuditLogEntry[];
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ logs }) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const filteredLogs = logs.filter((log) => {
    if (roleFilter !== 'ALL' && log.actorRole !== roleFilter) return false;
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      return (
        log.actorName.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.entityId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="bg-linear-to-r from-orange-50 via-amber-50 to-orange-100/60 border border-orange-200/90 p-5 rounded-xl text-slate-900 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-start space-x-3 max-w-3xl">
          <span className="p-2 rounded-lg bg-orange-600 text-white shrink-0 mt-0.5 shadow-2xs">
            <Shield className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900">Immutable AICTE Audit Trail &amp; Governance Ledger</h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Every submission, OCR extraction, discrepancy detection, verification result, and administrative approval is cryptographically logged with actor identity, timestamp, and network origin.
            </p>
          </div>
        </div>
        <div className="text-right bg-white px-4 py-2.5 rounded-xl border border-orange-200 shadow-2xs">
          <span className="text-2xl font-black text-orange-600 font-mono">{logs.length}</span>
          <div className="text-[11px] font-semibold text-slate-600">Total Tamper-Evident Entries</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search logs by actor, action, instrument ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs sm:text-sm pl-9 pr-4 py-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-700">Role Filter:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium"
          >
            <option value="ALL">All Roles</option>
            <option value="AICTE_RO">AICTE Regional Officer</option>
            <option value="AICTE_HQ_ADMIN">HQ Administrator</option>
            <option value="INSTITUTION_REP">Institution Rep</option>
            <option value="BANK_AUDITOR">Bank Auditor / System</option>
          </select>
        </div>
      </div>

      {/* Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase border-b border-slate-200">
                <th className="p-3.5">Timestamp (UTC)</th>
                <th className="p-3.5">Actor &amp; Role</th>
                <th className="p-3.5">Action Executed</th>
                <th className="p-3.5">Entity Target</th>
                <th className="p-3.5">Event Details</th>
                <th className="p-3.5 font-mono">SHA-256 Checksum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-mono text-[11px]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="p-3.5 whitespace-nowrap text-slate-600">
                    {new Date(log.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </td>
                  <td className="p-3.5 font-sans">
                    <div className="font-semibold text-slate-900">{log.actorName}</div>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                      {log.actorRole}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-orange-100 text-orange-900 border border-orange-200">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3.5 font-sans">
                    <span className="font-mono font-semibold text-slate-900">{log.entityId}</span>
                  </td>
                  <td className="p-3.5 font-sans text-slate-700 max-w-sm">
                    {log.details}
                  </td>
                  <td className="p-3.5 text-slate-400 text-[10px] truncate max-w-[120px]" title={log.hash}>
                    {log.hash.substring(0, 16)}...
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
