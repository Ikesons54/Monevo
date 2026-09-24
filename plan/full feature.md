# Monevo — Full Roadmap

## Current State → V0.1 MVP → Future

Hand the agent one version at a time. Do not let it start the next version until the current version's completion criteria pass. Each version assumes the previous one is done.

## Version 0 — Current codebase baseline

This is not a build step. It prevents the agent from re-discovering the current state.

### What already works

- React 19 + TypeScript + Vite + Dexie
- Single `monevo-db` database
- Money stored as integer minor units; do not change this
- `AccountMovement` ledger exists
- Account balances are derived by summing movements, not stored
- Dexie `.version(2)` upgrade migrates old accounts/transactions into movements and seeds default categories
- Transfers create two balanced movements: `-amount` and `+amount`
- Contacts, Obligations, and Shared Expenses tables and basic add forms exist

### What is broken or skipped

Priority order:

1. `SharedExpenseModal` deducts money from the `paid from` account but does not write an `AccountMovement`.
2. Architecture remains in one large `App.tsx` and one `src/db.ts`.
3. `Transaction.category` stores a category name string instead of a stable `categoryId` reference.
4. Obligations have a `status` field but no settlement or repayment flow.
5. Shared expenses have no settlement flow.
6. Balance and total logic is duplicated inline instead of using shared domain functions.
7. No test runner is installed.
8. The dashboard does not reflect obligations or shared expenses.

Version 1 fixes items 1–3 and 6–7. Version 2 fixes items 4–5. Do not add other features until those versions are complete.

## Version 1 — Stabilize the foundation

### Goal

The app must behave as it does today, but correctly and in a maintainable shape. Add no new user-facing features in this version.

### Fix the Shared Expense ledger bug

`SharedExpenseModal.save()` must also write an `AccountMovement`:

- `accountId`
- `amount: -cents`
- `eventType: 'shared_expense'`
- `sourceId: sharedExpense.id`

Add a Dexie migration that finds existing `sharedExpenses` rows without a matching movement and creates the missing movement. Guard the migration so it never creates duplicates.

### Extract the architecture

Create the following structure as code is touched:

```text
src/
├── db/
│   ├── database.ts       # Dexie class + version chain, moved from db.ts
│   ├── schema.ts         # Profile, Account, Transaction, AccountMovement,
│   │                     # Category, Transfer, Contact, Obligation,
│   │                     # SharedExpense interfaces
│   └── migrations.ts     # Dexie upgrade callbacks
├── domain/
│   ├── accounts/balance.ts
│   ├── transactions/totals.ts
│   └── obligations/status.ts
├── lib/
│   ├── currency.ts
│   ├── dates.ts
│   └── ids.ts
├── components/
└── App.tsx
```

Move code; do not rewrite working logic unnecessarily. Components may be moved as they are touched rather than all at once.

`App.tsx` must shrink to routing and top-level state only.

### Fix category references

Add `categoryId: string | null` to `Transaction` without removing the existing category string yet.

Migration requirements:

- Match each existing transaction category name to a category.
- Set `categoryId` to the matching category ID.
- Preserve the old category string during this version.
- Update `TransactionModal` to save `categoryId`.
- Display the current category name through the category lookup so renames do not orphan historical transactions.
- Remove the old category field only in a later cleanup migration.

### Replace inline domain math

Add and use shared, testable functions:

```ts
getAccountBalance(accountId, movements)
getAllAccountBalances(accounts, movements)
getMonthlyIncome(transactions, month)
getMonthlyExpenses(transactions, month)
getMonthlyNet(transactions, month)
getOpenObligationsTotal(...)
```

`AccountRow` must use `getAccountBalance`.

The dashboard must use the transaction totals domain functions instead of inline filtering and reducing.

### Add testing

Install Vitest and add:

```json
"test": "vitest run"
```

Write tests for every domain function added in this version.

### Version 1 completion criteria

- `npm run build` passes.
- `npm run test` passes.
- Existing accounts, transactions, transfers, contacts, obligations, and shared expenses still display correctly after migrations.
- No user-facing screen looks or behaves differently.
- `App.tsx` is under approximately 300 lines.
- Shared expense payments affect the paid-from account balance exactly once.
- Category references remain stable after category renaming.

## Version 2 — Settlement

Make obligations and shared expenses real financial records.

### Repayment model

```ts
interface Repayment {
  id: string
  obligationId: string | null
  sharedExpenseId: string | null
  accountId: string
  amount: number
  financialDate: string
  createdAt: string
}
```

A repayment against an `owed_to_me` obligation creates a positive movement. A repayment against an `i_owe` obligation creates a negative movement.

Support partial settlements. When total repayments equal the obligation/shared-expense amount, set `status: 'settled'` automatically. Do not require the user to flip it manually.

Add a `Settle` action to obligation/shared-expense rows with:

- Amount
- Account
- Date

### Version 2 completion criteria

- Partial settlement works.
- Full settlement works.
- Correct account movements are created for both directions.
- Status changes to `settled` automatically at full coverage.
- Tests cover partial and full settlement for obligations and shared expenses.

## Version 3 — Dashboard integration

Add to Overview:

- `Owed to you`
- `You owe`
- Open obligations and open shared expenses, netted by direction
- Combined recent activity feed containing transactions, transfers, and settlements
- Activity sorted by financial date and clearly labeled by type

Keep existing income, expense, net, and account metrics unchanged.

### Version 3 completion criteria

The Overview reflects obligations and shared expenses without requiring a separate screen visit, while existing metrics remain unchanged.

## Version 4 — Reports

Add a Reports view with:

- Week or month selection
- Income
- Expenses
- Net
- Per-category amount and percentage of total spend
- Comparison with the previous period using simple arithmetic

Generalize Version 1 domain functions to accept arbitrary date ranges. Do not duplicate logic for weekly reports.

### Version 4 completion criteria

Report totals match manually summed transactions for the selected period. Add a test with seeded data.

## Version 5 — Explainable category-change insights

Detect meaningful category-level spend changes between periods, such as Food spending increasing 40% from the prior month.

Every insight must provide evidence by listing the exact transaction IDs that caused the change.

Product constraints:

- No judgment-coded red/green spending colors.
- No forecasting.
- No pacing.
- No advice language.
- State what happened, not what the user should do.

### Version 5 completion criteria

Every generated insight traces to specific transaction IDs. No insight appears without evidence.

## Version 6 — Backup, reset, and safety architecture

Implement:

- Full-fidelity JSON export of every table
- Restore into a fresh or existing local database
- Clear overwrite warning before restore
- Confirmation-gated data reset returning to onboarding
- Offline runtime behavior verified with network disabled
- Blocking safety screen when the database is corrupted or partially migrated
- Option to export readable data before reset from the safety screen

### Version 6 completion criteria

- Export → reset → restore produces identical table contents.
- Deliberate local database corruption triggers the safety screen.
- The app does not silently operate on inconsistent data.

## Version 7 — P1 post-launch polish

Only begin after Versions 1–6 are complete and stable:

- Insight feedback and dismissal controls
- CSV transaction import
- Simplified active-record export
- Settings screen polish

## Version 8 — V0.2 / future

Build only when a new need justifies it:

- Goals UI
- Trend UI
- Subcategories
- Recurring transactions
- Refund event types
- App-level authentication

## Permanently out of scope

Do not implement these, even if suggested by an agent, reviewer, or feature request:

- Financial advice or recommendations
- Judgment-coded color on spending/income
- Goal pacing calculations
- Bank sync
- Cross-device sync
- Multi-user accounts
- AI financial adviser

## Working rules for every version

1. Inspect current code before editing. Do not assume it still exactly matches this document.
2. Implement only one version per work session.
3. Do not start the next version until the current version's completion criteria pass.
4. Run `npm run build` and `npm run test` before declaring a version complete.
5. Never delete user data in a migration.
6. Add guards so migrations cannot double-run.
7. Report back with:
   - Files changed
   - Migrations run
   - Tests added
   - Tests executed
   - Anything skipped
   - Anything that deviated from this specification
8. If a required markdown implementation file is provided by the user, ask for and follow that file first. A user-provided specification takes precedence over this roadmap.
