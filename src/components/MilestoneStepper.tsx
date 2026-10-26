/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * AICTE 5-Milestone Lifecycle Stepper Component
 * Faithfully matches the exact UI design from user's reference image
 */

import React from 'react';
import { Check, IndianRupee, Award, ArrowRight, Sparkles, ShieldCheck, RefreshCw, Clock } from 'lucide-react';

interface MilestoneStepperProps {
  currentMilestone?: number;
  onSelectMilestone: (milestoneIndex: number) => void;
  onStartSubmission: () => void;
}

export const MilestoneStepper: React.FC<MilestoneStepperProps> = ({
  currentMilestone = 3,
  onSelectMilestone,
  onStartSubmission,
}) => {
  const milestones = [
    {
      id: 1,
      number: '01',
      tag: '~4 min',
      tagColor: 'bg-amber-50 text-amber-700 border-amber-200',
      activeBorder: 'border-orange-400 ring-2 ring-orange-400/20 shadow-md',
      title: 'Make your submission once',
      description:
        'Super-light submission, institution auto-filled from AICTE/AISHE database, upload original FDR scan. No paperwork pain.',
      nodeColor: 'bg-orange-500 text-white',
      nodeLabel: 'SUBMIT FDR',
      icon: Check,
      tabTarget: 'submit',
    },
    {
      id: 2,
      number: '02',
      tag: 'Instant',
      tagColor: 'bg-purple-50 text-purple-700 border-purple-200',
      activeBorder: 'border-purple-400 ring-2 ring-purple-400/20 shadow-md',
      title: 'Let the Neural OCR dig',
      description:
        'Every document scanned for bank, amount, maturity date & lien endorsement. Instant field extraction and discrepancy scoring.',
      nodeColor: 'bg-purple-600 text-white',
      nodeLabel: 'OCR CHECK',
      icon: Check,
      tabTarget: 'submit',
    },
    {
      id: 3,
      number: '03',
      tag: '1 tap',
      tagColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      activeBorder: 'border-cyan-500 ring-4 ring-cyan-500/20 shadow-lg scale-[1.02]',
      title: 'One tap, SFMS & bank confirmation',
      description:
        'Direct confirmation via RBI SFMS gateway or authorized branch desk. Distinguishes declared claims from verified bank facts.',
      nodeColor: 'bg-cyan-500 text-white ring-4 ring-cyan-400/30',
      nodeLabel: 'BANK VERIFY',
      icon: Check,
      tabTarget: 'verification',
    },
    {
      id: 4,
      number: '04',
      tag: '60-day auto',
      tagColor: 'bg-slate-100 text-slate-600 border-slate-200',
      activeBorder: 'border-slate-300 hover:border-slate-400',
      title: 'Monitored, then renewed',
      description:
        'Automated countdown alerts at 60 and 30 days. Replacement instruments seamlessly linked to preserve full lineage history.',
      nodeColor: 'bg-slate-200 text-slate-600',
      nodeLabel: 'RENEWAL ALERT',
      icon: Clock,
      tabTarget: 'lifecycle',
    },
    {
      id: 5,
      number: '05',
      tag: 'Audited',
      tagColor: 'bg-slate-100 text-slate-600 border-slate-200',
      activeBorder: 'border-slate-300 hover:border-slate-400',
      title: 'Walk away with discharge',
      description:
        'Dual-tier statutory scrutiny by Regional Officer and HQ Director. Official lien discharge and refund sanction certificate.',
      nodeColor: 'bg-slate-200 text-slate-600',
      nodeLabel: 'RELEASE / REFUND',
      icon: Award,
      tabTarget: 'lifecycle',
    },
  ];

  return (
    <section className="relative pt-4 pb-8 overflow-hidden bg-linear-to-b from-white via-orange-50/25 to-pink-50/20 rounded-2xl border border-slate-200/80 shadow-xs mb-8">
      {/* Background Soft Glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-pink-200/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Five milestones, end to end &mdash; official AICTE depository pipeline
          </p>

          {/* Progress Tracker Pill */}
          <div className="mt-3 inline-flex items-center space-x-3 bg-white px-4 py-1.5 rounded-full border border-slate-200 shadow-xs">
            <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center">
              {currentMilestone}
            </span>
            <span className="text-xs font-bold text-slate-800">
              Milestone {currentMilestone} of 5
            </span>
            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-linear-to-r from-orange-500 via-pink-500 to-cyan-500 transition-all duration-500"
                style={{ width: `${(currentMilestone / 5) * 100}%` }}
              />
            </div>
            <span className="text-xs font-bold text-slate-600">
              {Math.round((currentMilestone / 5) * 100)}%
            </span>
          </div>
        </div>

        {/* 5 Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {milestones.map((item, idx) => {
            const isCurrent = item.id === currentMilestone;
            const isCompleted = item.id < currentMilestone;
            return (
              <div
                key={item.id}
                onClick={() => onSelectMilestone(idx + 1)}
                className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer flex flex-col justify-between ${
                  isCurrent
                    ? 'border-cyan-500 ring-2 ring-cyan-500/20 shadow-lg'
                    : isCompleted
                    ? 'border-slate-200 shadow-xs hover:border-slate-300'
                    : 'border-slate-200/70 shadow-xs opacity-75 hover:opacity-100'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-xl font-extrabold ${
                        item.id === 1
                          ? 'text-orange-500'
                          : item.id === 2
                          ? 'text-purple-600'
                          : item.id === 3
                          ? 'text-cyan-600'
                          : 'text-slate-400'
                      }`}
                    >
                      {item.number}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.tagColor}`}
                    >
                      {item.tag}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Stage {item.id}
                  </span>
                  {isCompleted && (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Done
                    </span>
                  )}
                  {isCurrent && (
                    <span className="text-[11px] font-bold text-cyan-600 flex items-center gap-1">
                      Active
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Timeline Connector Line & Circular Nodes */}
        <div className="hidden lg:block relative mt-8 mb-6">
          <div className="absolute top-1/2 left-8 right-8 -translate-y-1/2 h-1 bg-slate-200 z-0">
            <div
              className="h-full bg-linear-to-r from-orange-500 via-purple-600 to-cyan-500 transition-all duration-700"
              style={{ width: '55%' }}
            />
          </div>

          <div className="relative z-10 flex justify-between px-6">
            {milestones.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => onSelectMilestone(item.id)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold shadow-sm transition-transform cursor-pointer ${item.nodeColor}`}
                    aria-label={`Jump to stage ${item.id}`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                  <span className="mt-2 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    {item.nodeLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Primary CTA Button */}
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={onStartSubmission}
            className="inline-flex items-center px-8 py-3.5 rounded-full text-sm font-bold text-white bg-linear-to-r from-orange-500 via-pink-500 to-rose-500 hover:opacity-95 transition-all shadow-lg hover:shadow-orange-500/25 cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
          >
            Start milestone one &mdash; It&apos;s free &amp; direct
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>
    </section>
  );
};
