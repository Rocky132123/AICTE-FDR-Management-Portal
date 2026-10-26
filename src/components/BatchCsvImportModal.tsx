/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * AICTE Security Deposit & FDR Management Portal
 * Batch CSV Import & Institutional Validation Modal
 */

import React, { useState, useRef } from 'react';
import { 
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, X, 
  Download, FileCheck, RefreshCw, AlertCircle, ShieldCheck, 
  ArrowRight, Building, FileText, Check, HelpCircle
} from 'lucide-react';
import { FDRInstrument, Institution } from '../types/fdr';
import { 
  validateBatchFdrImport, 
  generateCsvTemplate, 
  BatchImportResult 
} from '../logic/csvBatchImport';
import { triggerCSVDownload } from '../logic/exportReports';
import { formatINR } from '../logic/validation';

interface BatchCsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  institutions: Institution[];
  existingInstruments: FDRInstrument[];
  onImportBatch: (newInstruments: FDRInstrument[]) => void;
}

export const BatchCsvImportModal: React.FC<BatchCsvImportModalProps> = ({
  isOpen,
  onClose,
  institutions,
  existingInstruments,
  onImportBatch,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rawCsvText, setRawCsvText] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [validationResult, setValidationResult] = useState<BatchImportResult | null>(null);
  const [filterView, setFilterView] = useState<'ALL' | 'VALID' | 'ERRORS'>('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    const templateContent = generateCsvTemplate(institutions);
    triggerCSVDownload(templateContent, 'AICTE_FDR_Batch_Import_Template.csv');
  };

  const processCsvFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRawCsvText(text);
      const result = validateBatchFdrImport(text, institutions, existingInstruments);
      setValidationResult(result);
      if (result.errorCount > 0 && result.validCount === 0) {
        setFilterView('ERRORS');
      } else {
        setFilterView('ALL');
      }
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processCsvFile(file);
    }
  };

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
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      processCsvFile(file);
    }
  };

  const handleLoadDemoData = () => {
    const demoContent = generateCsvTemplate(institutions);
    setFileName('AICTE_Approved_Demo_Batch.csv');
    setRawCsvText(demoContent);
    const result = validateBatchFdrImport(demoContent, institutions, existingInstruments);
    setValidationResult(result);
    setFilterView('ALL');
  };

  const handleConfirmImport = () => {
    if (!validationResult || validationResult.validInstruments.length === 0) return;
    setIsSubmitting(true);
    setTimeout(() => {
      onImportBatch(validationResult.validInstruments);
      setIsSubmitting(false);
      onClose();
    }, 400);
  };

  const displayedRows = (validationResult?.rows || []).filter((r) => {
    if (filterView === 'VALID') return r.isValid;
    if (filterView === 'ERRORS') return !r.isValid;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white rounded-2xl max-w-5xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="csv-modal-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold shadow-xs">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 id="csv-modal-title" className="text-base sm:text-lg font-bold text-slate-900">
                  Batch CSV Import &amp; Institutional Registration
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-950 uppercase tracking-wide border border-amber-200">
                  Statutory Intake
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Bulk register FDR instruments with real-time validation against the approved AICTE institution registry.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
            aria-label="Close batch import modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 bg-white">
          {/* Action guidance & template download */}
          <div className="bg-orange-50/80 p-4 rounded-xl border border-orange-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start space-x-3 max-w-2xl">
              <Building className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-800 space-y-1">
                <p className="font-bold text-slate-900">
                  Institutional Validation Requirement:
                </p>
                <p className="text-slate-700">
                  Each row must include a valid <code className="px-1.5 py-0.5 bg-white border border-orange-200 rounded font-mono font-bold text-orange-800">aictePermanentId</code> (e.g., <code className="font-mono">1-10928374</code>) corresponding to an approved technical institution.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 mr-1.5 text-orange-600" />
                Download CSV Template
              </button>
              <button
                type="button"
                onClick={handleLoadDemoData}
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-100 hover:bg-orange-200 text-orange-950 border border-orange-300 transition cursor-pointer shadow-2xs"
              >
                <FileCheck className="w-3.5 h-3.5 mr-1.5 text-orange-600" />
                Load Sample Data
              </button>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
              isDragging
                ? 'border-orange-500 bg-orange-50/50'
                : 'border-slate-300 hover:border-orange-400 hover:bg-orange-50/20'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-900">
                {fileName ? (
                  <span className="text-orange-800 font-bold">{fileName}</span>
                ) : (
                  'Click to upload or drag & drop CSV file'
                )}
              </p>
              <p className="text-xs text-slate-500">
                Supports RFC 4180 standard CSV formats (UTF-8 encoding recommended)
              </p>
            </div>
          </div>

          {/* Validation Analysis Summary */}
          {validationResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">Total Rows</p>
                    <p className="text-xl font-bold text-slate-900">{validationResult.totalRows}</p>
                  </div>
                  <FileText className="w-7 h-7 text-slate-400" />
                </div>

                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/70 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Valid &amp; Approved</p>
                    <p className="text-xl font-bold text-emerald-900">{validationResult.validCount}</p>
                  </div>
                  <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                </div>

                <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  validationResult.errorCount > 0
                    ? 'border-red-200 bg-red-50/70'
                    : 'border-slate-200 bg-slate-50'
                }`}>
                  <div>
                    <p className={`text-[11px] font-semibold uppercase tracking-wider ${
                      validationResult.errorCount > 0 ? 'text-red-800' : 'text-slate-600'
                    }`}>
                      Validation Errors
                    </p>
                    <p className={`text-xl font-bold ${
                      validationResult.errorCount > 0 ? 'text-red-900' : 'text-slate-900'
                    }`}>
                      {validationResult.errorCount}
                    </p>
                  </div>
                  <AlertTriangle className={`w-7 h-7 ${
                    validationResult.errorCount > 0 ? 'text-red-600' : 'text-slate-400'
                  }`} />
                </div>
              </div>

              {/* Filter Tabs for Preview */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => setFilterView('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                      filterView === 'ALL'
                        ? 'bg-orange-600 text-white font-bold shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    All Records ({validationResult.totalRows})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterView('VALID')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                      filterView === 'VALID'
                        ? 'bg-emerald-600 text-white font-bold shadow-xs'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    Valid Only ({validationResult.validCount})
                  </button>
                  {validationResult.errorCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterView('ERRORS')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                        filterView === 'ERRORS'
                          ? 'bg-red-600 text-white font-bold shadow-xs'
                          : 'bg-red-50 text-red-800 border border-red-200 hover:bg-red-100'
                      }`}
                    >
                      Errors Only ({validationResult.errorCount})
                    </button>
                  )}
                </div>

                <span className="text-[11px] text-slate-500 font-medium">
                  Showing {displayedRows.length} of {validationResult.totalRows} parsed entries
                </span>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 sticky top-0 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Line #</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">FDR Number</th>
                      <th className="py-2.5 px-3">Institution / AICTE ID</th>
                      <th className="py-2.5 px-3">Bank &amp; Branch</th>
                      <th className="py-2.5 px-3 text-right">Amount (INR)</th>
                      <th className="py-2.5 px-3">Maturity Date</th>
                      <th className="py-2.5 px-3">Validation Diagnostics</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {displayedRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-slate-500 font-medium">
                          No rows match the selected filter.
                        </td>
                      </tr>
                    ) : (
                      displayedRows.map((row) => (
                        <tr 
                          key={row.rowNumber} 
                          className={row.isValid ? 'hover:bg-slate-50/80 text-slate-800' : 'bg-red-50/50 text-slate-800'}
                        >
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                            {row.rowNumber}
                          </td>
                          <td className="py-2 px-3">
                            {row.isValid ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <Check className="w-3 h-3 mr-1" /> Valid
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                                <X className="w-3 h-3 mr-1" /> Error
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-900 font-mono">
                            {row.rawRecord.fdrNumber || '<Missing>'}
                          </td>
                          <td className="py-2 px-3">
                            {row.instrument ? (
                              <div>
                                <p className="font-semibold text-slate-900 line-clamp-1">{row.instrument.institutionName}</p>
                                <p className="font-mono text-[10px] text-slate-600">AICTE: {row.instrument.aictePermanentId}</p>
                              </div>
                            ) : (
                              <span className="text-red-700 font-mono text-[11px] font-semibold">
                                {row.rawRecord.aictePermanentId || row.rawRecord.institutionName || '<Missing ID>'}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <p className="text-slate-900 font-medium">{row.rawRecord.issuingBank || '<Missing>'}</p>
                            <p className="text-[10px] text-slate-500">{row.rawRecord.bankBranch || 'Main Branch'}</p>
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            {row.instrument ? formatINR(row.instrument.depositAmount) : (row.rawRecord.depositAmount || '0')}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-800">
                            {row.rawRecord.maturityDate || '-'}
                          </td>
                          <td className="py-2 px-3">
                            {row.errors.length > 0 ? (
                              <div className="space-y-1">
                                {row.errors.map((err, i) => (
                                  <p key={i} className="text-[11px] text-red-700 font-semibold flex items-center">
                                    <AlertCircle className="w-3 h-3 mr-1 shrink-0 text-red-600" />
                                    {err}
                                  </p>
                                ))}
                              </div>
                            ) : row.warnings.length > 0 ? (
                              <div className="space-y-0.5">
                                {row.warnings.map((warn, i) => (
                                  <p key={i} className="text-[10px] text-amber-800 font-medium flex items-center">
                                    <AlertTriangle className="w-2.5 h-2.5 mr-1 shrink-0 text-amber-600" />
                                    {warn}
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] text-emerald-700 font-semibold flex items-center">
                                <ShieldCheck className="w-3 h-3 mr-1 text-emerald-600" /> Approved for Intake
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            {validationResult ? (
              <span>
                Ready to commit: <strong className="text-emerald-800 font-bold">{validationResult.validCount} valid FDRs</strong>.
                {validationResult.errorCount > 0 && (
                  <span className="text-red-700 ml-1 font-semibold">({validationResult.errorCount} skipped due to validation failures)</span>
                )}
              </span>
            ) : (
              'Upload a CSV file or load sample data to begin.'
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!validationResult || validationResult.validCount === 0 || isSubmitting}
              onClick={handleConfirmImport}
              className="inline-flex items-center px-4 py-2 rounded-lg text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                  Registering Records...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Register {validationResult?.validCount || 0} Valid Records
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
