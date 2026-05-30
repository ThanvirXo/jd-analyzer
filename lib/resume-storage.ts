import { storage } from 'wxt/utils/storage';

export interface StoredResume {
  text: string;
  fileName: string;
  updatedAt: number;
}

/**
 * The resume lives in chrome.storage.local so it survives popup closes and
 * browser restarts, and never leaves the user's machine.
 */
export const resumeItem = storage.defineItem<StoredResume | null>(
  'local:resume',
  { fallback: null },
);

export function getResume(): Promise<StoredResume | null> {
  return resumeItem.getValue();
}

export function saveResume(text: string, fileName: string): Promise<void> {
  return resumeItem.setValue({ text, fileName, updatedAt: Date.now() });
}

export function clearResume(): Promise<void> {
  return resumeItem.removeValue();
}

export function watchResume(
  cb: (resume: StoredResume | null) => void,
): () => void {
  return resumeItem.watch(cb);
}
