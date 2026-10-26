/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * AICTE Security Deposit & FDR Management Portal
 * Statutory Compliance Checklist & Holistic Scoring Component
 */

import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, AlertTriangle, CheckCircle2, Clock, 
  FileText, Building2, Scale, Users, Landmark, 
  ChevronDown, ChevronUp, ExternalLink, RefreshCw,
  Info, Check, X, AlertCircle, Award
} from 'lucide-react';
import { Institution, FDRInstrument, UserRole } from '../types/fdr';
import { 
  ComplianceItem, 
  ComplianceStatus,
  buildInstitutionComplianceProfile, 
  calculateComplianceScore 
} from '../logic/complianceLogic';

interface ComplianceChecklistProps {
  institutions: Institution[];
  instruments: FDRInstrument[];
  currentUserRole?: UserRole;
  onNoticeTrigger?: (institutionName: string, itemTitle: string) => void;
}

export const ComplianceChecklist: React.FC<ComplianceChecklistProps> = ({
  institutions,
  instruments,
  currentUserRole = 'AICTE_RO',
  onNoticeTrigger,
}) => {
  const [selectedInstId, setSelectedInstId] = useState<string>(institutions[0]?.id || '');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  
  // Local state for institution compliance profiles so officers can interactively verify filings
  const [profiles, setProfiles] = useState<Record<string, ComplianceItem[]>>(() => {
    const initialMap: Record<string, ComplianceItem[]> = {};
    institutions.forEach((inst) => {
      const prof = buildInstitutionComplianceProfile(inst, instruments);
      initialMap[inst.id] = prof.items;
    });
    return initialMap;
  });

  const selectedInstitution = institutions.find((i) => i.id === selectedInstId) || institutions[0];
  const currentItems = profiles[selectedInstId] || buildInstitutionComplianceProfile(selectedInstitution, instruments).items;
  
  const scoreResult = useMemo(() => {
    return calculateComplianceScore(currentItems);
  }, [currentItems]);

  // Aggregate stats across all institutions
  const overallStats = useMemo(() => {
    let totalScore = 0;
    let compliantInsts = 0;
    let actionReqInsts = 0;

    institutions.forEach((inst) => {
      const items = profiles[inst.id] || buildInstitutionComplianceProfile(inst, instruments).items;
      const res = calculateComplianceScore(items);
      totalScore += res.score;
      if (res.grade === 'A') compliantInsts++;
      else if (res.grade === 'C') actionReqInsts++;
    });

    const avg = institutions.length > 0 ? Math.round(totalScore / institutions.length) : 0;
    return {
      averageScore: avg,
      fullyCompliantCount: compliantInsts,
      actionRequiredCount: actionReqInsts,
      totalInstitutions: institutions.length,
    };
  }, [institutions, profiles, instruments]);

  const handleStatusChange = (itemId: string, newStatus: ComplianceStatus) => {
    setProfiles((prev) => {
      const existing = prev[selectedInstId] || [];
      const updated = existing.map((item) => {
        if (item.id !== itemId) return item;
        let remarks = item.remarks;
        if (newStatus === 'COMPLIANT') {
          remarks = `Verified compliant by ${currentUserRole} on ${new Date().toISOString().split('T')[0]}.`;
        } else if (newStatus === 'DEFICIENT') {
          remarks = `Deficiency flagged by ${currentUserRole}; official rectification required.`;
        }
        return {
          ...item,
          status: newStatus,
          lastUpdated: new Date().toISOString().split('T')[0],
          remarks,
        };
      });
      return {
        ...prev,
        [selectedInstId]: updated,
      };
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'INFRASTRUCTURE':
        return <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'LEGAL':
        return <Scale className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'FACULTY_FINANCE':
        return <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case 'REGULATORY_DEPOSIT':
        return <Landmark className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      default:
        return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusBadge = (status: ComplianceStatus) => {
    switch (status) {
      case 'COMPLIANT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Compliant
          </span>
        );
      case 'PENDING_REVIEW':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <Clock className="w-3 h-3 mr-1" /> Under Scrutiny
          </span>
        );
      case 'DEFICIENT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border border-red-300 dark:border-red-800">
            <AlertTriangle className="w-3 h-3 mr-1" /> Action Required
          </span>
        );
      case 'EXEMPT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            Exempt
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
      {/* Top Banner Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-linear-to-r from-slate-50 via-orange-50/20 to-slate-50 dark:from-slate-950/60 dark:via-slate-900 dark:to-slate-950/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold shadow-xs">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Institutional Statutory Compliance Checklist
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-300 uppercase tracking-wider">
                APH Mandate
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tracks mandatory statutory filings (Land/Building, Court Affidavits, 7th CPC Salary, FDR Liens) for holistic compliance scoring.
            </p>
          </div>
        </div>

        {/* Institution Selector & Expand Toggle */}
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center space-x-2">
            <label htmlFor="inst-compliance-select" className="text-xs font-semibold text-slate-600 dark:text-slate-300 hidden sm:inline">
              Institution:
            </label>
            <select
              id="inst-compliance-select"
              value={selectedInstId}
              onChange={(e) => setSelectedInstId(e.target.value)}
              className="text-xs font-semibold py-1.5 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-hidden cursor-pointer"
            >
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name.length > 38 ? `${inst.name.substring(0, 38)}...` : inst.name} ({inst.aictePermanentId})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label={isExpanded ? 'Collapse compliance checklist' : 'Expand compliance checklist'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {isExpanded && (
        <div className="p-4 sm:p-6 space-y-6">
          {/* Holistic Score Banner Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            {/* Score & Rating */}
            <div className="flex items-center space-x-4 md:border-r md:border-slate-200 dark:md:border-slate-700 pr-4">
              <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-bold border-2 shadow-xs ${
                scoreResult.grade === 'A'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                  : scoreResult.grade === 'B'
                  ? 'bg-amber-50 border-amber-500 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                  : 'bg-red-50 border-red-500 text-red-800 dark:bg-red-950/80 dark:text-red-300'
              }`}>
                <span className="text-xl leading-none">{scoreResult.score}%</span>
                <span className="text-[10px] uppercase tracking-wider font-extrabold mt-0.5">Grade {scoreResult.grade}</span>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Holistic Rating</p>
                <p className={`text-sm font-bold ${
                  scoreResult.grade === 'A' ? 'text-emerald-700 dark:text-emerald-400' :
                  scoreResult.grade === 'B' ? 'text-amber-700 dark:text-amber-400' : 'text-red-700 dark:text-red-400'
                }`}>
                  {scoreResult.statusText}
                </p>
                <p className="text-[11px] text-slate-500">
                  {scoreResult.compliantCount} of {scoreResult.totalMandatoryCount} mandatory filings verified
                </p>
              </div>
            </div>

            {/* Score Progress Visualizer */}
            <div className="space-y-1.5 flex flex-col justify-center md:border-r md:border-slate-200 dark:md:border-slate-700 pr-4">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-600 dark:text-slate-300">APH Compliance Index</span>
                <span className="font-mono text-slate-900 dark:text-white">{scoreResult.passedWeight} / {scoreResult.totalWeight} pts</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    scoreResult.grade === 'A'
                      ? 'bg-emerald-500'
                      : scoreResult.grade === 'B'
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${scoreResult.score}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400">
                Minimum 85% required for unconditional AICTE approval clearance
              </p>
            </div>

            {/* Current Institution Info */}
            <div className="flex flex-col justify-center md:border-r md:border-slate-200 dark:md:border-slate-700 pr-4">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Inspected Entity</p>
              <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                {selectedInstitution.name}
              </p>
              <p className="text-[11px] text-slate-500 font-mono">
                AICTE ID: {selectedInstitution.aictePermanentId} &bull; {selectedInstitution.region} Region
              </p>
            </div>

            {/* National Registry Benchmark */}
            <div className="flex flex-col justify-center">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">National Depository Avg</p>
              <div className="flex items-baseline space-x-2">
                <span className="text-lg font-bold text-slate-900 dark:text-white">{overallStats.averageScore}%</span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  ({overallStats.fullyCompliantCount}/{overallStats.totalInstitutions} Grade A)
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                {overallStats.actionRequiredCount} institution(s) require statutory intervention
              </p>
            </div>
          </div>

          {/* Checklist Filings List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Mandatory Statutory Filings &amp; Verification Matrix
              </h4>
              <span className="text-[11px] text-slate-500">
                Weightings correspond to AICTE statutory inspection criteria
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              {currentItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 sm:p-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  {/* Left: Info */}
                  <div className="flex items-start space-x-3 max-w-2xl">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                      {getCategoryIcon(item.category)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          {item.title}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {item.weight} pts
                        </span>
                        {getStatusBadge(item.status)}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {item.description}
                      </p>
                      {item.remarks && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center font-medium">
                          <Info className="w-3 h-3 mr-1 text-slate-400 shrink-0" />
                          {item.remarks}
                          {item.referenceDocNumber && (
                            <span className="ml-2 font-mono text-[10px] text-slate-400">
                              (Ref: {item.referenceDocNumber})
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Quick Action Controls for Officer */}
                  <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                    <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => handleStatusChange(item.id, 'COMPLIANT')}
                        title="Mark as Verified Compliant"
                        className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer flex items-center ${
                          item.status === 'COMPLIANT'
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'text-slate-600 dark:text-slate-300 hover:text-emerald-700'
                        }`}
                      >
                        <Check className="w-3 h-3 mr-1" /> Compliant
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStatusChange(item.id, 'PENDING_REVIEW')}
                        title="Mark as Under Scrutiny / Review"
                        className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer flex items-center ${
                          item.status === 'PENDING_REVIEW'
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'text-slate-600 dark:text-slate-300 hover:text-amber-700'
                        }`}
                      >
                        <Clock className="w-3 h-3 mr-1" /> Scrutiny
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          handleStatusChange(item.id, 'DEFICIENT');
                          if (onNoticeTrigger) {
                            onNoticeTrigger(selectedInstitution.name, item.title);
                          }
                        }}
                        title="Flag Statutory Deficiency"
                        className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer flex items-center ${
                          item.status === 'DEFICIENT'
                            ? 'bg-red-600 text-white font-bold'
                            : 'text-slate-600 dark:text-slate-300 hover:text-red-700'
                        }`}
                      >
                        <X className="w-3 h-3 mr-1" /> Deficient
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
