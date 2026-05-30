// Configurable per build: set WXT_BACKEND_URL in your .env (or .env.production)
// to your deployed backend, e.g. https://api.yourdomain.com/api/analyze.
// Falls back to the local dev server when unset.
const BACKEND_URL =
  (import.meta.env.WXT_BACKEND_URL as string | undefined) ||
  'http://localhost:8220/api/analyze';

// Shared secret sent as a Bearer token; must match the backend's API_KEY env.
const API_KEY = (import.meta.env.WXT_API_KEY as string | undefined) || '';

export interface AnalyzeResult {
  match_score: number;
  matching_skills: string[];
  missing_skills: string[];
  verdict: string;
}

interface ApiEnvelope<T> {
  message: string | null;
  data?: T;
}

/**
 * Sends resume + JD to the Go backend and returns the parsed match result.
 * Throws an Error (with a user-friendly message) on network or backend errors.
 */
export async function analyze(
  resume: string,
  jd: string,
): Promise<AnalyzeResult> {
  let res: Response;
  try {
    res = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
      },
      body: JSON.stringify({ resume, jd }),
    });
  } catch {
    throw new Error(
      "Couldn't reach the backend. Make sure it's running on localhost:8220.",
    );
  }

  let envelope: ApiEnvelope<AnalyzeResult>;
  try {
    envelope = (await res.json()) as ApiEnvelope<AnalyzeResult>;
  } catch {
    throw new Error('Backend returned an unexpected (non-JSON) response.');
  }

  if (!res.ok || !envelope.data) {
    throw new Error(envelope.message || 'Analysis failed. Please try again.');
  }

  return envelope.data;
}
