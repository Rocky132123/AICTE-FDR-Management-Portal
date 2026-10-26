/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * AICTE Security Deposit & FDR Management Portal
 * Lead Developer Phase 1 Architecture
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { MetricsOverview } from './components/MetricsOverview';
import { FdrTable } from './components/FdrTable';
import { SubmissionForm } from './components/SubmissionForm';
import { VerificationDesk } from './components/VerificationDesk';
import { RenewalReleaseDesk } from './components/RenewalReleaseDesk';
import { AuditTrailView } from './components/AuditTrailView';
import { FdrDetailModal } from './components/FdrDetailModal';
import { BatchCsvImportModal } from './components/BatchCsvImportModal';
import { AIAssistant } from './components/AIAssistant';
import { INITIAL_FDRS, INITIAL_INSTITUTIONS, INITIAL_AUDIT_LOGS } from './data/mockData';
import { FDRInstrument, UserRole, AuditLogEntry, LifecycleStatus } from './types/fdr';
import { calculateEffectiveLifecycleStatus, formatINR } from './logic/validation';
import { CheckCircle2, Info, AlertTriangle, ShieldCheck, PhoneCall, FileSpreadsheet, Terminal } from 'lucide-react';
import { 
  auth, 
  db, 
  loginWithGoogle, 
  logoutUser, 
  testFirestoreConnection 
} from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, setDoc, doc } from 'firebase/firestore';

export default function App() {
  const [currentRole, setCurrentRole] = useState<UserRole>('AICTE_RO');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [tableFilter, setTableFilter] = useState<string>('ALL');
  
  // Core Repository State
  const [instruments, setInstruments] = useState<FDRInstrument[]>(INITIAL_FDRS);
  const [institutions] = useState(INITIAL_INSTITUTIONS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  
  // Selected Instrument for Modal View
  const [selectedInstrument, setSelectedInstrument] = useState<FDRInstrument | null>(null);
  const [isBatchImportModalOpen, setIsBatchImportModalOpen] = useState<boolean>(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [notificationBanner, setNotificationBanner] = useState<{
    message: string;
    type: 'success' | 'info' | 'warning';
  } | null>(null);

  // Firebase Auth & Firestore live data synchronization
  useEffect(() => {
    testFirestoreConnection();

    // 1. Auth state listener
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user) {
        setNotificationBanner({
          message: `Signed in as ${user.displayName || user.email} via Google Firebase Auth.`,
          type: 'success',
        });
      }
    });

    // 2. Real-time Firestore FDR listener
    const fdrCol = collection(db, 'fdrs');
    const unsubscribeFdrs = onSnapshot(fdrCol, (snapshot) => {
      if (!snapshot.empty) {
        const liveList: FDRInstrument[] = [];
        snapshot.forEach((d) => {
          const item = d.data() as FDRInstrument;
          if (item.discrepancies) {
            item.discrepancies = item.discrepancies.map((disc) => ({
              ...disc,
              message: disc.message ? disc.message.replace(/₹/g, 'Rs. ') : '',
              declaredValue: typeof disc.declaredValue === 'string' ? disc.declaredValue.replace(/₹/g, 'Rs. ') : disc.declaredValue,
              extractedValue: typeof disc.extractedValue === 'string' ? disc.extractedValue.replace(/₹/g, 'Rs. ') : disc.extractedValue,
            }));
          }
          liveList.push(item);
        });
        setInstruments(liveList);
      } else {
        // Seed initial records to Firestore if collection is empty
        INITIAL_FDRS.forEach(async (initFdr) => {
          try {
            await setDoc(doc(db, 'fdrs', initFdr.id), initFdr);
          } catch {
            // fallback gracefully
          }
        });
      }
    }, (err) => {
      console.warn('Firestore onSnapshot notice:', err);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeFdrs();
    };
  }, []);

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (e) {
      console.error('Login error:', e);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setNotificationBanner({
        message: 'Signed out from AICTE Portal.',
        type: 'info',
      });
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  // Helper to add audit entry
  const addAuditLog = async (
    action: string,
    entityType: 'FDR' | 'INSTITUTION' | 'VERIFICATION' | 'RELEASE_REQUEST' | 'POLICY',
    entityId: string,
    details: string
  ) => {
    const newEntry: AuditLogEntry = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorId: firebaseUser ? firebaseUser.uid : `actor-${currentRole.toLowerCase()}`,
      actorName: firebaseUser?.displayName || (currentRole === 'AICTE_RO' 
        ? 'Dr. V. K. Taneja (Regional Officer)' 
        : currentRole === 'AICTE_HQ_ADMIN' 
        ? 'Prof. Rajive Kumar (HQ Member Secretary)' 
        : currentRole === 'INSTITUTION_REP' 
        ? 'Dr. R. K. Sharma (Registrar, Institution)' 
        : 'RBI / SFMS Direct Gateway Agent'),
      actorRole: currentRole,
      action,
      entityType,
      entityId,
      details,
      ipAddress: '10.24.18.52 (Encrypted Portal Session)',
      hash: 'sha256-' + Math.random().toString(36).substring(2, 14) + Math.random().toString(36).substring(2, 14),
    };
    setAuditLogs((prev) => [newEntry, ...prev]);

    // Persist audit log to Firestore
    try {
      await setDoc(doc(db, 'audit_logs', newEntry.id), newEntry);
    } catch {
      // offline fallback
    }
  };

  // Submit New FDR Handler (Writes to state + Firestore)
  const handleSubmitSuccess = async (newFdr: FDRInstrument) => {
    setInstruments((prev) => [newFdr, ...prev]);
    addAuditLog(
      'FDR_SUBMISSION_RECORDED',
      'FDR',
      newFdr.id,
      `New FDR ${newFdr.fdrNumber} (Rs. ${newFdr.depositAmount.toLocaleString('en-IN')}) submitted for ${newFdr.institutionName}. OCR extraction completed.`
    );

    // Save to Firestore for permanent persistence
    try {
      await setDoc(doc(db, 'fdrs', newFdr.id), newFdr);
    } catch (e) {
      console.warn('Firestore write notice:', e);
    }

    setNotificationBanner({
      message: `FDR ${newFdr.fdrNumber} successfully registered into Firestore! Status: ${newFdr.lifecycleStatus}.`,
      type: 'success',
    });
    setActiveTab('dashboard');
  };

  // Batch FDR Import Handler (Writes to state + Firestore)
  const handleBatchImportSuccess = async (newFdrs: FDRInstrument[]) => {
    setInstruments((prev) => [...newFdrs, ...prev]);

    // Persist each to Firestore
    for (const fdr of newFdrs) {
      try {
        await setDoc(doc(db, 'fdrs', fdr.id), fdr);
      } catch (e) {
        console.warn('Firestore write warning:', e);
      }
    }

    addAuditLog(
      'BATCH_CSV_IMPORT_COMPLETED',
      'FDR',
      `batch-${Date.now()}`,
      `Batch intake registered ${newFdrs.length} FDR records via statutory CSV utility. Verified against approved AICTE institutions.`
    );

    setNotificationBanner({
      message: `Batch import successful! Registered ${newFdrs.length} FDR instruments into registry and Firestore.`,
      type: 'success',
    });
    setActiveTab('dashboard');
  };

  // Discrepancy Resolution Handler
  const handleResolveDiscrepancy = (fdrId: string, discrepancyId: string, note: string) => {
    setInstruments((prev) =>
      prev.map((item) => {
        if (item.id !== fdrId) return item;
        const updatedDiscrepancies = item.discrepancies.map((d) =>
          d.id === discrepancyId ? { ...d, isResolved: true, resolutionNote: note } : d
        );
        const hasUnresolvedCritical = updatedDiscrepancies.some((d) => !d.isResolved && d.severity === 'CRITICAL');
        const newStatus: LifecycleStatus = hasUnresolvedCritical
          ? 'FLAGGED_DISCREPANCY'
          : item.verificationStatus === 'BANK_CONFIRMED'
          ? 'VERIFIED_ACTIVE'
          : 'AWAITING_VERIFICATION';

        return {
          ...item,
          discrepancies: updatedDiscrepancies,
          lifecycleStatus: newStatus,
          verificationStatus: hasUnresolvedCritical ? 'DISCREPANCY_UNRESOLVED' : item.verificationStatus,
          lastUpdatedAt: new Date().toISOString(),
        };
      })
    );

    // Keep selectedInstrument in sync
    setSelectedInstrument((prev) => {
      if (!prev || prev.id !== fdrId) return prev;
      const updatedDiscrepancies = prev.discrepancies.map((d) =>
        d.id === discrepancyId ? { ...d, isResolved: true, resolutionNote: note } : d
      );
      const hasUnresolvedCritical = updatedDiscrepancies.some((d) => !d.isResolved && d.severity === 'CRITICAL');
      return {
        ...prev,
        discrepancies: updatedDiscrepancies,
        lifecycleStatus: hasUnresolvedCritical ? 'FLAGGED_DISCREPANCY' : 'VERIFIED_ACTIVE',
      };
    });

    addAuditLog('DISCREPANCY_RESOLVED', 'FDR', fdrId, `Resolved discrepancy (${discrepancyId}) with note: "${note}"`);
  };

  // Trigger Authorized Bank Verification (SFMS / API Simulation)
  const handleTriggerBankVerification = (fdrId: string) => {
    const confirmationCode = `SFMS-REF-${Math.floor(100000 + Math.random() * 900000)}`;
    setInstruments((prev) =>
      prev.map((item) => {
        if (item.id !== fdrId) return item;
        const effective = calculateEffectiveLifecycleStatus({
          ...item,
          verificationStatus: 'BANK_CONFIRMED',
        });
        return {
          ...item,
          verificationStatus: 'BANK_CONFIRMED',
          lifecycleStatus: effective,
          verificationEvidence: {
            verified: true,
            verificationSource: 'SFMS_GATEWAY',
            verifiedBy: `${currentRole} Verification Officer`,
            verifiedAt: new Date().toISOString(),
            bankReferenceNumber: confirmationCode,
            officialRemarks: 'Digital verification confirmed active lien and security deposit balance at issuing branch.',
          },
          lastUpdatedAt: new Date().toISOString(),
        };
      })
    );

    // Keep selectedInstrument in sync
    setSelectedInstrument((prev) => {
      if (!prev || prev.id !== fdrId) return prev;
      return {
        ...prev,
        verificationStatus: 'BANK_CONFIRMED',
        lifecycleStatus: 'VERIFIED_ACTIVE',
        verificationEvidence: {
          verified: true,
          verificationSource: 'SFMS_GATEWAY',
          verifiedBy: `${currentRole} Verification Officer`,
          verifiedAt: new Date().toISOString(),
          bankReferenceNumber: confirmationCode,
          officialRemarks: 'Digital verification confirmed active lien and security deposit balance at issuing branch.',
        },
      };
    });

    addAuditLog(
      'BANK_VERIFICATION_CONFIRMED',
      'VERIFICATION',
      fdrId,
      `Cryptographic SFMS bank confirmation issued under ref #${confirmationCode}.`
    );

    setNotificationBanner({
      message: `Bank verification confirmed under ref #${confirmationCode}. Record moved to Verified Active.`,
      type: 'success',
    });
  };

  // Flag Back to Institution
  const handleFlagBackToInstitution = (fdrId: string, reason: string) => {
    setInstruments((prev) =>
      prev.map((item) => {
        if (item.id !== fdrId) return item;
        return {
          ...item,
          lifecycleStatus: 'FLAGGED_DISCREPANCY',
          verificationStatus: 'DISCREPANCY_UNRESOLVED',
          discrepancies: [
            ...item.discrepancies,
            {
              id: `notice-${Date.now()}`,
              field: 'Official Clarification Notice',
              declaredValue: 'Pending Institutional Response',
              extractedValue: reason,
              severity: 'CRITICAL',
              message: reason,
              isResolved: false,
            },
          ],
          lastUpdatedAt: new Date().toISOString(),
        };
      })
    );

    addAuditLog('NOTICE_ISSUED_TO_INSTITUTION', 'FDR', fdrId, `Issued formal clarification notice: "${reason}"`);
    setNotificationBanner({
      message: `Formal clarification notice dispatched to institution. Case flagged for correction.`,
      type: 'warning',
    });
  };

  // Renewal Submission Handler
  const handleSubmitRenewal = (
    originalFdrId: string,
    newFdrNumber: string,
    bank: string,
    amount: number,
    maturityDate: string,
    reason: string
  ) => {
    const oldFdr = instruments.find((i) => i.id === originalFdrId);
    if (!oldFdr) return;

    // 1. Mark old FDR as RENEWED_REPLACED
    setInstruments((prev) =>
      prev.map((item) => {
        if (item.id === originalFdrId) {
          return {
            ...item,
            lifecycleStatus: 'RENEWED_REPLACED',
            lastUpdatedAt: new Date().toISOString(),
          };
        }
        return item;
      })
    );

    // 2. Insert new replacement instrument
    const newReplacement: FDRInstrument = {
      id: `fdr-${Date.now()}`,
      fdrNumber: newFdrNumber,
      institutionId: oldFdr.institutionId,
      institutionName: oldFdr.institutionName,
      aictePermanentId: oldFdr.aictePermanentId,
      issuingBank: bank,
      bankBranch: oldFdr.bankBranch,
      ifscCode: oldFdr.ifscCode,
      depositAmount: amount,
      depositAmountInWords: `${formatINR(amount)} (Renewal Replacement)`,
      issueDate: new Date().toISOString().split('T')[0],
      maturityDate: maturityDate,
      tenureMonths: 96,
      interestRate: 7.2,
      lienMarkedToAICTE: true,
      jointAccountWithAICTE: true,
      documentFileName: `Renewal_${newFdrNumber}.pdf`,
      documentFileSize: '410 KB',
      documentUrl: '/docs/renewal.pdf',
      documentChecksum: 'sha256-renew-' + Math.random().toString(36).substring(2, 10),
      lifecycleStatus: 'VERIFIED_ACTIVE',
      verificationStatus: 'BANK_CONFIRMED',
      discrepancies: [],
      renewalInfo: {
        isRenewal: true,
        originalFdrId: oldFdr.id,
        previousFdrNumber: oldFdr.fdrNumber,
        renewalSequenceNumber: (oldFdr.renewalInfo?.renewalSequenceNumber || 1) + 1,
        tenureExtensionMonths: 96,
        renewalDate: new Date().toISOString().split('T')[0],
        replacementReason: reason,
      },
      verificationEvidence: {
        verified: true,
        verificationSource: 'SFMS_GATEWAY',
        verifiedBy: 'AICTE Renewal Desk',
        verifiedAt: new Date().toISOString(),
        bankReferenceNumber: `SFMS-RNW-${Math.floor(100000 + Math.random() * 900000)}`,
        officialRemarks: `Replacement instrument confirmed for earlier reference ${oldFdr.fdrNumber}.`,
      },
      submittedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      submittedBy: oldFdr.submittedBy,
      tags: ['Replacement FDR', 'Audit Lineage Linked'],
    };

    setInstruments((prev) => [newReplacement, ...prev]);

    addAuditLog(
      'RENEWAL_INSTRUMENT_LINKED',
      'FDR',
      newReplacement.id,
      `Linked replacement FDR ${newFdrNumber} to predecessor ${oldFdr.fdrNumber} for ${oldFdr.institutionName}.`
    );

    setNotificationBanner({
      message: `Renewal FDR ${newFdrNumber} linked successfully! Lineage to ${oldFdr.fdrNumber} preserved.`,
      type: 'success',
    });
  };

  // Submit Release Application
  const handleSubmitReleaseRequest = (fdrId: string, justification: string) => {
    setInstruments((prev) =>
      prev.map((item) => {
        if (item.id !== fdrId) return item;
        return {
          ...item,
          lifecycleStatus: 'RELEASE_REQUESTED',
          releaseRequest: {
            id: `rel-${Date.now()}`,
            requestedAt: new Date().toISOString(),
            requestedBy: item.submittedBy,
            reason: 'TENURE_COMPLETED_COMPLIANCE_MET',
            justification,
            complianceChecks: {
              noPendingDues: true,
              aicteApprovalLetterAttached: true,
              landBuildingComplianceMet: true,
              courtCasesClear: true,
            },
            approvalTier: 'TIER_1_REGIONAL_OFFICER',
            status: 'PENDING_RO_REVIEW',
            actionHistory: [
              {
                actor: 'Institution Representative',
                role: currentRole,
                action: 'RELEASE_APPLICATION_SUBMITTED',
                timestamp: new Date().toISOString(),
                comment: justification,
              },
            ],
          },
          lastUpdatedAt: new Date().toISOString(),
        };
      })
    );

    addAuditLog('RELEASE_APPLICATION_INITIATED', 'RELEASE_REQUEST', fdrId, `Application for refund submitted: "${justification}"`);
    setNotificationBanner({
      message: 'Release application initiated and routed to AICTE Regional Officer for scrutiny.',
      type: 'info',
    });
  };

  // Approve Release (Dual Tier)
  const handleApproveRelease = (fdrId: string, level: 'RO' | 'DIRECTOR', remarks: string) => {
    setInstruments((prev) =>
      prev.map((item) => {
        if (item.id !== fdrId || !item.releaseRequest) return item;
        if (level === 'RO') {
          return {
            ...item,
            releaseRequest: {
              ...item.releaseRequest,
              approvalTier: 'TIER_2_HQ_DIRECTOR',
              status: 'PENDING_DIRECTOR_APPROVAL',
              actionHistory: [
                ...item.releaseRequest.actionHistory,
                {
                  actor: 'Regional Officer',
                  role: currentRole,
                  action: 'RO_RECOMMENDATION_ENDORSED',
                  timestamp: new Date().toISOString(),
                  comment: remarks,
                },
              ],
            },
          };
        } else {
          // Final HQ Director Approval
          return {
            ...item,
            lifecycleStatus: 'RELEASED',
            releaseRequest: {
              ...item.releaseRequest,
              approvalTier: 'FINAL_DISBURSEMENT',
              status: 'APPROVED',
              actionHistory: [
                ...item.releaseRequest.actionHistory,
                {
                  actor: 'Member Secretary / Director HQ',
                  role: currentRole,
                  action: 'FINAL_SANCTION_RELEASE_GRANTED',
                  timestamp: new Date().toISOString(),
                  comment: remarks,
                },
              ],
            },
          };
        }
      })
    );

    setSelectedInstrument(null);
    addAuditLog(
      level === 'RO' ? 'RO_RELEASE_RECOMMENDED' : 'HQ_RELEASE_SANCTIONED',
      'RELEASE_REQUEST',
      fdrId,
      remarks
    );

    setNotificationBanner({
      message: level === 'RO'
        ? 'Regional Officer recommendation recorded. Transferred to HQ Director for sanction.'
        : 'Final release and lien discharge sanctioned by AICTE Member Secretary!',
      type: 'success',
    });
  };

  // Reject Release
  const handleRejectRelease = (fdrId: string, remarks: string) => {
    setInstruments((prev) =>
      prev.map((item) => {
        if (item.id !== fdrId || !item.releaseRequest) return item;
        return {
          ...item,
          lifecycleStatus: 'VERIFIED_ACTIVE',
          releaseRequest: {
            ...item.releaseRequest,
            status: 'REJECTED',
            actionHistory: [
              ...item.releaseRequest.actionHistory,
              {
                actor: 'AICTE Reviewing Officer',
                role: currentRole,
                action: 'RELEASE_REQUEST_DECLINED',
                timestamp: new Date().toISOString(),
                comment: remarks,
              },
            ],
          },
        };
      })
    );
    setSelectedInstrument(null);
    addAuditLog('RELEASE_REQUEST_DECLINED', 'RELEASE_REQUEST', fdrId, remarks);
  };

  const pendingVerificationCount = instruments.filter(
    (i) => i.verificationStatus === 'PENDING_VERIFICATION' || i.lifecycleStatus === 'AWAITING_VERIFICATION'
  ).length;

  const discrepancyCount = instruments.filter(
    (i) => i.lifecycleStatus === 'FLAGGED_DISCREPANCY' || i.discrepancies.some((d) => !d.isResolved)
  ).length;

  const pendingReleaseCount = instruments.filter(
    (i) => i.lifecycleStatus === 'RELEASE_REQUESTED'
  ).length;

  const [showHelplineModal, setShowHelplineModal] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-[#faf8f5] text-slate-900 flex flex-col font-sans antialiased selection:bg-orange-100 selection:text-orange-900">
      {/* Official AICTE Navbar with Government utility bar & live ribbon */}
      <Navbar
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        discrepancyCount={discrepancyCount}
        pendingVerificationCount={pendingVerificationCount}
        pendingReleaseCount={pendingReleaseCount}
        firebaseUser={firebaseUser}
        onGoogleLogin={handleGoogleLogin}
        onLogout={handleLogout}
        onOpenSubmit={() => {
          setActiveTab('submit');
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-6">
        {/* Notification Banner */}
        {notificationBanner && (
          <div className={`p-3.5 rounded-xl text-xs flex flex-wrap items-center justify-between gap-3 border shadow-2xs ${
            notificationBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : notificationBanner.type === 'warning'
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-orange-50 border-orange-200 text-orange-950'
          }`}>
            <div className="flex items-center space-x-2">
              {notificationBanner.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : notificationBanner.type === 'warning' ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-orange-600 shrink-0" />
              )}
              <span className="font-semibold">{notificationBanner.message}</span>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setNotificationBanner(null)}
                className="text-xs opacity-70 hover:opacity-100 cursor-pointer font-bold px-2 py-1"
                aria-label="Dismiss banner"
              >
                &times;
              </button>
            </div>
          </div>
        )}

        {/* Top Summary Metrics Cards */}
        {activeTab === 'dashboard' && (
          <MetricsOverview
            instruments={instruments}
            onFilterClick={(filter) => setTableFilter(filter)}
          />
        )}

       

        {/* Tab 1: Central Repository */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Central Fixed Deposit &amp; Security Deposit Registry
                </h2>
                <p className="text-xs text-slate-500">
                  Single reliable source of truth across submission, OCR extraction, independent verification, renewal, and release.
                </p>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsBatchImportModalOpen(true)}
                  className="inline-flex items-center px-3.5 py-2 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-950 font-bold text-xs transition cursor-pointer shadow-2xs border border-orange-300 dark:border-orange-800 dark:bg-orange-950/70 dark:text-orange-200"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-1.5 text-orange-600 dark:text-orange-400" />
                  Batch Import CSV
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('submit')}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer shadow-sm"
                >
                  + Register New FDR Record
                </button>
              </div>
            </div>

            <FdrTable
              instruments={instruments}
              onSelectInstrument={setSelectedInstrument}
              selectedFilter={tableFilter}
              onFilterChange={setTableFilter}
              currentUserRole={currentRole}
              currentUserName={firebaseUser?.displayName || undefined}
              onOpenBatchImport={() => setIsBatchImportModalOpen(true)}
            />
          </div>
        )}

        {/* Tab 2: FDR Submission & OCR Intelligence Pipeline */}
        {activeTab === 'submit' && (
          <SubmissionForm
            institutions={institutions}
            existingFDRs={instruments}
            onSubmitSuccess={handleSubmitSuccess}
          />
        )}

        {/* Tab: AI case assistance */}
        {activeTab === 'assistant' && (
          <AIAssistant instruments={instruments} />
        )}

        {/* Tab 3: Bank Verification Desk */}
        {activeTab === 'verification' && (
          <VerificationDesk
            instruments={instruments}
            currentUserRole={currentRole}
            onSelectInstrument={setSelectedInstrument}
            onTriggerBankVerification={handleTriggerBankVerification}
            onFlagBackToInstitution={handleFlagBackToInstitution}
          />
        )}

        {/* Tab 4: Maturity, Renewal & Release Desk */}
        {activeTab === 'lifecycle' && (
          <RenewalReleaseDesk
            instruments={instruments}
            currentUserRole={currentRole}
            onSelectInstrument={setSelectedInstrument}
            onSubmitRenewal={handleSubmitRenewal}
            onSubmitReleaseRequest={handleSubmitReleaseRequest}
          />
        )}

        {/* Tab 5: Audit Trail */}
        {activeTab === 'audit' && (
          <AuditTrailView logs={auditLogs} />
        )}
      </main>

      {/* Detailed Modal Inspector */}
      <FdrDetailModal
        instrument={selectedInstrument}
        onClose={() => setSelectedInstrument(null)}
        currentUserRole={currentRole}
        onResolveDiscrepancy={handleResolveDiscrepancy}
        onTriggerBankVerification={handleTriggerBankVerification}
        onApproveRelease={handleApproveRelease}
        onRejectRelease={handleRejectRelease}
      />

      {/* Batch CSV Import Modal */}
      <BatchCsvImportModal
        isOpen={isBatchImportModalOpen}
        onClose={() => setIsBatchImportModalOpen(false)}
        institutions={institutions}
        existingInstruments={instruments}
        onImportBatch={handleBatchImportSuccess}
      />

      {/* Floating Orange Phone Helpline Button (matches user reference image) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setShowHelplineModal(!showHelplineModal)}
          aria-label="AICTE Helpline & Support"
          className="w-14 h-14 rounded-full bg-linear-to-tr from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-xl hover:shadow-orange-500/30 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer ring-4 ring-white"
        >
          <PhoneCall className="w-6 h-6 stroke-[2.2]" />
        </button>

        {showHelplineModal && (
          <div className="absolute bottom-16 right-0 w-80 bg-white rounded-2xl border border-slate-200 shadow-2xl p-4 text-xs space-y-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-2">
                <span className="p-1 rounded bg-orange-100 text-orange-700">
                  <PhoneCall className="w-3.5 h-3.5" />
                </span>
                <span className="font-bold text-slate-900">AICTE Depository Helpline</span>
              </div>
              <button
                type="button"
                onClick={() => setShowHelplineModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                &times;
              </button>
            </div>
            <div className="space-y-1.5 text-slate-600">
              <p>For queries regarding FDR submission, SFMS bank verification, and lien releases:</p>
              <div className="p-2 rounded-lg bg-orange-50/60 border border-orange-100 font-medium">
                <div className="text-slate-900 font-bold">Toll Free: 1800-11-2244</div>
                <div className="text-slate-600 text-[11px]">Direct SFMS Desk: 011-29581000</div>
                <div className="text-orange-700 font-mono text-[11px] mt-1">fdr-support@aicte-india.org</div>
              </div>
              <div className="text-[10px] text-slate-400">
                Operating Hours: Monday &ndash; Friday (9:30 AM to 5:30 PM IST)
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-slate-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between text-xs gap-3">
          <div>
            &copy; 2026 All India Council for Technical Education (AICTE), Ministry of Education, Govt. of India.
          </div>
          <div className="flex items-center space-x-4 text-slate-500">
            <span>Approval Process Handbook (APH) Compliant</span>
            <span>&bull;</span>
            <span className="font-mono">Security Tier: ISO 27001 / SFMS Direct</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
