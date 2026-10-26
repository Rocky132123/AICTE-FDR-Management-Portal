/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  IndianRupee, FileCheck, Clock, ShieldAlert, 
  ArrowUpRight, CheckCircle2, CalendarClock 
} from 'lucide-react';
import { FDRInstrument } from '../types/fdr';
import { formatINR, isFdrComingDue } from '../logic/validation';

interface MetricsOverviewProps {
  instruments: FDRInstrument[];
  onFilterClick?: (status: string) => void;
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({ instruments, onFilterClick }) => {
  const totalValue = instruments.reduce((sum, item) => sum + item.depositAmount, 0);
  const activeCount = instruments.filter((i) => i.lifecycleStatus === 'VERIFIED_ACTIVE').length;
  const discrepancyCount = instruments.filter((i) => i.lifecycleStatus === 'FLAGGED_DISCREPANCY' || i.discrepancies.some((d) => !d.isResolved)).length;
  const approachingCount = instruments.filter((i) => i.lifecycleStatus === 'APPROACHING_MATURITY').length;
  const maturedCount = instruments.filter((i) => i.lifecycleStatus === 'MATURED').length;
  const releaseReqCount = instruments.filter((i) => i.lifecycleStatus === 'RELEASE_REQUESTED').length;

  // Proactive renewal tracking: FDRs coming due within next 90 days
  const comingDueInstruments = instruments.filter((i) => isFdrComingDue(i, 90));
  const comingDueCount = comingDueInstruments.length;
  const comingDueValue = comingDueInstruments.reduce((sum, item) => sum + item.depositAmount, 0);

  const cards = [
    {
      title: 'Total Deposits',
      value: formatINR(totalValue),
      subtitle: `${instruments.length} Total Instruments`,
      icon: IndianRupee,
      color: 'border-slate-200 bg-white dark:bg-slate-900',
      iconBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
      actionFilter: 'ALL',
    },
    {
      title: 'Verified & Active',
      value: activeCount,
      subtitle: 'Lien locked & confirmed',
      icon: CheckCircle2,
      color: 'border-slate-200 bg-white dark:bg-slate-900',
      iconBg: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
      actionFilter: 'VERIFIED_ACTIVE',
    },
    {
      title: 'Flagged Issues',
      value: discrepancyCount,
      subtitle: 'Requires correction / review',
      icon: ShieldAlert,
      color: discrepancyCount > 0 ? 'border-red-200 bg-red-50/50 dark:bg-red-950/20' : 'border-slate-200 bg-white dark:bg-slate-900',
      iconBg: 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300',
      highlight: discrepancyCount > 0,
      actionFilter: 'FLAGGED_DISCREPANCY',
    },
    {
      title: 'Coming Due',
      value: comingDueCount,
      subtitle: `${formatINR(comingDueValue)} · Maturing in ≤90 days`,
      icon: CalendarClock,
      color: comingDueCount > 0 ? 'border-amber-300 bg-amber-50/70 dark:bg-amber-950/30 ring-1 ring-amber-300/60' : 'border-slate-200 bg-white dark:bg-slate-900',
      iconBg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
      badge: 'Proactive Renewal',
      actionFilter: 'COMING_DUE_90',
    },
    {
      title: 'Expiring / Matured',
      value: `${approachingCount} / ${maturedCount}`,
      subtitle: `${approachingCount} <60d, ${maturedCount} matured`,
      icon: Clock,
      color: approachingCount + maturedCount > 0 ? 'border-orange-200 bg-orange-50/40 dark:bg-orange-950/20' : 'border-slate-200 bg-white dark:bg-slate-900',
      iconBg: 'bg-orange-100 text-orange-700 dark:bg-orange-900/60 dark:text-orange-300',
      actionFilter: 'APPROACHING_MATURITY',
    },
    {
      title: 'Release Requests',
      value: releaseReqCount,
      subtitle: 'Pending RO scrutiny',
      icon: FileCheck,
      color: 'border-slate-200 bg-white dark:bg-slate-900',
      iconBg: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
      actionFilter: 'RELEASE_REQUESTED',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <button
            key={idx}
            type="button"
            onClick={() => onFilterClick && onFilterClick(card.actionFilter)}
            className={`p-3.5 rounded-xl border text-left transition-all hover:shadow-md cursor-pointer flex flex-col justify-between ${card.color}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{card.title}</span>
              <div className={`p-1.5 rounded-lg ${card.iconBg}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <div className="flex items-baseline justify-between">
                <div className={`text-2xl font-bold tracking-tight ${card.highlight ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                  {card.value}
                </div>
                {card.badge && (
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                    {card.badge}
                  </span>
                )}
              </div>
              <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span className="line-clamp-1">{card.subtitle}</span>
                <ArrowUpRight className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
