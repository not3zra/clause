# AI guardrails

Clause uses Groq only from server-side routes. The browser never receives `GROQ_API_KEY`.

## Approved demo configuration

- Provider: Groq
- Model: `openai/gpt-oss-20b`
- App limits: 10 AI requests per student per hour and 30 requests per minute globally
- Platform budget: stay within the Groq free-tier limits; review the current account limits before a demo
- Fallback: deterministic mission feedback remains available when AI is unavailable or rate-limited

## Student-data boundary

The grading route may send only the original grammar item, submitted response, target rule/rubric, grade, and subtopic. It must not send full name, roll number, username, email, invite token, teacher identity, or other account data.

## Operational behavior

Requests use structured JSON outputs and concise educational feedback. Uncertain grading must award provisional credit and create teacher-review work rather than a hard wrong result.
