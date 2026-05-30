import { GET_JD, type GetJdRequest, type JdResponse } from '@/lib/messaging';

// Site-specific selectors, tried in order. Job sites change their markup
// often, so we keep several candidates per host plus a generic fallback.
const SELECTORS: Record<string, string[]> = {
  'linkedin.com': [
    '#job-details',
    '.jobs-description__content',
    '.jobs-description-content__text',
    '.jobs-box__html-content',
    '.show-more-less-html__markup',
    '.description__text',
  ],
  'naukri.com': [
    '[class*="styles_JDC__dang-inner-html"]',
    '[class*="job-desc"]',
    'section[class*="job-description"]',
    '.dang-inner-html',
    '.jd-container',
  ],
  'indeed.com': [
    '#jobDescriptionText',
    '.jobsearch-jobDescriptionText',
    '[id*="jobDescription"]',
  ],
};

const MIN_JD_LENGTH = 120;
const MAX_JD_LENGTH = 20000;

function clean(text: string): string {
  return text
    .replace(/\s+\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_JD_LENGTH);
}

function getHostKey(): string | undefined {
  const host = location.hostname;
  return Object.keys(SELECTORS).find((key) => host.includes(key));
}

/** Fallback: pick the on-page element holding the most visible text. */
function fallbackText(): string {
  const candidates = document.querySelectorAll<HTMLElement>(
    'main, article, [role="main"], section, div',
  );
  let best = '';
  candidates.forEach((el) => {
    const text = el.innerText ?? '';
    if (text.length > best.length) best = text;
  });
  return best;
}

function extractJd(): JdResponse {
  const hostKey = getHostKey();
  const selectors = hostKey ? SELECTORS[hostKey] : [];

  for (const selector of selectors) {
    const el = document.querySelector<HTMLElement>(selector);
    const text = clean(el?.innerText ?? '');
    if (text.length >= MIN_JD_LENGTH) {
      return { text, source: 'selector' };
    }
  }

  const fallback = clean(fallbackText());
  if (fallback.length >= MIN_JD_LENGTH) {
    return { text: fallback, source: 'fallback' };
  }

  return { text: '', source: 'none' };
}

export default defineContentScript({
  matches: [
    '*://*.linkedin.com/*',
    '*://*.naukri.com/*',
    '*://*.indeed.com/*',
  ],
  main() {
    browser.runtime.onMessage.addListener((msg: GetJdRequest) => {
      if (msg?.type === GET_JD) {
        return Promise.resolve(extractJd());
      }
    });
  },
});
