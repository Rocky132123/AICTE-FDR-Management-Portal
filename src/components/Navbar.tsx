/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * AICTE Official Portal Navbar & Live Updates Ribbon
 * Faithful implementation of user's reference UI (internship.aicte-india.org design)
 */

import React, { useState } from 'react';
import { 
  Building2, UserCircle, RefreshCw, FileText, CheckCircle2, 
  History, AlertTriangle, PhoneCall, Globe, ChevronDown, 
  ExternalLink, Sparkles, ShieldCheck, HelpCircle, LogIn, Plus
} from 'lucide-react';
import { UserRole } from '../types/fdr';

interface NavbarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  discrepancyCount: number;
  pendingVerificationCount: number;
  pendingReleaseCount: number;
  onOpenSubmit: () => void;
  firebaseUser?: { displayName?: string | null; email?: string | null; photoURL?: string | null } | null;
  onGoogleLogin?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  activeTab,
  onTabChange,
  discrepancyCount,
  pendingVerificationCount,
  pendingReleaseCount,
  onOpenSubmit,
  firebaseUser,
  onGoogleLogin,
  onLogout,
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const roleLabels: Record<UserRole, { title: string; subtitle: string; badge: string }> = {
    AICTE_RO: {
      title: 'Dr. V. K. Taneja',
      subtitle: 'Regional Officer (Northern Region)',
      badge: 'AICTE RO',
    },
    AICTE_HQ_ADMIN: {
      title: 'Prof. Rajive Kumar',
      subtitle: 'Member Secretary & HQ Director',
      badge: 'HQ Director',
    },
    INSTITUTION_REP: {
      title: 'Dr. R. K. Sharma',
      subtitle: 'Registrar (Delhi Inst of Tech)',
      badge: 'Institution Rep',
    },
    BANK_AUDITOR: {
      title: 'SFMS Direct Agent',
      subtitle: 'Authorized Bank Verification Officer',
      badge: 'Bank Auditor',
    },
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* 1. Indian National Flag Tricolor Bar */}
      <div className="h-1 w-full flex">
        <div className="h-full w-1/3 bg-[#FF9933]" />
        <div className="h-full w-1/3 bg-white" />
        <div className="h-full w-1/3 bg-[#138808]" />
      </div>

      {/* 2. Top Ministry of Education Utility Ribbon */}
      <div className="bg-slate-50/80 border-b border-slate-200/70 text-slate-700 text-xs py-1.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-2">
          {/* Left: Government of India label */}
          <div className="flex items-center space-x-2 font-medium text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
            <span className="text-[11px] sm:text-xs font-semibold tracking-wide text-slate-800">
              Government of India &bull; Ministry of Education &bull; Depository Portal
            </span>
          </div>

          {/* Right: Utility badges */}
          <div className="flex items-center space-x-2.5 text-[11px]">
            <a
              href="#notices"
              onClick={(e) => {
                e.preventDefault();
                alert('AICTE Notice: All institutions must maintain active FDR liens under Regulation 14.');
              }}
              className="px-2.5 py-0.5 rounded-full border border-rose-300 bg-rose-50/60 text-rose-700 font-medium hover:bg-rose-100 flex items-center gap-1 transition"
            >
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              <span>Important Note</span>
            </a>

            <div className="relative group">
              <button
                type="button"
                className="px-2.5 py-0.5 rounded-full border border-rose-300 bg-rose-50/60 text-rose-700 font-medium hover:bg-rose-100 flex items-center gap-1 transition cursor-pointer"
              >
                <PhoneCall className="w-3 h-3 text-rose-600" />
                <span>Helpline &amp; Support</span>
                <ChevronDown className="w-3 h-3 text-rose-500" />
              </button>
            </div>

            <div className="flex items-center space-x-1 px-2 py-0.5 rounded-md border border-slate-200 bg-white font-medium text-slate-600">
              <Globe className="w-3 h-3 text-slate-500" />
              <span>EN</span>
              <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
            </div>

            {/* Accessibility toggle */}
            <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]" title="Accessibility Options">
              &bull;
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Brand & Navigation Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand Logos */}
        <div className="flex items-center space-x-3.5">
          {/* Emblem Icon / Logo */}
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-xl shadow-xs border border-orange-400">
            🏛️
          </div>

          <div>
            <div className="text-[10px] font-bold text-amber-700 uppercase tracking-widest leading-none">
              Statutory Body &bull; Govt. of India
            </div>
            <h1 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight leading-tight">
              All India Council for Technical Education
            </h1>
            <div className="text-[11px] font-medium text-amber-600 flex items-center gap-1.5">
              <span>Security Deposit &amp; FDR Management Portal</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                Official AICTE Portal
              </span>
            </div>
          </div>
        </div>

        {/* Center Navigation Links */}
        <nav className="hidden xl:flex items-center space-x-1 text-xs font-semibold text-slate-700">
          <button
            type="button"
            onClick={() => onTabChange('dashboard')}
            className={`px-3 py-2 rounded-lg transition cursor-pointer flex items-center gap-1 ${
              activeTab === 'dashboard'
                ? 'text-amber-600 bg-amber-50 font-bold'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            Explore FDRs
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => onTabChange('dashboard')}
            className="px-3 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1"
          >
            Govt Depository
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => onTabChange('verification')}
            className={`px-3 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'verification'
                ? 'text-amber-600 bg-amber-50 font-bold'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            Verification Desk
            {pendingVerificationCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                {pendingVerificationCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onTabChange('assistant')}
            className={`px-3 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'assistant'
                ? 'text-violet-700 bg-violet-50 font-bold'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-600" />
            AI Assistant
          </button>

          <button
            type="button"
            onClick={() => onTabChange('lifecycle')}
            className={`px-3 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'lifecycle'
                ? 'text-amber-600 bg-amber-50 font-bold'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
            Renewal &amp; Release
            {pendingReleaseCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-600 text-white font-bold">
                {pendingReleaseCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onTabChange('audit')}
            className={`px-3 py-2 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'text-amber-600 bg-amber-50 font-bold'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            Audit Ledger
          </button>
        </nav>

        {/* Right Action Buttons */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Role Persona Switcher Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="px-3 py-2 rounded-lg border border-slate-300 hover:border-slate-400 bg-white text-xs font-semibold text-slate-800 flex items-center space-x-2 shadow-2xs transition cursor-pointer"
            >
              <UserCircle className="w-4 h-4 text-amber-600" />
              <span className="hidden md:inline font-bold">{roleLabels[currentRole].badge}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 text-xs">
                <div className="px-2.5 py-1.5 font-bold text-slate-500 text-[10px] uppercase">
                  Switch Active Role Persona:
                </div>
                {(['AICTE_RO', 'AICTE_HQ_ADMIN', 'INSTITUTION_REP', 'BANK_AUDITOR'] as UserRole[]).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      onRoleChange(role);
                      setShowRoleMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg transition cursor-pointer ${
                      currentRole === role
                        ? 'bg-amber-50 text-amber-900 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-semibold">{roleLabels[role].title}</div>
                    <div className="text-[10px] text-slate-500">{roleLabels[role].subtitle}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Google Sign-in / User Profile */}
          {firebaseUser ? (
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-full">
              {firebaseUser.photoURL ? (
                <img
                  src={firebaseUser.photoURL}
                  alt={firebaseUser.displayName || 'User'}
                  className="w-5 h-5 rounded-full"
                />
              ) : (
                <UserCircle className="w-5 h-5 text-emerald-600" />
              )}
              <span className="text-[11px] font-bold text-slate-800 max-w-[100px] truncate">
                {firebaseUser.displayName || firebaseUser.email?.split('@')[0]}
              </span>
              <button
                type="button"
                onClick={onLogout}
                className="text-[10px] text-slate-400 hover:text-red-600 font-semibold cursor-pointer ml-1"
                title="Sign Out"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onGoogleLogin}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
            >
              <LogIn className="w-3.5 h-3.5 text-slate-500" />
              <span>Google Sign-In</span>
            </button>
          )}

          {/* Main Action Register Free Button (Matches user screenshot: vibrant green rounded pill) */}
          <button
            type="button"
            onClick={onOpenSubmit}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs font-bold text-white bg-[#70b32e] hover:bg-[#629f27] transition shadow-xs cursor-pointer transform hover:scale-[1.02] active:scale-100"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Register FDR Free</span>
          </button>
        </div>
      </div>

      {/* 4. Live Updates Ribbon (Matches user screenshot: light orange/yellow ticker bar) */}
      <div className="bg-[#fff7ed] border-t border-b border-orange-200/80 py-1.5 px-4 sm:px-6 lg:px-8 text-xs text-slate-700 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between space-x-4">
          <div className="flex items-center space-x-3 shrink-0">
            {/* LIVE badge */}
            <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </span>

            <span className="font-bold text-slate-900 text-xs flex items-center gap-1">
              Recently Posted Updates &rarr;
            </span>
          </div>

          {/* Scrolling pill links */}
          <div className="flex items-center space-x-2 overflow-x-auto text-[11px] font-medium">
            <button
              type="button"
              onClick={() => onTabChange('audit')}
              className="px-2.5 py-1 rounded-md bg-amber-100/70 text-amber-900 border border-amber-300/60 hover:bg-amber-200/60 transition whitespace-nowrap flex items-center gap-1 cursor-pointer"
            >
              <FileText className="w-3 h-3 text-amber-700" />
              <span>FDR Verification Report 2025–26</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </button>

            <button
              type="button"
              onClick={() => onTabChange('verification')}
              className="px-2.5 py-1 rounded-md bg-blue-100/70 text-blue-900 border border-blue-300/60 hover:bg-blue-200/60 transition whitespace-nowrap flex items-center gap-1 cursor-pointer"
            >
              <ShieldCheck className="w-3 h-3 text-blue-700" />
              <span>SFMS 2.0 Gateway Direct Login</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </button>

            <button
              type="button"
              onClick={() => onTabChange('dashboard')}
              className="px-2.5 py-1 rounded-md bg-emerald-100/70 text-emerald-900 border border-emerald-300/60 hover:bg-emerald-200/60 transition whitespace-nowrap flex items-center gap-1 cursor-pointer"
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
              <span>Bank-Verified Instruments</span>
            </button>

            <button
              type="button"
              onClick={() => onTabChange('lifecycle')}
              className="px-2.5 py-1 rounded-md bg-indigo-100/70 text-indigo-900 border border-indigo-300/60 hover:bg-indigo-200/60 transition whitespace-nowrap flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-indigo-700" />
              <span>Amrit Sarovar Institutional Deposits</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </button>
          </div>

          <div className="hidden lg:flex items-center text-slate-500 hover:text-slate-900 font-semibold text-[11px] cursor-pointer whitespace-nowrap">
            <span>More portal circulars</span>
            <ChevronDown className="w-3 h-3 ml-0.5" />
          </div>
        </div>
      </div>

      {/* 5. Mobile Navigation Bar */}
      <div className="xl:hidden bg-white border-t border-slate-200 px-4 py-2 flex items-center space-x-2 overflow-x-auto text-xs font-semibold">
        <button
          type="button"
          onClick={() => onTabChange('dashboard')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-amber-50 text-amber-700 font-bold' : 'text-slate-600'}`}
        >
          Depository Registry
        </button>
        <button
          type="button"
          onClick={() => onTabChange('submit')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${activeTab === 'submit' ? 'bg-amber-50 text-amber-700 font-bold' : 'text-slate-600'}`}
        >
          Submit / OCR
        </button>
        <button
          type="button"
          onClick={() => onTabChange('verification')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${activeTab === 'verification' ? 'bg-amber-50 text-amber-700 font-bold' : 'text-slate-600'}`}
        >
          Bank Verification ({pendingVerificationCount})
        </button>
        <button
          type="button"
          onClick={() => onTabChange('lifecycle')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${activeTab === 'lifecycle' ? 'bg-amber-50 text-amber-700 font-bold' : 'text-slate-600'}`}
        >
          Renewal &amp; Release
        </button>
        <button
          type="button"
          onClick={() => onTabChange('audit')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap ${activeTab === 'audit' ? 'bg-amber-50 text-amber-700 font-bold' : 'text-slate-600'}`}
        >
          Audit Ledger
        </button>
      </div>
    </header>
  );
};
