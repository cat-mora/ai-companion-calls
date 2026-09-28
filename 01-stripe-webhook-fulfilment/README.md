# Stripe → Supabase → Loops fulfilment

From the Cultivating the Fruit funnel, live at cultivatingthefruit.com. This is the file that runs when someone buys.

## What it does

One webhook coordinates four systems. Stripe fires the event, this verifies it came from Stripe, writes an access code into Supabase, creates or updates the contact in Loops, then works out which of several emails to send based on what was actually in the cart.

## Worth looking at

**Signature verification on a raw body.** `bodyParser` is disabled and the request is buffered manually, because Stripe signs the raw bytes. Parsing first breaks verification, and a webhook that cannot verify its sender is an open endpoint.

**The 409 upsert.** The Loops API returns 409 when a contact already exists rather than upserting. `loopsUpsertContact` creates, catches the 409, and falls back to update. Without it, every repeat customer fails fulfilment.

**Duplicate handling on the database write.** A Postgres unique violation (`23505`) on the invite code returns `true`, not an error. The code already exists and is still usable, so failing the fulfilment would punish the customer for a race the system caused.

**Branching fulfilment.** Tier, order bumps and one-time offers combine into different email sequences. An order bump-only purchase must not trigger the main onboarding sequence, which is what `isOTOOnly` guards.

**Failure posture.** Missing service-role key logs loudly and returns false rather than throwing, so a configuration problem does not take down the payment path.

## Redacted

The Supabase project reference and the Loops transactional template IDs are replaced with placeholders. Both are identifiers rather than credentials. No secret appears here or in the private original; everything sensitive reads from environment variables.
