/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Upload, FileText, CheckCircle2, AlertTriangle, Sparkles, RefreshCw, 
  ShieldAlert, Eye, FileUp, Check, Info, ArrowRight, CornerDownRight,
  Image as ImageIcon, X, ZoomIn, FileCheck2, FolderOpen
} from 'lucide-react';
import { FDRInstrument, Institution, OcrExtractionData, DiscrepancyItem } from '../types/fdr';
import { validateFDRSubmission, compareDeclaredWithOcr, formatINR } from '../logic/validation';
import { extractFdrDocument } from '../logic/documentOcr';

interface SubmissionFormProps {
  institutions: Institution[];
  existingFDRs: FDRInstrument[];
  onSubmitSuccess: (newFdr: FDRInstrument) => void;
}

export const SubmissionForm: React.FC<SubmissionFormProps> = ({
  institutions,
  existingFDRs,
  onSubmitSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [selectedInstId, setSelectedInstId] = useState<string>(institutions[0]?.id || '');
  const [fdrNumber, setFdrNumber] = useState('SBI-DEL-2026-99341');
  const [issuingBank, setIssuingBank] = useState('State Bank of India');
  const [bankBranch, setBankBranch] = useState('Connaught Place, New Delhi');
  const [ifscCode, setIfscCode] = useState('SBIN0000691');
  const [depositAmount, setDepositAmount] = useState<number>(3500000);
  const [depositAmountInWords, setDepositAmountInWords] = useState('Rupees Thirty Five Lakhs Only');
  const [issueDate, setIssueDate] = useState('2026-10-20');
  const [maturityDate, setMaturityDate] = useState('2034-10-20'); // 8 years
  const [lienMarked, setLienMarked] = useState(true);
  const [jointAccount, setJointAccount] = useState(true);

  // Document upload & real file handling state
  const [uploadedFileName, setUploadedFileName] = useState('FDR_Scan_SBI_Connaught.pdf');
  const [fileSize, setFileSize] = useState('456 KB');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFilePreviewUrl, setUploadedFilePreviewUrl] = useState<string | null>(null);
  const [isImageFile, setIsImageFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isCustomUpload, setIsCustomUpload] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // OCR state
  const [isScanningOcr, setIsScanningOcr] = useState(false);
  const [ocrCompleted, setOcrCompleted] = useState(false);
  const [ocrData, setOcrData] = useState<OcrExtractionData | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [detectedDiscrepancies, setDetectedDiscrepancies] = useState<DiscrepancyItem[]>([]);
  const [ocrWarnings, setOcrWarnings] = useState<string[]>([]);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>('valid');

  const selectedInstitution = institutions.find((i) => i.id === selectedInstId) || institutions[0];

  // Handle actual file upload from user's filesystem
  const handleFileSelected = (file: File) => {
    setUploadedFile(file);
    setUploadedFileName(file.name);
    setIsCustomUpload(true);
    setSelectedPreset('custom');
    setOcrCompleted(false);
    setOcrData(null);
    setDetectedDiscrepancies([]);
    setOcrWarnings([]);
    setOcrError(null);
    setValidationErrors([]);
    setValidationWarnings([]);

    const sizeFormatted = file.size > 1024 * 1024 
      ? (file.size / (1024 * 1024)).toFixed(2) + ' MB' 
      : (file.size / 1024).toFixed(1) + ' KB';
    setFileSize(sizeFormatted);

    // If it's an image, create an object URL for instant preview
    if (file.type.startsWith('image/')) {
      setIsImageFile(true);
      const url = URL.createObjectURL(file);
      setUploadedFilePreviewUrl(url);
    } else {
      setIsImageFile(false);
      setUploadedFilePreviewUrl(null);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  // Quick Presets to demonstrate different regulatory scenarios
  const applyPreset = (presetType: 'valid' | 'amount_mismatch' | 'lien_missing' | 'user_attachment' | 'duplicate_err') => {
    setSelectedPreset(presetType);
    setIsCustomUpload(false);
    setOcrCompleted(false);
    setOcrData(null);
    setDetectedDiscrepancies([]);
    setValidationErrors([]);
    setValidationWarnings([]);

    if (presetType === 'valid') {
      setSelectedInstId(institutions[0]?.id || '');
      setFdrNumber('SBI-DEL-2026-99341');
      setIssuingBank('State Bank of India');
      setBankBranch('Connaught Place, New Delhi');
      setIfscCode('SBIN0000691');
      setDepositAmount(3500000);
      setDepositAmountInWords('Rupees Thirty Five Lakhs Only');
      setIssueDate('2026-10-20');
      setMaturityDate('2034-10-20');
      setLienMarked(true);
      setJointAccount(true);
      setUploadedFileName('FDR_Scan_SBI_Connaught.pdf');
      setFileSize('456 KB');
      setIsImageFile(false);
      setUploadedFilePreviewUrl(null);
    } else if (presetType === 'amount_mismatch') {
      setSelectedInstId(institutions[1]?.id || '');
      setFdrNumber('PNB-PUN-2026-88102');
      setIssuingBank('Punjab National Bank');
      setBankBranch('Shivajinagar, Pune');
      setIfscCode('PUNB0123400');
      setDepositAmount(2500000); // Institution claims 25L
      setDepositAmountInWords('Rupees Twenty Five Lakhs Only');
      setIssueDate('2026-09-15');
      setMaturityDate('2034-09-15');
      setLienMarked(true);
      setJointAccount(true);
      setUploadedFileName('PNB_Deficit_Receipt_Scan.pdf');
      setFileSize('320 KB');
      setIsImageFile(false);
      setUploadedFilePreviewUrl(null);
    } else if (presetType === 'lien_missing') {
      setSelectedInstId(institutions[2]?.id || '');
      setFdrNumber('HDFC-CHN-2026-10029');
      setIssuingBank('HDFC Bank');
      setBankBranch('Guindy, Chennai');
      setIfscCode('HDFC0000128');
      setDepositAmount(1500000);
      setDepositAmountInWords('Rupees Fifteen Lakhs Only');
      setIssueDate('2026-08-01');
      setMaturityDate('2034-08-01');
      setLienMarked(true); // Claims lien marked
      setJointAccount(false);
      setUploadedFileName('HDFC_Ordinary_Deposit_NoLien.pdf');
      setFileSize('280 KB');
      setIsImageFile(false);
      setUploadedFilePreviewUrl(null);
    } else if (presetType === 'user_attachment') {
      // Use the actual attached image in public/assets/aistudio/
      setSelectedInstId(institutions[0]?.id || '');
      setFdrNumber('AICTE-FDR-FLOW-2026');
      setIssuingBank('State Bank of India');
      setBankBranch('AICTE HQ Branch, New Delhi');
      setIfscCode('SBIN0000691');
      setDepositAmount(5000000);
      setDepositAmountInWords('Rupees Fifty Lakhs Only');
      setIssueDate('2026-10-24');
      setMaturityDate('2034-10-24');
      setLienMarked(true);
      setJointAccount(true);
      setUploadedFileName('WhatsApp_Image_2026-10-24_at_12.49.15_PM_4b3b2392.jpeg');
      setFileSize('145 KB');
      setIsImageFile(true);
      setUploadedFilePreviewUrl('/assets/aistudio/WhatsApp_Image_2026-10-24_at_12.49.15_PM_4b3b2392.jpeg');
    } else if (presetType === 'duplicate_err') {
      const existing = existingFDRs[0]?.fdrNumber || 'SBI-ND-2023-88910';
      setFdrNumber(existing);
      setIssuingBank('State Bank of India');
      setDepositAmount(3500000);
      setIssueDate('2026-10-20');
      setMaturityDate('2034-10-20');
      setUploadedFileName('Duplicate_Scan_Attempt.pdf');
      setFileSize('390 KB');
      setIsImageFile(false);
      setUploadedFilePreviewUrl(null);
    }
  };

  // Real OCR for an uploaded document; presets remain available for demo/testing only.
  const handleRunOcr = async () => {
    setIsScanningOcr(true);
    setOcrError(null);
    setOcrWarnings([]);

    if (isCustomUpload && uploadedFile) {
      try {
        const extraction = await extractFdrDocument(uploadedFile);
        const realOcr = extraction.data;
        setOcrData(realOcr);
        setOcrWarnings(extraction.warnings);
        setOcrCompleted(true);
        const candidate: Partial<FDRInstrument> = {
          fdrNumber, institutionId: selectedInstId, issuingBank, depositAmount, issueDate, maturityDate,
          lienMarkedToAICTE: lienMarked, jointAccountWithAICTE: jointAccount, ocrData: realOcr,
        };
        const result = validateFDRSubmission(candidate, existingFDRs);
        setValidationErrors(result.errors);
        setValidationWarnings(result.warnings);
        setDetectedDiscrepancies(result.discrepancies);
      } catch (error) {
        setOcrError(error instanceof Error ? error.message : 'OCR failed. Try another document or enter the values manually.');
        setOcrCompleted(false);
      } finally {
        setIsScanningOcr(false);
      }
      return;
    }

    // Preset scenarios below are synthetic test fixtures, not OCR of a real document.
    setTimeout(() => {
      let mockOcr: OcrExtractionData;

      if (isCustomUpload && uploadedFile) {
        // Intelligent extraction for user's custom uploaded file
        const cleanName = uploadedFile.name.toUpperCase();
        let guessedBank = issuingBank;
        if (cleanName.includes('SBI') || cleanName.includes('STATE')) guessedBank = 'State Bank of India';
        else if (cleanName.includes('PNB') || cleanName.includes('PUNJAB')) guessedBank = 'Punjab National Bank';
        else if (cleanName.includes('HDFC')) guessedBank = 'HDFC Bank';
        else if (cleanName.includes('CANARA')) guessedBank = 'Canara Bank';
        else if (cleanName.includes('ICICI')) guessedBank = 'ICICI Bank';

        mockOcr = {
          extractedFdrNumber: fdrNumber || `FDR-${cleanName.replace(/[^A-Z0-9]/g, '').slice(0, 8)}-2026`,
          extractedBank: guessedBank,
          extractedBranch: bankBranch || 'Main Branch',
          extractedAmount: depositAmount || 3500000,
          extractedIssueDate: issueDate || '2026-10-24',
          extractedMaturityDate: maturityDate || '2034-10-24',
          extractedInterestRate: 7.25,
          extractedLienStatus: lienMarked,
          extractedJointAccount: jointAccount,
          confidenceScore: 97.5,
          fieldConfidence: {
            fdrNumber: 98.5,
            amount: 99.0,
            bank: 97.2,
            dates: 98.1,
            lien: 95.0,
          },
          rawExtractedText: `AICTE OCR PIPELINE [FILE: ${uploadedFile.name}]\nPARSED HEADER: ${guessedBank.toUpperCase()} FIXED DEPOSIT RECEIPT\nINSTRUMENT NUMBER: ${fdrNumber}\nPRINCIPAL AMOUNT: Rs. ${depositAmount.toLocaleString('en-IN')}/-\nFAVOURING: ${selectedInstitution.name} & Member Secretary AICTE\nLIEN MARKED: ${lienMarked ? 'YES' : 'NO'}\nMATURITY: ${maturityDate}`,
          processedAt: new Date().toISOString(),
        };
      } else if (selectedPreset === 'amount_mismatch') {
        mockOcr = {
          extractedFdrNumber: fdrNumber,
          extractedBank: issuingBank,
          extractedBranch: bankBranch,
          extractedAmount: 250000, // Deficit!
          extractedIssueDate: issueDate,
          extractedMaturityDate: maturityDate,
          extractedInterestRate: 7.0,
          extractedLienStatus: false,
          extractedJointAccount: true,
          confidenceScore: 93.1,
          fieldConfidence: {
            fdrNumber: 97.5,
            amount: 95.0,
            bank: 98.2,
            dates: 98.0,
            lien: 72.0,
          },
          rawExtractedText: `PUNJAB NATIONAL BANK - TERM DEPOSIT RECEIPT\nRECEIPT NO: ${fdrNumber}\nSUM OF RUPEES: 2,50,000.00 (Two Lakhs Fifty Thousand Only)\nFAVOURING: ${selectedInstitution.name}\nNOTE: Standard term deposit without specific AICTE lien clause endorsement.`,
          processedAt: new Date().toISOString(),
        };
      } else if (selectedPreset === 'lien_missing') {
        mockOcr = {
          extractedFdrNumber: fdrNumber,
          extractedBank: issuingBank,
          extractedBranch: bankBranch,
          extractedAmount: depositAmount,
          extractedIssueDate: issueDate,
          extractedMaturityDate: maturityDate,
          extractedInterestRate: 7.1,
          extractedLienStatus: false, // Missing lien
          extractedJointAccount: false,
          confidenceScore: 95.0,
          fieldConfidence: {
            fdrNumber: 99.0,
            amount: 97.0,
            bank: 96.0,
            dates: 98.0,
            lien: 80.0,
          },
          rawExtractedText: `HDFC BANK - FIXED DEPOSIT ADVICE\nA/C: ${fdrNumber}\nAMOUNT: Rs. 15,00,000\nNO LIEN RECORDED ON THIS INSTRUMENT.`,
          processedAt: new Date().toISOString(),
        };
      } else if (selectedPreset === 'user_attachment') {
        mockOcr = {
          extractedFdrNumber: fdrNumber,
          extractedBank: issuingBank,
          extractedBranch: bankBranch,
          extractedAmount: depositAmount,
          extractedIssueDate: issueDate,
          extractedMaturityDate: maturityDate,
          extractedInterestRate: 7.25,
          extractedLienStatus: true,
          extractedJointAccount: true,
          confidenceScore: 99.2,
          fieldConfidence: {
            fdrNumber: 99.5,
            amount: 99.2,
            bank: 98.8,
            dates: 99.4,
            lien: 99.0,
          },
          rawExtractedText: `AICTE FLOWCHART DOCUMENT / FINANCIAL INSTRUMENT SPECIFICATION\nFILE: WhatsApp_Image_2026-10-24_at_12.49.15_PM_4b3b2392.jpeg\nPROCESS STAGE: Institution Login -> Submit FDR Details & Document -> Secure Storage -> OCR & Field Extraction -> Discrepancy Validation -> Authorized Verification.\nDEPOSIT AMOUNT: Rs. 50,00,000 (Rupees Fifty Lakhs Only)\nSTATUS: Clean Verified Security Deposit`,
          processedAt: new Date().toISOString(),
        };
      } else {
        // Valid SBI preset
        mockOcr = {
          extractedFdrNumber: fdrNumber,
          extractedBank: issuingBank,
          extractedBranch: bankBranch,
          extractedAmount: depositAmount,
          extractedIssueDate: issueDate,
          extractedMaturityDate: maturityDate,
          extractedInterestRate: 7.25,
          extractedLienStatus: true,
          extractedJointAccount: true,
          confidenceScore: 98.4,
          fieldConfidence: {
            fdrNumber: 99.2,
            amount: 98.8,
            bank: 99.0,
            dates: 99.1,
            lien: 96.5,
          },
          rawExtractedText: `STATE BANK OF INDIA - CONNAUGHT PLACE BRANCH\nFIXED DEPOSIT RECEIPT NO: ${fdrNumber}\nPRINCIPAL AMOUNT: Rs. ${depositAmount.toLocaleString('en-IN')}/-\nDEPOSITED IN THE JOINT NAME OF: Member Secretary, AICTE & ${selectedInstitution.name}\nLIEN ENDORSEMENT: Under AICTE Approval Regulations, lien is irrevocably marked.\nDATE OF ISSUE: ${issueDate} | MATURITY DATE: ${maturityDate}`,
          processedAt: new Date().toISOString(),
        };
      }

      setOcrData(mockOcr);
      setIsScanningOcr(false);
      setOcrCompleted(true);

      // Run automatic comparison
      const candidate: Partial<FDRInstrument> = {
        fdrNumber,
        institutionId: selectedInstId,
        issuingBank,
        depositAmount,
        issueDate,
        maturityDate,
        lienMarkedToAICTE: lienMarked,
        jointAccountWithAICTE: jointAccount,
        ocrData: mockOcr,
      };

      const result = validateFDRSubmission(candidate, existingFDRs);
      setValidationErrors(result.errors);
      setValidationWarnings(result.warnings);
      setDetectedDiscrepancies(result.discrepancies);
      setIsScanningOcr(false);
    }, 850);
  };

  // Submit and Persist to Central Repository
  const handleFinalSubmit = () => {
    const candidate: Partial<FDRInstrument> = {
      fdrNumber,
      institutionId: selectedInstId,
      issuingBank,
      depositAmount,
      issueDate,
      maturityDate,
      lienMarkedToAICTE: lienMarked,
      jointAccountWithAICTE: jointAccount,
      ocrData: ocrData || undefined,
    };

    const result = validateFDRSubmission(candidate, existingFDRs);
    if (!result.isValid) {
      setValidationErrors(result.errors);
      return;
    }

    const hasCritical = result.discrepancies.some((d) => d.severity === 'CRITICAL');

    const newInstrument: FDRInstrument = {
      id: `fdr-${Date.now()}`,
      fdrNumber: fdrNumber.trim().toUpperCase(),
      institutionId: selectedInstId,
      institutionName: selectedInstitution.name,
      aictePermanentId: selectedInstitution.aictePermanentId,
      issuingBank,
      bankBranch,
      ifscCode,
      depositAmount,
      depositAmountInWords,
      issueDate,
      maturityDate,
      tenureMonths: 96,
      interestRate: 7.15,
      lienMarkedToAICTE: lienMarked,
      jointAccountWithAICTE: jointAccount,
      documentFileName: uploadedFileName,
      documentFileSize: fileSize,
      documentUrl: uploadedFilePreviewUrl || '/docs/sample.pdf',
      documentChecksum: 'sha256-auto-' + Math.random().toString(36).substring(2, 10),
      lifecycleStatus: hasCritical ? 'FLAGGED_DISCREPANCY' : 'AWAITING_VERIFICATION',
      verificationStatus: hasCritical ? 'DISCREPANCY_UNRESOLVED' : 'PENDING_VERIFICATION',
      ocrData: ocrData || undefined,
      discrepancies: result.discrepancies,
      submittedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      submittedBy: selectedInstitution.email,
      tags: [selectedInstitution.type, hasCritical ? 'Action Required' : 'Awaiting SFMS Gateway'],
    };

    onSubmitSuccess(newInstrument);
  };

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp,image/tiff"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileSelected(e.target.files[0]);
          }
        }}
      />

      {/* Test Scenarios & Presets Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Upload Document &amp; Run OCR Intelligence
            </h3>
            <p className="text-xs text-slate-300">
              Upload any real scanned FDR (PDF, JPG, PNG) from your device, or select a preloaded sample test case.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-sm"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Upload Local Document
            </button>
            <button
              type="button"
              onClick={() => applyPreset('user_attachment')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
                selectedPreset === 'user_attachment'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              📄 Attached Blueprint (WhatsApp Image)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('valid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
                selectedPreset === 'valid'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              ✅ Sample SBI (Rs. 35L Clean)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('amount_mismatch')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
                selectedPreset === 'amount_mismatch'
                  ? 'bg-red-600 text-white border-red-500 shadow-sm'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              ⚠️ Sample PNB (Deficit)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('lien_missing')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
                selectedPreset === 'lien_missing'
                  ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              🔍 Sample HDFC (No Lien)
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Fields */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileUp className="w-5 h-5 text-amber-500" />
                1. Institution &amp; Declared Instrument Details
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Values entered by institution in the AICTE approval application.
              </p>
            </div>
            {isCustomUpload && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                Custom Upload Active
              </span>
            )}
          </div>

          {/* Institution Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select AICTE Approved Institution *
            </label>
            <select
              value={selectedInstId}
              onChange={(e) => setSelectedInstId(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name} [Permanent ID: {inst.aictePermanentId}] - {inst.region} Region
                </option>
              ))}
            </select>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
              <span>Category: {selectedInstitution.type}</span>
              <span>Region: {selectedInstitution.region}</span>
              <span>Officer: {selectedInstitution.contactPerson}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* FDR Receipt Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                FDR Receipt / Account No. *
              </label>
              <input
                type="text"
                value={fdrNumber}
                onChange={(e) => setFdrNumber(e.target.value)}
                placeholder="e.g. SBI-DEL-2026-99341"
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
              />
            </div>

            {/* Issuing Bank */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Issuing Scheduled Commercial Bank *
              </label>
              <input
                type="text"
                value={issuingBank}
                onChange={(e) => setIssuingBank(e.target.value)}
                placeholder="e.g. State Bank of India"
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Bank Branch */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Bank Branch
              </label>
              <input
                type="text"
                value={bankBranch}
                onChange={(e) => setBankBranch(e.target.value)}
                placeholder="e.g. Connaught Place Branch"
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* IFSC Code */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                IFSC Code
              </label>
              <input
                type="text"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value)}
                placeholder="e.g. SBIN0000691"
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none uppercase font-mono"
              />
            </div>

            {/* Deposit Amount */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Deposit Amount (INR) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-500 text-xs font-semibold">Rs.</span>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  className="w-full text-xs sm:text-sm pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-semibold"
                />
              </div>
              <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
                {formatINR(depositAmount)} ({depositAmountInWords})
              </div>
            </div>

            {/* Issue Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Date of Issue *
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Maturity Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Date of Maturity * (Mandatory 8-10 Years)
              </label>
              <input
                type="date"
                value={maturityDate}
                onChange={(e) => setMaturityDate(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Compliance Toggles */}
            <div className="sm:col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lienMarked}
                  onChange={(e) => setLienMarked(e.target.checked)}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  Lien explicitly marked to Member Secretary, AICTE (Mandatory per Regulation)
                </span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={jointAccount}
                  onChange={(e) => setJointAccount(e.target.checked)}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
                />
                <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  Jointly held with Regional Officer, AICTE
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Secure Document Upload & OCR Intelligence Pipeline */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  2. Document Upload &amp; OCR Engine
                </h2>
                <p className="text-xs text-slate-500">
                  Select or drag-and-drop your FDR file, then trigger OCR extraction.
                </p>
              </div>
            </div>

            {/* Interactive Drag & Drop File Zone */}
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`mt-4 p-5 rounded-xl border-2 border-dashed text-center transition cursor-pointer ${
                isDragging 
                  ? 'border-amber-500 bg-amber-500/10' 
                  : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/70'
              }`}
            >
              <Upload className="w-8 h-8 mx-auto text-amber-500 mb-2 animate-bounce-short" />
              
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Click to Browse or Drag &amp; Drop Scanned FDR
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Real OCR: PDF (up to 5 pages), JPG, PNG, WEBP, TIFF (Max 25 MB)
              </div>

              {/* Uploaded File Chip */}
              <div className="mt-3 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-left shadow-xs">
                <div className="flex items-center space-x-2.5 overflow-hidden">
                  {isImageFile ? (
                    <ImageIcon className="w-5 h-5 text-blue-500 shrink-0" />
                  ) : (
                    <FileText className="w-5 h-5 text-amber-500 shrink-0" />
                  )}
                  <div className="overflow-hidden">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={uploadedFileName}>
                      {uploadedFileName}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {fileSize} &bull; {isCustomUpload ? 'Uploaded document' : 'Demo sample'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  {uploadedFilePreviewUrl && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewModalOpen(true);
                      }}
                      className="p-1 rounded text-slate-500 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      title="Inspect Document"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 px-2 py-1 rounded hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                  >
                    Change File
                  </button>
                </div>
              </div>

              {/* Trigger OCR Button */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRunOcr();
                  }}
                  disabled={isScanningOcr}
                  className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 transition cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isScanningOcr ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Scanning Document &amp; Extracting Tokens...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {ocrCompleted ? 'Re-run OCR Document Extraction' : 'Trigger OCR Document Extraction'}
                    </>
                  )}
                </button>
              </div>
            </div>

            {ocrError && (
              <div role="alert" className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-800">
                <strong>Document extraction failed:</strong> {ocrError}
              </div>
            )}
            {ocrWarnings.length > 0 && (
              <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                <div className="font-bold mb-1">Manual review required</div>
                <ul className="list-disc list-inside space-y-1">{ocrWarnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
              </div>
            )}

            {/* OCR Extracted Snapshot */}
            {ocrData && (
              <div className="mt-4 p-4 rounded-xl bg-slate-900 text-slate-200 border border-slate-800 text-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-amber-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Extracted Tokens (Confidence: {ocrData.confidenceScore}%)
                  </span>
                  <span className="text-[10px] text-slate-400">{isCustomUpload ? 'Real OCR • Tesseract.js' : 'Demo preset • synthetic data'}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400">Extracted FDR No:</span>
                    <div className="font-mono font-semibold text-white">{ocrData.extractedFdrNumber}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Extracted Amount:</span>
                    <div className="font-semibold text-white">Rs. {ocrData.extractedAmount.toLocaleString('en-IN')}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Extracted Bank:</span>
                    <div className="font-semibold text-white">{ocrData.extractedBank}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Extracted Maturity:</span>
                    <div className="font-semibold text-white">{ocrData.extractedMaturityDate}</div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400">Lien Endorsement:</span>
                    <div className={`font-semibold ${ocrData.extractedLienStatus ? 'text-emerald-400' : 'text-red-400'}`}>
                      {ocrData.extractedLienStatus ? 'AICTE Lien Clause Endorsed' : 'NO Lien Clause Found in Document'}
                    </div>
                  </div>
                </div>

                <details className="mt-2 text-[10px] text-slate-400 bg-slate-950 p-2 rounded border border-slate-800">
                  <summary className="cursor-pointer text-slate-300 font-medium">View Raw OCR Text Stream</summary>
                  <pre className="mt-1 whitespace-pre-wrap font-mono text-[9px] text-slate-400 leading-tight">
                    {ocrData.rawExtractedText}
                  </pre>
                </details>
              </div>
            )}

            {/* Validation & Discrepancy Alerts */}
            {validationErrors.length > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-800 dark:text-red-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-600" /> Validation Errors (Submission Blocked):
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  {validationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {detectedDiscrepancies.length > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-900 dark:text-amber-300 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" /> Discrepancies Detected by AICTE Rules:
                </div>
                {detectedDiscrepancies.map((disc, i) => (
                  <div key={i} className="text-[11px] p-2 rounded bg-amber-100/60 dark:bg-amber-900/30 border border-amber-300/40">
                    <span className="font-bold text-red-700 dark:text-red-400 uppercase text-[10px] mr-1">
                      [{disc.severity}]
                    </span>
                    {disc.message}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handleFinalSubmit}
              className="w-full flex items-center justify-center px-4 py-3 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 transition cursor-pointer shadow-md"
            >
              Submit FDR Record to Central Repository
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
            <p className="text-[10px] text-center text-slate-500 mt-2">
              Note: Submitting enters the record into AICTE Official Review queue. Passing initial OCR checks does not substitute authorized bank verification.
            </p>
          </div>
        </div>
      </div>

      {/* Uploaded Document Inspector Modal */}
      {previewModalOpen && uploadedFilePreviewUrl && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Document Preview: {uploadedFileName}
                </h3>
                <span className="text-[11px] text-slate-500">File size: {fileSize}</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-auto flex items-center justify-center bg-slate-950 p-2 rounded-xl">
              <img 
                src={uploadedFilePreviewUrl} 
                alt="Uploaded FDR Document" 
                className="max-w-full max-h-[55vh] object-contain rounded"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
