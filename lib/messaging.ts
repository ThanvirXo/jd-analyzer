import { browser } from 'wxt/browser';

export const GET_JD = 'GET_JD' as const;

export interface GetJdRequest {
  type: typeof GET_JD;
}

export interface JdResponse {
  /** Extracted job description text, empty if nothing usable was found. */
  text: string;
  /** Which strategy matched, useful for debugging selectors. */
  source: 'selector' | 'fallback' | 'none';
}

export type JdResult =
  | { ok: true; data: JdResponse; url?: string }
  | { ok: false; reason: 'unsupported' | 'no-tab' | 'no-content-script' };

/**
 * Asks the content script in the active tab for the page's job description.
 * Resolves with a tagged result instead of throwing so the popup can render
 * clean empty/error states.
 */
export async function requestJdFromActiveTab(): Promise<JdResult> {
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!tab?.id) return { ok: false, reason: 'no-tab' };

  try {
    const res = (await browser.tabs.sendMessage(tab.id, {
      type: GET_JD,
    } satisfies GetJdRequest)) as JdResponse | undefined;

    if (!res) return { ok: false, reason: 'no-content-script' };
    return { ok: true, data: res, url: tab.url };
  } catch {
    // sendMessage throws when no content script is listening on this page
    // (i.e. not LinkedIn/Naukri/Indeed, or the page hasn't loaded it yet).
    return { ok: false, reason: 'unsupported' };
  }
}
