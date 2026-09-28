# Review notes

If you run these files through a code review tool, here is what it will find. I would rather write this myself than have you discover it.

This is working code from small projects I built and run alone. It is not a hardened platform, and some of what follows I already knew and traded away deliberately. Where I did not, I have said so.

---

## 01 — Stripe fulfilment webhook

**No idempotency guard. This is the real one.** Stripe retries webhooks, and `checkout.session.completed` can arrive more than once for the same session. The database write is protected, because the unique constraint on the invite code returns `23505` and the handler treats that as success. The emails are not. A retry sends the confirmation and the guide emails again.

The fix is a processed-events table keyed on `event.id`, checked before any side effect. I know what it is and I have not done it yet, because the volume has not forced the issue. That is a reason, not a defence.

**A failed Loops call causes a retry of the whole handler.** `loopsUpsertContact` and `loopsFetch` throw, the handler 500s, Stripe retries, and everything that already succeeded runs again. Combined with the above, a Loops outage means duplicate email. The same processed-events fix covers it.

**Fulfilment runs inline rather than on a queue.** Four sequential third-party calls happen before the 200 is returned. Stripe times out around ten seconds. Correct shape is acknowledge first, fulfil async.

**The invite-code write result is ignored.** `saveInviteCodeToSupabase` returns `false` when the service-role key is missing, and the caller does not check it. A misconfigured environment would still send a welcome email containing a code that was never persisted. That is the bug in here I am least comfortable with.

**`tierMonths * 30` approximates a month as thirty days.** A twelve-month tier expires at 360 days. Known, deliberate, and wrong by five days in the customer's favour.

**`data` is destructured and unused.** A linter will say so.

---

## 02 — Publer MCP server

**One code path is unverified and the comment says so.** `buildPost` returns a structured payload for Pinterest and a flat `{ text, accounts }` shape for everything else. I verified Pinterest against Publer's documentation. The flat shape preserves earlier behaviour and I have not confirmed it against every network.

**No retry or backoff on Publer calls.** A transient failure surfaces to the agent as an error rather than being retried.

**`any` with an eslint-disable** in `publerFetch`, because the response shape varies by endpoint.

**No rate limiting.** The server trusts its caller, which for a single-user local MCP server is reasonable and would not be if it were shared.

---

## 03 — Self-healing CI

**The retry logic is copy-pasted four times.** It should be a loop or a matrix. It is not, because I wrote it to solve a problem rather than to be read, and GitHub Actions makes loops with side effects more awkward than they should be. A reviewer is right to flag it.

**`|| true` on nearly every step means the workflow cannot fail.** That is deliberate: its job is to fix and escalate, not to block. It does mean "Code Check" passing tells you nothing on its own. The Issue it opens is the actual signal.

**`permissions: contents: write` with an auto-commit on every branch.** Fine for a personal repository. In a shared one, a workflow that pushes to any branch on any push needs more thought than I have given it here.

**The `console.log` grep has no ignore list.** It would match vendored or minified files if the site had any.

---

## 04 — Knowledge-grounded adviser

**The passcode is compared with `!==`, which is not constant time.** Theoretically timing-attackable. For a single-user tool behind an unadvertised URL this is not where the risk is, but `timingSafeEqual` is the correct call and costs nothing.

**No rate limiting.** Anyone holding the passcode can spend my Anthropic budget.

**Conversation history is client-supplied and trusted.** A caller could inject fabricated assistant turns. The passcode bounds who can, and the roles and length are validated, but the content is taken on faith.

**The knowledge cache is per warm instance.** On serverless, a cold start re-reads and re-concatenates all six files. Prompt caching handles the cost that matters; this is just disk reads.

**The whole corpus goes in every request.** Fine at six files. It does not scale, and at some size retrieval stops being optional. See the note in that folder about why I am not calling this RAG.

---

## 05 — Schema and RLS

**The partnership INSERT policy is too permissive.** `WITH CHECK (auth.uid() = user_id OR auth.uid() = partner_id)` lets an authenticated user insert a row naming someone else as `user_id`, so linking is effectively unilateral. It should require `auth.uid() = user_id` and be reachable only through a function that has already validated an unused, unexpired invitation code. This is the most substantive issue in the file.

**`UNIQUE (user_id, partner_id)` does not prevent the mirror.** Rows `(A, B)` and `(B, A)` can both exist. A normalised ordering or a unique index on `least()`/`greatest()` would close it.

**No DELETE policy on either table**, so unlinking cannot be done by the user through RLS.

**Expiry is not enforced in the database.** `expires_at` is stored and indexed, and the check lives in application code. A constraint or a policy condition would be stronger.

**Code collision is handled by catching `23505` rather than prevented.** Eight characters is a small space when codes are generated client side.

---

## What I would fix first

The idempotency guard in 01 and the partnership INSERT policy in 05, in that order. Both are real, both affect real users, and neither is hard.
