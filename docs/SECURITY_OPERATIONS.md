# Clause security and operations baseline

## Threat model

Clause protects teacher accounts, student enrolment records, invite tokens, persisted mission attempts, and API credentials. The primary threats are account-enumeration and credential abuse, invite guessing and repeated enrolment, cross-tenant reads, abusive AI requests, forged browser writes, and accidental disclosure through logs, exports, or source control.

RLS remains the database access boundary. Browser clients use only the Supabase publishable key; `SUPABASE_SECRET_KEY`, `GROQ_API_KEY`, `TURNSTILE_SECRET_KEY`, and `UPSTASH_REDIS_REST_TOKEN` are server-only Vercel variables. Never prefix them with `NEXT_PUBLIC_`, log them, include them in errors, or export them in CSV.

## Controls

- Turnstile is verified server-side for teacher sign-up and student enrolment. Verification failures fail closed.
- Upstash counters use an atomic Redis script with TTLs. Auth, enrolment, invite, generation, grading, and appeal paths must return `429` when their budget is exhausted.
- Browser writes require same-origin requests, bounded request bodies, schema validation, and generic safe error messages.
- CSP, frame denial, strict referrer policy, content-type protection, and a restrictive permissions policy are sent on every route.
- Groq receives only grammar content required to grade or generate a room. Do not send student names, roll numbers, cookies, IP addresses, or identifiers.
- CSV uses formula-injection escaping and is rendered only from teacher-authorized rows.

## Retention and deletion

Student sessions expire after 24 hours. Mission and audit data are retained only for the teacher's instructional use. On a teacher's deletion request, delete the affected student profile, assignments, mission attempts, and attached audit records through the authorized Supabase administrative workflow; confirm completion without placing identifiers in tickets or logs. Redis counters expire automatically and are not a student record system.

## Incident-safe logging

Log only a route name, status class, request correlation ID, and non-sensitive provider outcome. Never log request bodies, authorization headers, cookies, invite tokens, IP addresses, student identifiers, answers, or environment values. Rotate any suspected exposed key in its provider and Vercel before investigating further.

## Free-tier operational limits

Monitor Turnstile verification traffic, Upstash command/storage usage, Supabase database/API quotas, Groq request budgets, and Vercel function usage. If Upstash or Turnstile is unavailable, protected writes fail closed; do not remove these controls as a reliability workaround. Review rate-limit rejection volume and provider errors weekly during the hackathon period.
