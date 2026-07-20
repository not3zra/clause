# Clause deployment runbook

## Vercel

Set the variables listed in `.env.example` in Vercel for Production and Preview as appropriate. Never copy values into the repository. Apply Supabase migrations in filename order before merging a migration-bearing PR, then use `SMOKE_URL=https://clause-learn.vercel.app npm run smoke:deployment` after deployment.

## Local container workflow

Copy required non-secret development values into `.env.local`, then run `docker compose up --build`. The container health check calls `/api/health`; use `docker compose down` to stop it. `.env.local` is excluded from images and source control.

## Rollback

Use Vercel’s deployment rollback to restore the previous successful deployment. Do not roll back a database migration by deleting production data; create a forward-only corrective migration. Rotate any suspected exposed provider key first, then review safe correlation IDs and provider status without collecting PII.

## Free-tier caveats

Vercel, Supabase, Groq, Upstash, and Turnstile each impose usage limits. Monitor quotas, retain a published-room fallback when Groq is unavailable, and treat a failed deployment smoke check as a release blocker.
