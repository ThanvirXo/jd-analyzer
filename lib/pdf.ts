import * as pdfjsLib from 'pdfjs-dist';
// Vite resolves this to a bundled asset URL inside the extension package,
// so pdf.js can load its worker without hitting the network.
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

/**
 * Reads a PDF File and returns its text content as a single plain string.
 * Pages are separated by blank lines so the model sees clear section breaks.
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;

  const pages: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    pages.push(pageText);
  }

  return pages.join('\n\n').replace(/[ \t]+/g, ' ').trim();
}
