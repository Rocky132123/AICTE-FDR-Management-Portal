
import React, { useMemo, useState } from 'react';
import {
  Sparkles,
  FileText,
  Mail,
  Search,
  ShieldAlert,
  Copy,
  Info,
  MessageCircle,
} from 'lucide-react';

import type { FDRInstrument } from '../types/fdr';
import { formatINR } from '../logic/validation';

interface AIAssistantProps {
  instruments: FDRInstrument[];
}

type AssistantMode = 'summary' | 'reminder' | 'policy' | 'ask';

function dateDaysRemaining(dateText: string): number | null {
  if (!dateText) return null;

  const date = new Date(`${dateText}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) return null;

  const today = new Date();

  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  );

  return Math.ceil((date.getTime() - todayUtc) / 86400000);
}

function getUnresolved(instrument: FDRInstrument) {
  return instrument.discrepancies.filter((item) => !item.isResolved);
}

/**
 * Local FDR assistance based on records supplied by the portal.
 *
 * This component does not call a live LLM, verify bank authenticity,
 * or make regulatory decisions.
 */
export const AIAssistant: React.FC<AIAssistantProps> = ({
  instruments,
}) => {
  const [selectedId, setSelectedId] = useState(
    instruments[0]?.id ?? ''
  );

  const [mode, setMode] = useState<AssistantMode>('summary');
  const [question, setQuestion] = useState('');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const selected = useMemo(
    () => instruments.find((item) => item.id === selectedId),
    [instruments, selectedId]
  );

  const selectMode = (newMode: AssistantMode) => {
    setMode(newMode);
    setOutput('');
    setCopied(false);
  };

  const answerRecordQuestion = (): string => {
    if (!selected) {
      return 'Please select an FDR record before asking a question.';
    }

    const normalizedQuestion = question.trim().toLowerCase();

    if (!normalizedQuestion) {
      return 'Please enter a question about the selected FDR record.';
    }

    const unresolved = getUnresolved(selected);
    const days = dateDaysRemaining(selected.maturityDate);

    // FDR number
    if (
      /\bfdr\s*(number|no\.?|id|reference)\b/.test(normalizedQuestion) ||
      /\b(number|no\.?)\s+of\s+(this\s+)?fdr\b/.test(normalizedQuestion) ||
      /\bwhat\s+is\s+(the\s+)?fdr\b/.test(normalizedQuestion) ||
      /\bfdr number\b/.test(normalizedQuestion)
    ) {
      return [
        `FDR Number: ${selected.fdrNumber || 'Not recorded'}`,
        `Institution: ${selected.institutionName || 'Not recorded'}`,
        '',
        'Source: Selected FDR record in the portal.',
      ].join('\n');
    }

    // Institution
    if (
      /\binstitution\b|\bcollege\b|\buniversity\b|\bbelongs to\b/.test(
        normalizedQuestion
      )
    ) {
      return [
        `Institution: ${selected.institutionName || 'Not recorded'}`,
        `AICTE Permanent ID: ${selected.aictePermanentId || 'Not recorded'}`,
        '',
        'Source: Selected FDR record in the portal.',
      ].join('\n');
    }

    // Bank
    if (
      /\b(bank|bank name|issuing bank|branch|ifsc)\b/.test(
        normalizedQuestion
      )
    ) {
      return [
        `Issuing Bank: ${selected.issuingBank || 'Not recorded'}`,
        `Bank Branch: ${selected.bankBranch || 'Not recorded'}`,
        `IFSC Code: ${selected.ifscCode || 'Not recorded'}`,
        '',
        'Source: Selected FDR record in the portal.',
      ].join('\n');
    }

    // Deposit amount
    if (
      /\b(amount|deposit|value|money|principal)\b/.test(
        normalizedQuestion
      )
    ) {
      return [
        `Deposit Amount: ${formatINR(selected.depositAmount)}`,
        `Amount in Words: ${selected.depositAmountInWords || 'Not recorded'}`,
        '',
        'Source: Selected FDR record in the portal.',
      ].join('\n');
    }

    // Issue date
    if (
      /\b(issue date|issued on|start date|date of issue)\b/.test(
        normalizedQuestion
      )
    ) {
      return [
        `Issue Date: ${selected.issueDate || 'Not recorded'}`,
        '',
        'Source: Selected FDR record in the portal.',
      ].join('\n');
    }

    // Maturity date and time remaining
    if (
      /\b(maturity|mature|expiry|expire|due date|days remaining|when.*mature)\b/.test(
        normalizedQuestion
      )
    ) {
      let maturityStatus: string;

      if (days === null) {
        maturityStatus = 'The maturity date is missing or invalid.';
      } else if (days < 0) {
        maturityStatus = `The recorded maturity date was ${Math.abs(days)} day(s) ago.`;
      } else if (days === 0) {
        maturityStatus = 'The recorded maturity date is today.';
      } else {
        maturityStatus = `There are ${days} day(s) until the recorded maturity date.`;
      }

      return [
        `Maturity Date: ${selected.maturityDate || 'Not recorded'}`,
        maturityStatus,
        '',
        'Source: Selected FDR record in the portal. Dates have not been independently verified.',
      ].join('\n');
    }

    // Lifecycle and verification status
    if (
      /\b(status|lifecycle|verification|verified|active|flagged)\b/.test(
        normalizedQuestion
      )
    ) {
      return [
        `Lifecycle Status: ${selected.lifecycleStatus || 'Not recorded'}`,
        `Verification Status: ${selected.verificationStatus || 'Not recorded'}`,
        '',
        'Source: Selected FDR record in the portal.',
        'A status displayed in the portal is not proof of bank authenticity.',
      ].join('\n');
    }

    // Lien and joint account
    if (/\blien\b|\bjoint account\b/.test(normalizedQuestion)) {
      return [
        `Lien marked to AICTE: ${selected.lienMarkedToAICTE ? 'Yes in portal record' : 'No in portal record'}`,
        `Joint account with AICTE: ${selected.jointAccountWithAICTE ? 'Yes in portal record' : 'No in portal record'}`,
        '',
        'Source: Selected FDR record in the portal. These values have not been independently verified.',
      ].join('\n');
    }

    // Discrepancies
    if (
      /\b(discrepanc|mismatch|issue|problem|error|unresolved)\b/.test(
        normalizedQuestion
      )
    ) {
      if (unresolved.length === 0) {
        return [
          'No unresolved discrepancies are currently recorded for this FDR.',
          '',
          'Source: Selected FDR record in the portal.',
          'This does not guarantee that the instrument is error-free.',
        ].join('\n');
      }

      return [
        `Unresolved Discrepancies: ${unresolved.length}`,
        ...unresolved.map(
          (item, index) =>
            `${index + 1}. ${item.field}: ${item.message} Declared: ${String(item.declaredValue)}. Extracted: ${String(item.extractedValue)}.`
        ),
        '',
        'Source: Discrepancy information recorded in the portal.',
      ].join('\n');
    }

    // General record overview
    if (
      /\b(details|information|tell me about|overview|summari[sz]e)\b/.test(
        normalizedQuestion
      )
    ) {
      return [
        `FDR Number: ${selected.fdrNumber || 'Not recorded'}`,
        `Institution: ${selected.institutionName || 'Not recorded'}`,
        `Bank: ${selected.issuingBank || 'Not recorded'}`,
        `Deposit Amount: ${formatINR(selected.depositAmount)}`,
        `Issue Date: ${selected.issueDate || 'Not recorded'}`,
        `Maturity Date: ${selected.maturityDate || 'Not recorded'}`,
        `Lifecycle Status: ${selected.lifecycleStatus || 'Not recorded'}`,
        `Verification Status: ${selected.verificationStatus || 'Not recorded'}`,
        `Unresolved Discrepancies: ${unresolved.length}`,
        '',
        'Source: Selected FDR record in the portal.',
      ].join('\n');
    }

    return [
      "I couldn't identify the requested information from that question.",
      '',
      'Try asking one of these questions:',
      '• What is the FDR Number?',
      '• Which bank issued this FDR?',
      '• What is the deposit amount?',
      '• When does this FDR mature?',
      '• What is the current status?',
      '• Are there any discrepancies?',
      '• Tell me about this FDR.',
      '',
      'Answers are generated from the selected record, not from a live AI model.',
    ].join('\n');
  };

  const generate = () => {
    setCopied(false);

    if (mode === 'policy') {
      setOutput(
        [
          'No approved regulatory policy documents are configured in this project yet.',
          '',
          'To prevent invented requirements, policy questions require verified AICTE circulars, rules, or SOPs with traceable document titles, page/section references, and quoted evidence.',
          '',
          `Your question: ${question.trim() || '(no question entered)'}`,
          '',
          'Live LLM/RAG is not configured.',
        ].join('\n')
      );

      return;
    }

    if (mode === 'ask') {
      setOutput(answerRecordQuestion());
      return;
    }

    if (!selected) {
      setOutput('Select an FDR record first.');
      return;
    }

    const unresolved = getUnresolved(selected);
    const days = dateDaysRemaining(selected.maturityDate);

    if (mode === 'summary') {
      let maturityText: string;

      if (days === null) {
        maturityText = 'Maturity date is missing or invalid.';
      } else if (days < 0) {
        maturityText = `Matured ${Math.abs(days)} day(s) ago.`;
      } else if (days === 0) {
        maturityText = 'Matures today.';
      } else {
        maturityText = `Matures in ${days} day(s).`;
      }

      const discrepancyText = unresolved.length
        ? unresolved
            .map(
              (item, index) =>
                `${index + 1}. ${item.field}: ${item.message} (declared: ${String(item.declaredValue)}; extracted: ${String(item.extractedValue)}).`
            )
            .join('\n')
        : 'No unresolved discrepancies are currently recorded.';

      setOutput(
        [
          `FDR CASE SUMMARY: ${selected.fdrNumber}`,
          `Institution: ${selected.institutionName} (${selected.aictePermanentId})`,
          `Bank: ${selected.issuingBank}${selected.bankBranch ? `, ${selected.bankBranch}` : ''}`,
          `Deposit amount: ${formatINR(selected.depositAmount)}`,
          `Issue date: ${selected.issueDate || 'Not recorded'}`,
          `Maturity: ${selected.maturityDate || 'Not recorded'} (${maturityText})`,
          `Lifecycle status: ${selected.lifecycleStatus}`,
          `Verification status: ${selected.verificationStatus}`,
          `Lien marked to AICTE: ${selected.lienMarkedToAICTE ? 'Yes in portal record' : 'No in portal record'}`,
          `Joint account: ${selected.jointAccountWithAICTE ? 'Yes in portal record' : 'No in portal record'}`,
          `Unresolved discrepancies (${unresolved.length}):`,
          discrepancyText,
          '',
          'Recommended human review: compare extracted values against the original instrument and independently verify authenticity with the issuing bank. This summary is decision support, not proof of genuineness or authorization to release funds.',
        ].join('\n')
      );

      return;
    }

    const dueDate = selected.maturityDate || '[maturity date]';

    setOutput(
      [
        `Subject: Action required for FDR ${selected.fdrNumber}`,
        '',
        `Dear ${selected.institutionName || 'Institution Representative'},`,
        '',
        `This is a reminder to review the Fixed Deposit Receipt (FDR) ${selected.fdrNumber} held with ${selected.issuingBank}. The maturity date recorded in the portal is ${dueDate}.`,
        days === null
          ? 'Please confirm the current maturity date and submit any required supporting documents.'
          : days < 0
            ? `The portal records this FDR as matured ${Math.abs(days)} day(s) ago. Please provide an update on renewal or release processing and the relevant supporting documents.`
            : `The portal records ${days} day(s) remaining until maturity. Please initiate the applicable review and provide required supporting documents in advance.`,
        unresolved.length
          ? `The portal also records ${unresolved.length} unresolved discrepancy/discrepancies. Please review these items: ${unresolved.map((item) => item.field).join(', ')}.`
          : '',
        '',
        'Please treat this message as a draft for authorized staff review. Confirm the record and applicable procedures before sending.',
        '',
        'Regards,',
        'AICTE FDR Management Portal',
      ]
        .filter(Boolean)
        .join('\n')
    );
  };

  const copyOutput = async () => {
    if (!output) return;

    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-violet-500/20 p-3 text-violet-300">
            <Sparkles className="h-6 w-6" />
          </span>

          <div>
            <h2 className="text-xl font-bold">AI FDR Case Assistant</h2>

            <p className="mt-1 max-w-3xl text-sm text-slate-300">
              Ask questions about portal records, generate case summaries,
              and prepare reminder drafts. Regulatory policy answers require
              approved source documents.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-bold text-slate-900">Choose assistance</h3>

          <div className="mt-4 space-y-4">
            <label className="block text-sm font-semibold text-slate-700">
              FDR record

              <select
                value={selectedId}
                onChange={(event) => {
                  setSelectedId(event.target.value);
                  setOutput('');
                  setCopied(false);
                }}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal"
              >
                <option value="">Select an FDR</option>

                {instruments.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.fdrNumber} · {item.institutionName}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => selectMode('ask')}
                className={`rounded-lg border p-3 text-left text-sm font-semibold ${
                  mode === 'ask'
                    ? 'border-violet-500 bg-violet-50 text-violet-800'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <MessageCircle className="mb-2 h-4 w-4" />
                Ask FDR Questions
              </button>

              <button
                type="button"
                onClick={() => selectMode('summary')}
                className={`rounded-lg border p-3 text-left text-sm font-semibold ${
                  mode === 'summary'
                    ? 'border-violet-500 bg-violet-50 text-violet-800'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <FileText className="mb-2 h-4 w-4" />
                Case Summary
              </button>

              <button
                type="button"
                onClick={() => selectMode('reminder')}
                className={`rounded-lg border p-3 text-left text-sm font-semibold ${
                  mode === 'reminder'
                    ? 'border-violet-500 bg-violet-50 text-violet-800'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Mail className="mb-2 h-4 w-4" />
                Reminder Draft
              </button>

              <button
                type="button"
                onClick={() => selectMode('policy')}
                className={`rounded-lg border p-3 text-left text-sm font-semibold ${
                  mode === 'policy'
                    ? 'border-violet-500 bg-violet-50 text-violet-800'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Search className="mb-2 h-4 w-4" />
                Policy Q&amp;A
              </button>
            </div>

            {mode === 'ask' && (
              <label className="block text-sm font-semibold text-slate-700">
                Ask a question about the selected FDR

                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      event.key === 'Enter' &&
                      !event.shiftKey &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      generate();
                    }
                  }}
                  rows={3}
                  placeholder="Example: What is the FDR Number?"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />

                <span className="mt-2 block text-xs font-normal text-slate-500">
                  Try: FDR number, bank, deposit amount, maturity date,
                  status, or discrepancies.
                </span>
              </label>
            )}

            {mode === 'policy' && (
              <label className="block text-sm font-semibold text-slate-700">
                Question about an approved policy

                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  rows={3}
                  placeholder="Ask about a requirement, approval step, or supporting document..."
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>
            )}

            <button
              type="button"
              onClick={generate}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-sm font-bold text-white hover:bg-violet-700"
            >
              <Sparkles className="h-4 w-4" />
              Generate assistance
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold text-slate-900">Review output</h3>

            <button
              type="button"
              onClick={copyOutput}
              disabled={!output}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          {output ? (
            <pre className="mt-4 max-h-[520px] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 font-sans text-sm leading-6 text-slate-700">
              {output}
            </pre>
          ) : (
            <div className="mt-4 flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
              <Sparkles className="mb-3 h-8 w-8 text-violet-500" />
              Select an assistance type and generate a response for review.
            </div>
          )}

          <div className="mt-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />

            <p>
              Decision support only. Answers use portal records and are not
              independent proof of document authenticity. This assistant
              does not authorize a release or refund.
            </p>
          </div>

          <div className="mt-3 flex gap-2 text-xs text-slate-500">
            <Info className="h-4 w-4 shrink-0" />

            <p>
              Basic record questions are answered locally from the selected
              FDR. Live LLM/RAG is not configured. Policy responses require
              approved documents with traceable citations.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

