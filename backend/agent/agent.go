package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"

	einoai "github.com/cloudwego/eino-ext/components/model/openai"
	"github.com/cloudwego/eino/schema"
	"github.com/sirupsen/logrus"
)


type Agent struct {
	model *einoai.ChatModel
}


type AnalyzeResult struct {
	MatchScore     int      `json:"match_score"`
	MatchingSkills []string `json:"matching_skills"`
	MissingSkills  []string `json:"missing_skills"`
	Verdict        string   `json:"verdict"`
}


func New() (*Agent, error) {
	ctx := context.Background()

	model, err := einoai.NewChatModel(ctx, &einoai.ChatModelConfig{
		APIKey:  os.Getenv("VLLM_KEY"),
		BaseURL: os.Getenv("LLM_URL"),
		Model:   os.Getenv("LLM_MODEL"),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create agent model: %w", err)
	}

	return &Agent{model: model}, nil
}

const systemPrompt = `You are a senior technical recruiter and hiring manager with years of experience screening candidates for engineering roles. Your task is to rigorously evaluate how well a candidate's resume matches a SPECIFIC job description.

Reason step by step INTERNALLY before answering. Do NOT reveal your reasoning or write any of these steps in the output. Think silently through this framework:

STEP 1 — UNDERSTAND WHAT THE JOB ACTUALLY NEEDS.
Read the job description carefully and extract the real requirements, not just keywords:
- Core MUST-HAVE skills/technologies (the non-negotiables to do the job).
- NICE-TO-HAVE / bonus skills (preferred but not blockers).
- Required years of experience and seniority level (junior / mid / senior / lead).
- Domain or industry context (e.g. fintech, e-commerce, healthcare, devtools).
- The day-to-day responsibilities and the kind of work this person will own.
Be careful to separate hard requirements from preferences — never treat a "bonus" or "plus" as a blocker.

STEP 2 — UNDERSTAND THE CANDIDATE.
From the resume, identify:
- Skills backed by REAL evidence (shipped projects, job roles, measurable impact) vs. skills merely listed.
- The depth and RECENCY of each skill — recent, substantial experience counts far more than a one-off or years-old mention.
- Total years of relevant experience and effective seniority.
- Transferable skills that map to the job's needs even when the exact keyword is absent (e.g. strong REST API design implies they can pick up a new framework).

STEP 3 — REASON ABOUT FIT.
- For each core requirement, decide whether the resume genuinely satisfies it. Only count a skill as matching when there is concrete evidence — never guess, pad, or assume.
- Identify the most important gaps, prioritizing MUST-HAVES over nice-to-haves.
- Weigh how close the candidate is on experience level and domain fit, not just the tech stack.

STEP 4 — SCORE HONESTLY AND CALIBRATED.
match_score (0-100) reflects how well the resume satisfies the role's TRUE requirements, weighting must-haves and recent experience most heavily:
- 85-100: excellent, hits nearly all must-haves with strong recent evidence.
- 70-84: strong fit with a few non-critical gaps.
- 40-69: partial fit; missing some must-haves or short on experience.
- below 40: weak fit; missing most core requirements.

After reasoning silently, output ONLY a valid JSON object. No explanation. No markdown. No backticks. Exactly this shape:
{
  "match_score": <0-100 integer>,
  "matching_skills": ["concrete skills/experience from the resume that satisfy this job's requirements"],
  "missing_skills": ["the job's important requirements the resume does NOT demonstrate, MOST CRITICAL FIRST"],
  "verdict": "<2 concise sentences. Sentence 1: how strong the fit is and why. Sentence 2: specifically what this candidate needs to do, learn, or gain to become a strong match for THIS job.>"
}`

const userPrompt = `Resume:
%s

Job Description:
%s`


func (a *Agent) Analyze(ctx context.Context, resume, jd string) (*AnalyzeResult, error) {
	msg, err := a.model.Generate(ctx, []*schema.Message{
		{Role: schema.System, Content: systemPrompt},
		{Role: schema.User, Content: fmt.Sprintf(userPrompt, resume, jd)},
	})
	if err != nil {
		return nil, fmt.Errorf("model generation failed: %w", err)
	}

	logrus.Debugf("agent raw response: %s", msg.Content)

	cleaned := sanitizeJSON(extractJSON(msg.Content))
	var result AnalyzeResult
	if err := json.Unmarshal([]byte(cleaned), &result); err != nil {
		return nil, fmt.Errorf("failed to parse model response as JSON: %w (raw: %s)", err, msg.Content)
	}

	return &result, nil
}


func extractJSON(s string) string {
	s = strings.TrimSpace(s)
	s = strings.TrimPrefix(s, "```json")
	s = strings.TrimPrefix(s, "```")
	s = strings.TrimSuffix(s, "```")
	s = strings.TrimSpace(s)

	if start := strings.Index(s, "{"); start != -1 {
		if end := strings.LastIndex(s, "}"); end > start {
			return s[start : end+1]
		}
	}
	return s
}

// sanitizeJSON escapes raw control characters (newlines, tabs, etc.) that the
// model sometimes leaves unescaped inside string literals. JSON forbids these,
// so encoding/json rejects the response without this cleanup.
func sanitizeJSON(s string) string {
	var b strings.Builder
	b.Grow(len(s))

	inString := false
	escaped := false

	for _, r := range s {
		if escaped {
			b.WriteRune(r)
			escaped = false
			continue
		}

		switch {
		case r == '\\' && inString:
			b.WriteRune(r)
			escaped = true
		case r == '"':
			inString = !inString
			b.WriteRune(r)
		case inString && r == '\n':
			b.WriteString(`\n`)
		case inString && r == '\r':
			b.WriteString(`\r`)
		case inString && r == '\t':
			b.WriteString(`\t`)
		case inString && r < 0x20:
			fmt.Fprintf(&b, `\u%04x`, r)
		default:
			b.WriteRune(r)
		}
	}

	return b.String()
}
