# JD Match Analyzer

A Chrome extension that scores how well your resume matches any job description on LinkedIn, Naukri, and Indeed — instantly, using AI.

![JD Match Analyzer](public/icon/128.png)

## What it does

1. You upload your resume (PDF) once — it's stored locally in your browser.
2. You open any job listing on LinkedIn, Naukri, or Indeed.
3. You click **Analyze** — the extension extracts the JD, sends it with your resume to the backend, and shows you:
   - A match score (0–100)
   - Skills you already have that the job wants
   - Skills you're missing
   - A one-line verdict on your fit and what to work on

## Tech stack

| Layer | Stack |
|---|---|
| Extension | WXT + React + TypeScript + Tailwind CSS |
| PDF parsing | pdf.js (client-side, no upload) |
| Resume storage | `chrome.storage.local` (stays on your device) |
| Backend | Go + Gin |
| AI / LLM | OpenAI-compatible hosted model via custom prompt chain |
| Deployment | Render (backend) · Chrome MV3 (extension) |

## Architecture

```
Browser (Extension)
├── Popup (React)          — resume upload, JD preview, result display
├── Content Script         — extracts JD from LinkedIn / Naukri / Indeed DOM
└── chrome.storage.local   — stores resume text locally, never leaves device

              │  POST { resume, jd }
              ▼

Go Backend (Render)
├── CORS + Bearer token auth middleware
├── Gin handler → Service → Agent
└── Prompt chain → hosted LLM → JSON sanitization → response

              │  { match_score, matching_skills, missing_skills, verdict }
              ▼

Popup renders result
```

## Key technical decisions

- **Client-side PDF parsing** via `pdf.js` with a bundled worker — no file upload, no server storage, resume never leaves the browser until analysis.
- **Per-site DOM selectors + generic fallback** in the content script — handles LinkedIn, Naukri, and Indeed with multiple candidate selectors per site (job sites change markup often) and a largest-text-block fallback.
- **JSON sanitization** in Go — local models frequently emit raw newlines inside JSON string literals. A state-machine character scanner fixes this before `json.Unmarshal` so the parser never crashes.
- **Configurable backend URL at build time** via `WXT_BACKEND_URL` env var — same codebase serves both local dev and production without code changes.
- **Bearer token auth** using `crypto/subtle.ConstantTimeCompare` to block casual endpoint abuse without user accounts.

## Running locally

### Prerequisites
- Node.js 18+, pnpm
- Go 1.21+
- An OpenAI-compatible LLM endpoint (Ollama, vLLM, etc.)

### Extension (dev with live reload)
```bash
pnpm install
pnpm dev
# loads extension into a Chrome instance automatically
```

### Backend
```bash
cd backend
cp .env.example .env
# fill in LLM_URL, VLLM_KEY, LLM_MODEL in .env
go run .
# runs on localhost:8220
```

### Load in your own Chrome (optional)
```bash
pnpm build
# then: chrome://extensions → Developer mode → Load unpacked → .output/chrome-mv3
```

## Project structure

```
jd-analysis/
├── entrypoints/
│   ├── popup/          # React popup (resume upload + result UI)
│   └── content.ts      # Content script (JD extraction)
├── lib/
│   ├── api.ts          # Backend client
│   ├── messaging.ts    # Extension messaging (popup ↔ content script)
│   ├── pdf.ts          # PDF text extraction
│   └── resume-storage.ts
├── backend/
│   ├── agent/          # LLM prompt chain + JSON sanitization
│   ├── handlers/       # Gin HTTP handlers
│   ├── middleware/     # CORS, auth, request logging
│   ├── services/       # Business logic layer
│   └── Dockerfile
└── docs/
    └── privacy-policy.html
```

## Live backend

`https://jd-analyzer-i2dk.onrender.com/api/health`

---

Built in a weekend · WXT + React + TypeScript + Go + LLM
