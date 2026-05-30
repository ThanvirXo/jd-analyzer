import { useEffect, useRef, useState } from 'react';
import { extractTextFromPdf } from '@/lib/pdf';
import {
  getResume,
  saveResume,
  clearResume,
  type StoredResume,
} from '@/lib/resume-storage';
import { requestJdFromActiveTab, type JdResult } from '@/lib/messaging';
import { analyze, type AnalyzeResult } from '@/lib/api';

// ─── Inline SVG icons ────────────────────────────────────────────────────────

function IcoZap({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IcoUpload({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.338-2.32 5.75 5.75 0 0 1 1.322 11.095"
      />
    </svg>
  );
}

function IcoDoc({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
      />
    </svg>
  );
}

function IcoRefresh({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  );
}

// ─── Shared primitives ───────────────────────────────────────────────────────

function Spinner({ size = 14, color = '#8b5cf6' }: { size?: number; color?: string }) {
  return (
    <span
      className="inline-block rounded-full animate-spin"
      style={{
        width: size,
        height: size,
        border: '2px solid rgba(255,255,255,0.08)',
        borderTopColor: color,
      }}
    />
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-white/25">
      {children}
    </span>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <p
      className="text-[11px] px-3 py-2 rounded-xl leading-relaxed"
      style={{
        background: 'rgba(244,63,94,0.1)',
        color: '#fda4af',
        border: '1px solid rgba(244,63,94,0.18)',
      }}
    >
      {message}
    </p>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function fmtChars(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const [offset, setOffset] = useState(circ);

  useEffect(() => {
    const id = setTimeout(() => setOffset(circ - (score / 100) * circ), 80);
    return () => clearTimeout(id);
  }, [score, circ]);

  const isStrong = score >= 70;
  const isPartial = score >= 40 && score < 70;
  const stroke = isStrong ? '#10d9a0' : isPartial ? '#fbbf24' : '#f43f5e';
  const glow = isStrong
    ? 'rgba(16,217,160,0.28)'
    : isPartial
    ? 'rgba(251,191,36,0.28)'
    : 'rgba(244,63,94,0.28)';
  const label = isStrong ? 'Strong fit' : isPartial ? 'Partial fit' : 'Weak fit';

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="relative w-24 h-24" style={{ filter: `drop-shadow(0 0 16px ${glow})` }}>
        <svg width="96" height="96">
          <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
          <circle
            cx="48"
            cy="48"
            r={r}
            fill="none"
            stroke={stroke}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            transform="rotate(-90 48 48)"
            className="score-ring"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span className="text-[22px] font-bold text-white tabular-nums">{score}</span>
          <span className="text-[9px] text-white/35 mt-0.5 tracking-widest">%</span>
        </div>
      </div>
      <span
        className="text-[10px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full"
        style={{
          color: stroke,
          background: glow,
          border: `1px solid ${stroke}35`,
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── JD Section ───────────────────────────────────────────────────────────────

function JdSection({
  jd,
  jdLoading,
  onRefresh,
}: {
  jd: JdResult | null;
  jdLoading: boolean;
  onRefresh: () => void;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const jdText = jd?.ok ? jd.data.text : '';
  const hasFallback = jd?.ok && jd.data.source === 'fallback';

  return (
    <div className="glass rounded-xl">
      <div className="flex items-center justify-between px-3.5 pt-3 pb-0">
        <SectionLabel>Job Description</SectionLabel>
        <button
          onClick={onRefresh}
          disabled={jdLoading}
          title="Refresh"
          className="text-white/25 hover:text-white/55 transition-colors disabled:opacity-30"
        >
          <IcoRefresh className={`w-3.5 h-3.5 ${jdLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="px-3.5 pt-2 pb-3.5">
        {jdLoading ? (
          <div className="flex items-center gap-2">
            <Spinner size={11} />
            <span className="text-[11px] text-white/35">Scanning page…</span>
          </div>
        ) : jdText ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0 pulse-dot"
                  style={{ background: '#10d9a0' }}
                />
                <span className="text-[11px] text-white/50">
                  Detected · {fmtChars(jdText.length)} chars
                  {hasFallback && (
                    <span className="text-white/25"> · fallback</span>
                  )}
                </span>
              </div>
              <button
                onClick={() => setShowPreview((v) => !v)}
                className="text-[10px] text-white/25 hover:text-white/50 transition-colors"
              >
                {showPreview ? 'Hide ▴' : 'Preview ▾'}
              </button>
            </div>
            {showPreview && (
              <pre
                className="max-h-20 overflow-y-auto whitespace-pre-wrap text-[10px] leading-relaxed text-white/38 rounded-lg p-2.5"
                style={{ background: 'rgba(255,255,255,0.025)' }}
              >
                {jdText}
              </pre>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-white/30 leading-relaxed">
            {jd && !jd.ok && jd.reason === 'unsupported'
              ? 'Open a LinkedIn, Naukri, or Indeed job page, then click Refresh.'
              : 'No job description found yet — try Refresh after the page loads.'}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Result View ──────────────────────────────────────────────────────────────

function ResultView({ result }: { result: AnalyzeResult }) {
  const score = Math.max(0, Math.min(100, result.match_score));

  return (
    <section className="glass rounded-xl animate-fade-up">
      <div className="px-3.5 pt-3 pb-0">
        <SectionLabel>Analysis Result</SectionLabel>
      </div>

      <div className="px-3.5 pb-4 pt-3 flex flex-col gap-4">
        <div className="flex justify-center">
          <ScoreRing score={score} />
        </div>

        {result.verdict && (
          <p
            className="text-[11px] italic text-white/45 text-center px-3 py-2.5 rounded-xl leading-relaxed"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            "{result.verdict}"
          </p>
        )}

        {result.matching_skills.length > 0 && (
          <div>
            <p
              className="text-[9.5px] font-semibold uppercase tracking-[0.12em] mb-2"
              style={{ color: '#10d9a0' }}
            >
              ✓ Matching skills
            </p>
            <div className="flex flex-wrap gap-1">
              {result.matching_skills.map((skill) => (
                <span
                  key={skill}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{
                    background: 'rgba(16,217,160,0.1)',
                    color: '#6ee7b7',
                    border: '1px solid rgba(16,217,160,0.18)',
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {result.missing_skills.length > 0 && (
          <div>
            <p className="text-[9.5px] font-semibold uppercase tracking-[0.12em] mb-2 text-rose-400">
              ✗ Missing skills
            </p>
            <div className="flex flex-wrap gap-1">
              {result.missing_skills.map((skill) => (
                <span
                  key={skill}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{
                    background: 'rgba(244,63,94,0.1)',
                    color: '#fda4af',
                    border: '1px solid rgba(244,63,94,0.18)',
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {result.matching_skills.length === 0 && result.missing_skills.length === 0 && (
          <p className="text-[11px] text-white/30 text-center">No skills data returned.</p>
        )}
      </div>
    </section>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

function App() {
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resume, setResume] = useState<StoredResume | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [jdLoading, setJdLoading] = useState(true);
  const [jd, setJd] = useState<JdResult | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);

  const jdText = jd?.ok ? jd.data.text : '';
  const canAnalyze = !!resume && !!jdText && !analyzing;

  const btnHint = !resume
    ? 'Upload a resume first'
    : !jdText
    ? 'Open a job page first'
    : 'Analyze Match';

  useEffect(() => {
    getResume().then(setResume).finally(() => setLoading(false));
    fetchJd();
  }, []);

  async function fetchJd() {
    setJdLoading(true);
    try {
      setJd(await requestJdFromActiveTab());
    } finally {
      setJdLoading(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('Please choose a PDF file.');
      return;
    }
    setError(null);
    setParsing(true);
    try {
      const text = await extractTextFromPdf(file);
      if (!text) throw new Error('No readable text found in this PDF.');
      await saveResume(text, file.name);
      setResume(await getResume());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read the PDF.');
    } finally {
      setParsing(false);
    }
  }

  async function handleRemove() {
    await clearResume();
    setResume(null);
    setError(null);
    setResult(null);
  }

  async function handleAnalyze() {
    if (!resume || !jdText) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    setResult(null);
    try {
      setResult(await analyze(resume.text, jdText));
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div
      className="w-[360px] flex flex-col gap-3 p-4"
      style={{
        background: 'linear-gradient(160deg, #07091c 0%, #0c0f26 55%, #090d1e 100%)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      }}
    >
      {/* ── Header ── */}
      <header className="flex items-center justify-between pb-0.5">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)' }}
          >
            <IcoZap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-[13px] font-semibold text-white/90 tracking-tight">JD Analyzer</span>
        </div>
        <span
          className="text-[9.5px] font-semibold px-2.5 py-0.5 rounded-full tracking-wide"
          style={{
            color: '#a78bfa',
            background: 'rgba(124,58,237,0.14)',
            border: '1px solid rgba(124,58,237,0.25)',
          }}
        >
          AI · Local
        </span>
      </header>

      {/* ── Hidden file input ── */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFile}
      />

      {/* ── Resume card ── */}
      <div className="glass rounded-xl">
        <div className="px-3.5 pt-3 pb-0">
          <SectionLabel>Resume</SectionLabel>
        </div>
        <div className="px-3.5 pt-2 pb-3.5">
          {loading ? (
            <div className="flex items-center gap-2">
              <Spinner size={11} />
              <span className="text-[11px] text-white/35">Loading…</span>
            </div>
          ) : parsing ? (
            <div className="flex items-center gap-2">
              <Spinner size={11} color="#10d9a0" />
              <span className="text-[11px] text-white/45">Reading PDF…</span>
            </div>
          ) : resume ? (
            <div className="flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: 'rgba(16,217,160,0.1)',
                  border: '1px solid rgba(16,217,160,0.2)',
                }}
              >
                <IcoDoc className="w-[18px] h-[18px] text-[#10d9a0]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-medium text-white/85 truncate" title={resume.fileName}>
                  {resume.fileName}
                </p>
                <p className="text-[10.5px] text-white/30 mt-0.5">
                  Updated {formatDate(resume.updatedAt)} · {fmtChars(resume.text.length)} chars
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[11px] font-medium transition-colors"
                    style={{ color: '#a78bfa' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#c4b5fd')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#a78bfa')}
                  >
                    Update
                  </button>
                  <span className="text-white/15 select-none">·</span>
                  <button
                    onClick={handleRemove}
                    className="text-[11px] font-medium text-white/28 hover:text-rose-400 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="upload-zone rounded-xl p-5 flex flex-col items-center gap-2.5 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{
                  background: 'rgba(124,58,237,0.14)',
                  border: '1px solid rgba(124,58,237,0.22)',
                }}
              >
                <IcoUpload className="w-5 h-5 text-violet-400" />
              </div>
              <div className="text-center">
                <p className="text-[12.5px] font-medium text-white/65">Upload your resume</p>
                <p className="text-[10.5px] text-white/28 mt-0.5">PDF · stored locally, never uploaded</p>
              </div>
              <button
                className="mt-0.5 text-[11px] font-semibold px-4 py-1.5 rounded-lg transition-all"
                style={{
                  background: 'rgba(124,58,237,0.18)',
                  color: '#c4b5fd',
                  border: '1px solid rgba(124,58,237,0.28)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(124,58,237,0.28)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(124,58,237,0.18)';
                }}
              >
                Choose PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      {/* ── JD card ── */}
      <JdSection jd={jd} jdLoading={jdLoading} onRefresh={fetchJd} />

      {/* ── Analyze CTA ── */}
      <button
        onClick={handleAnalyze}
        disabled={!canAnalyze}
        className={`relative overflow-hidden rounded-xl py-2.5 text-[13px] font-semibold text-white flex items-center justify-center gap-1.5 transition-opacity ${
          canAnalyze ? 'btn-gradient btn-shimmer' : ''
        }`}
        style={
          !canAnalyze
            ? { background: 'rgba(255,255,255,0.055)', color: 'rgba(255,255,255,0.22)' }
            : undefined
        }
      >
        {analyzing ? (
          <>
            <Spinner size={13} color="rgba(255,255,255,0.9)" />
            <span>Analyzing…</span>
          </>
        ) : (
          <>
            <IcoZap className="w-3.5 h-3.5" />
            <span>{btnHint}</span>
          </>
        )}
      </button>

      {analyzeError && <ErrorBanner message={analyzeError} />}

      {result && <ResultView result={result} />}

      {/* ── Footer ── */}
      <p className="text-center text-[9px] text-white/15 pb-0.5 tracking-wide">
        Resume processed on-device · Analysis via local server
      </p>
    </div>
  );
}

export default App;
