# Schema, constraints and row level security

One migration from the Cultivating the Fruit app, which has sixteen. This one adds partner linking: two people in a relationship connect their accounts using a short-lived invitation code.

## Worth looking at

**Constraints carry the rules the application must not be trusted with.** `no_self_partnership CHECK (user_id != partner_id)` stops anyone partnering with themselves at the database level rather than in a validator that a later refactor could drop. `unique_partnership` stops the same pair being written twice.

**Row level security on both tables, scoped per operation.** Users can read only invitations they created. Users can read a partnership if they are on either side of it. Separate SELECT, INSERT and UPDATE policies rather than one blanket rule, so read access and write access are decided independently.

**Cascade behaviour chosen per relationship.** `created_by_user_id` cascades on delete, because an invitation without a creator is meaningless. `accepted_by_user_id` sets null, because the invitation record itself should survive the accepting account being removed.

**Indexes on the columns actually queried**, including `expires_at`, since expiry is swept rather than checked per row.

**A trigger for `updated_at`** rather than relying on every writer to remember.

## Known limitations

See [REVIEW-NOTES.md](../REVIEW-NOTES.md). The partnership INSERT policy in particular is more permissive than it should be, and I have noted why.
