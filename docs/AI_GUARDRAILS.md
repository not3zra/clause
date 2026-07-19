# AI guardrails

Clause uses OpenAI only from server-side routes. The browser never receives `OPENAI_API_KEY`.

## Approved demo configuration

- Model: `gpt-5-mini`
- App limits: 10 AI requests per student per hour and 30 requests per minute globally
- Platform budget: set a $5 project budget alert/limit in the OpenAI Platform
- Fallback: deterministic mission feedback remains available when AI is unavailable or rate-limited

## Student-data boundary

The grading route may send only the original grammar item, submitted response, target rule/rubric, grade, and subtopic. It must not send full name, roll number, username, email, invite token, teacher identity, or other account data.

## Operational behavior

Requests use structured JSON outputs and concise educational feedback. Uncertain grading must award provisional credit and create teacher-review work rather than a hard wrong result.
