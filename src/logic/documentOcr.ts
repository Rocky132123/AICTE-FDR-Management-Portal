import { createWorker } from 'tesseract.js';
import type { OcrExtractionData } from '../types/fdr';

export interface OcrWordEvidence {
  text: string;
  confidence: number;
  page: number;
  /** OCR bounding box in pixels on the rendered page/image, when provided by Tesseract. */
  bbox?: { x0: number; y0: number; x1: number; y1: number };
}

export interface DocumentOcrResult {
  data: OcrExtractionData;
  warnings: string[];
  words: OcrWordEvidence[];
  /** Word-level evidence matched to extracted fields for reviewer traceability. */
  fieldEvidence: Record<string, OcrWordEvidence[]>;
}

type OcrWord = {
  text?: string;
  confidence?: number;
  bbox?: { x0: number; y0: number; x1: number; y1: number };
};

type OcrResultData = {
  text?: string;
  confidence?: number;
  words?: OcrWord[];
};

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_PDF_PAGES = 5;

function normalizeDate(raw: string | undefined): string {
  if (!raw) return '';

  const value = raw.trim().replace(/[.]/g, '/').replace(/-/g, '/');

  let match = value.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);

  if (match) {
    const a = Number(match[1]);
    const b = Number(match[2]);
    const year = Number(match[3]);

    // Prefer DD/MM/YYYY for Indian bank documents.
    // If impossible, try MM/DD/YYYY.
    let day = a;
    let month = b;

    if (a <= 12 && b > 12) {
      month = a;
      day = b;
    }

    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    ) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  match = raw.match(
    /\b(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})\b/i
  );

  if (match) {
    const monthNames = [
      'jan', 'feb', 'mar', 'apr', 'may', 'jun',
      'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
    ];

    const month =
      monthNames.indexOf(match[2].slice(0, 3).toLowerCase()) + 1;

    const day = Number(match[1]);
    const year = Number(match[3]);

    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      month > 0 &&
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    ) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  return '';
}

function findValue(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return match[1].trim().replace(/[|]+$/g, '').trim();
    }
  }

  return '';
}

function parseAmount(text: string): number {
  const raw = findValue(text, [
    /(?:principal\s+amount|deposit\s+amount|amount|sum\s+of\s+rupees|value)\s*[:\-]?\s*(?:inr|rs\.?|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    /(?:inr|rs\.?|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
  ]);

  if (!raw) return 0;

  const value = Number(raw.replace(/,/g, ''));

  return Number.isFinite(value) ? value : 0;
}

function parseFields(
  text: string,
  meanConfidence: number,
  words: OcrWordEvidence[],
  pageCount: number
): DocumentOcrResult {
  const clean = text.replace(/\r/g, '\n').replace(/[\t ]+/g, ' ');

  const bankCandidates = [
    'State Bank of India',
    'Punjab National Bank',
    'Bank of Baroda',
    'Canara Bank',
    'Union Bank of India',
    'Bank of India',
    'Indian Bank',
    'Central Bank of India',
    'HDFC Bank',
    'ICICI Bank',
    'Axis Bank',
    'Kotak Mahindra Bank',
    'IDFC FIRST Bank',
    'Example Test Bank',
  ];

  const bank =
    bankCandidates.find((name) => {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(escapedName, 'i').test(clean);
    }) ||
    findValue(clean, [
      /(?:issuing\s+bank|bank\s+name)\s*[:\-]\s*([^\n]+)/i,
    ]);

  const fdrNumber = findValue(clean, [
    /(?:fdr\s*(?:no\.?|number|receipt\s*no\.?|receipt\s*number)|fixed\s+deposit\s+(?:receipt\s*)?(?:no\.?|number)|deposit\s+receipt\s*(?:no\.?|number))\s*[:#\-]?\s*([A-Z0-9][A-Z0-9\/\-]{3,})/i,
    /(?:instrument\s*(?:no\.?|number))\s*[:#\-]?\s*([A-Z0-9][A-Z0-9\/\-]{3,})/i,
  ]);

  const amount = parseAmount(clean);

  const issueRaw = findValue(clean, [
    /(?:date\s+of\s+issue|issue\s+date|date\s+of\s+deposit)\s*[:\-]?\s*([0-9]{1,2}[\/-][0-9]{1,2}[\/-][0-9]{4}|[0-9]{1,2}\s+[A-Za-z]{3,9}\s+[0-9]{4})/i,
  ]);

  const maturityRaw = findValue(clean, [
    /(?:maturity\s+date|date\s+of\s+maturity|matures\s+on|due\s+date)\s*[:\-]?\s*([0-9]{1,2}[\/-][0-9]{1,2}[\/-][0-9]{4}|[0-9]{1,2}\s+[A-Za-z]{3,9}\s+[0-9]{4})/i,
  ]);

  const lienMentioned =
    /\b(lien|marked in favour|marked in favor|member secretary.{0,30}aict(e|e))\b/i.test(clean);

  const lienNegative =
    /\b(no lien|without lien|lien not marked|lien not recorded|no lien recorded)\b/i.test(clean);

  const jointMentioned =
    /\b(joint name|joint account|member secretary.{0,40}aict(e|e))\b/i.test(clean);

  const issueDate = normalizeDate(issueRaw);
  const maturityDate = normalizeDate(maturityRaw);

  const warnings: string[] = [];

  if (!fdrNumber) {
    warnings.push(
      'FDR number was not confidently identified. Enter or verify it manually.'
    );
  }

  if (!bank) {
    warnings.push(
      'Bank name was not identified with the supported patterns. Verify it manually.'
    );
  }

  if (!amount) {
    warnings.push(
      'Deposit amount was not identified. Verify the amount manually.'
    );
  }

  if (!issueDate) {
    warnings.push(
      'Issue date was not identified in a supported format.'
    );
  }

  if (!maturityDate) {
    warnings.push(
      'Maturity date was not identified in a supported format.'
    );
  }

  if (!lienMentioned) {
    warnings.push(
      'No clear lien endorsement text was detected. This is not proof that a lien is absent.'
    );
  }

  const avg =
    Math.round(Math.max(0, Math.min(100, meanConfidence)) * 10) / 10;

  const fieldConfidence = {
    fdrNumber: fdrNumber ? avg : 0,
    amount: amount ? avg : 0,
    bank: bank ? avg : 0,
    dates: issueDate && maturityDate ? avg : 0,
    lien: lienMentioned ? avg : 0,
  };

  const data: OcrExtractionData = {
    extractedFdrNumber: fdrNumber,
    extractedBank: bank,
    extractedBranch: findValue(clean, [
      /(?:branch|branch office)\s*[:\-]?\s*([^\n]+)/i,
    ]),
    extractedAmount: amount,
    extractedIssueDate: issueDate,
    extractedMaturityDate: maturityDate,
    extractedInterestRate:
      Number(
        findValue(clean, [
          /(?:interest\s+rate|rate\s+of\s+interest)\s*[:\-]?\s*([\d.]+)\s*%/i,
        ])
      ) || 0,
    extractedLienStatus: lienMentioned && !lienNegative,
    extractedJointAccount: jointMentioned,
    confidenceScore: avg,
    fieldConfidence,
    rawExtractedText: clean.slice(0, 30000),
    processedAt: new Date().toISOString(),
  };

  if (pageCount > 1) {
    warnings.push(
      `OCR processed ${pageCount} page(s). Confirm the extracted values against the original document.`
    );
  }

  const fieldValues: Record<string, string> = {
    fdrNumber,
    bank: String(bank || ''),
    amount: amount ? String(amount) : '',
    issueDate,
    maturityDate,
  };
  const fieldEvidence: Record<string, OcrWordEvidence[]> = {};
  for (const [field, value] of Object.entries(fieldValues)) {
    const normalizedTokens = value.toLowerCase().match(/[a-z0-9]+/g) ?? [];
    fieldEvidence[field] = normalizedTokens.flatMap((token) => {
      const matches = words.filter(
        (word) => word.text.toLowerCase().replace(/[^a-z0-9]/g, '') === token
      );
      return matches;
    });
  }

  return { data, warnings, words, fieldEvidence };
}

async function imageToCanvas(
  file: File
): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);

  try {
    const maxDimension = 2400;

    const scale = Math.min(
      1,
      maxDimension / Math.max(bitmap.width, bitmap.height)
    );

    const canvas = document.createElement('canvas');

    canvas.width = Math.max(
      1,
      Math.round(bitmap.width * scale)
    );

    canvas.height = Math.max(
      1,
      Math.round(bitmap.height * scale)
    );

    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error(
        'Could not initialize the image canvas for OCR.'
      );
    }

    ctx.drawImage(
      bitmap,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return canvas;
  } finally {
    bitmap.close();
  }
}

export async function extractFdrDocument(
  file: File
): Promise<DocumentOcrResult> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(
      'File exceeds the 25 MB OCR limit.'
    );
  }

  const isPdf =
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf');

  const isImage =
    file.type.startsWith('image/') ||
    /\.(png|jpe?g|webp|tiff?)$/i.test(file.name);

  if (!isPdf && !isImage) {
    throw new Error(
      'Unsupported file type. Upload a PDF, JPG, PNG, WEBP or TIFF document.'
    );
  }

  const worker = await createWorker('eng');

  const pageTexts: string[] = [];
  const words: OcrWordEvidence[] = [];

  let confidenceTotal = 0;
  let confidenceCount = 0;

  try {
    if (isPdf) {
      const pdfjs = await import('pdfjs-dist');
      const pdfjsWorker = await import(
        'pdfjs-dist/build/pdf.worker.mjs?url'
      );

      pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker.default;

      const pdf = await pdfjs.getDocument({
        data: await file.arrayBuffer(),
      }).promise;

      try {
        if (pdf.numPages > MAX_PDF_PAGES) {
          throw new Error(
            `This prototype processes up to ${MAX_PDF_PAGES} PDF pages per upload. Split the document and retry.`
          );
        }

        for (
          let pageNumber = 1;
          pageNumber <= pdf.numPages;
          pageNumber++
        ) {
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.8 });
          const canvas = document.createElement('canvas');

          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);

          try {
            const context = canvas.getContext('2d');

            if (!context) {
              throw new Error(
                `Could not render PDF page ${pageNumber}.`
              );
            }

            await page.render({
              canvas: null,
              canvasContext: context,
              viewport,
            }).promise;

            const result = await worker.recognize(canvas);
            const pageData = result.data as unknown as OcrResultData;
            const resultText = pageData.text ?? '';

            pageTexts.push(
              `--- PAGE ${pageNumber} ---\n${resultText}`
            );

            confidenceTotal += Number(pageData.confidence ?? 0);
            confidenceCount++;

            // Keep extracted text even if word-level OCR evidence is unavailable.
            const pageWords = Array.isArray(pageData.words)
              ? pageData.words
              : [];

            pageWords.forEach((word: OcrWord) => {
              words.push({
                text: word.text ?? '',
                confidence: Number(word.confidence ?? 0),
                page: pageNumber,
                ...(word.bbox ? { bbox: word.bbox } : {}),
              });
            });
          } finally {
            canvas.width = 0;
            canvas.height = 0;
          }
        }
      } finally {
        await pdf.destroy();
      }
    } else {
      const canvas = await imageToCanvas(file);

      try {
        const result = await worker.recognize(canvas);
        const imageData = result.data as unknown as OcrResultData;

        pageTexts.push(imageData.text ?? '');
        confidenceTotal = Number(imageData.confidence ?? 0);
        confidenceCount = 1;

        const imageWords = Array.isArray(imageData.words)
          ? imageData.words
          : [];

        imageWords.forEach((word: OcrWord) => {
          words.push({
            text: word.text ?? '',
            confidence: Number(word.confidence ?? 0),
            page: 1,
            ...(word.bbox ? { bbox: word.bbox } : {}),
          });
        });
      } finally {
        canvas.width = 0;
        canvas.height = 0;
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error(
      'An unexpected error occurred while processing the document.'
    );
  } finally {
    await worker.terminate();
  }

  const rawText = pageTexts.join('\n\n');

  if (!rawText.trim()) {
    throw new Error(
      'OCR could not read text from this document. Try a clearer scan or enter the details manually.'
    );
  }

  const meanConfidence = confidenceCount
    ? confidenceTotal / confidenceCount
    : 0;

  return parseFields(
    rawText,
    meanConfidence,
    words,
    pageTexts.length
  );
}
