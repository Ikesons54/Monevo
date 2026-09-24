# Monevo Core Financial Engine V2

## Purpose

Implement Monevo's local-first financial foundation before adding budgets, obligations, shared expenses, reports, or other advanced features.

The application must remain:

- Local-first
- Offline-capable after the app loads
- Based on Dexie and IndexedDB
- Free of authentication requirements
- Free of cloud financial-data storage
- Compatible with the existing React 19 + TypeScript + Vite setup

Do not add Supabase, Firebase, remote APIs, or runtime financial-data network calls.

## Current project context

The current app has:

- React 19
- TypeScript
- Vite
- Dexie/IndexedDB
- Existing `Profile`, `Account`, and `Transaction` models
- A working dashboard and onboarding flow
- Most UI and logic currently in `src/App.tsx`

Refactor incrementally. Do not rewrite the entire product or create empty folders without an immediate use.

## Implementation principles

1. Preserve working functionality while refactoring.
2. Make the database schema the source of truth.
3. Store money as integer minor units, not floating-point currency values.
   - Example: AED 125.50 is stored as `12550`.
4. Keep financial dates separate from technical timestamps.
5. Never store a mutable current balance as the authoritative balance.
6. Derive an account balance from its opening balance plus account movements.
7. Support signed balances.
   - Positive balance means money available.
   - Negative balance means money owed.
8. Completed financial transactions cannot be future-dated.
9. Preserve historical records. Archive categories/accounts instead of deleting referenced data.
10. Keep UI changes modest until the ledger engine and tests are reliable.

## Target architecture

Introduce only the folders and files needed for the current step. The intended direction is:

```text
src/
├── app/
├── components/
│   ├── accounts/
│   ├── transactions/
│   ├── transfers/
│   ├── obligations/
│   └── shared-expenses/
├── db/
│   ├── database.ts
│   ├── schema.ts
│   └── migrations.ts
├── domain/
│   ├── accounts/
│   ├── transactions/
│   └── transfers/
├── lib/
│   ├── currency.ts
│   ├── dates.ts
│   └── ids.ts
├── types/
└── App.tsx
```

Do not move every component at once. First extract database/schema code and pure financial logic, then move UI sections as needed.

## Phase 1 scope

Implement the following in order:

1. Schema and migration foundation
2. Account movements and derived balances
3. Transaction event creation
4. User-selected transaction dates
5. Signed opening balances
6. Database-backed categories
7. Transfers between accounts
8. Dashboard integration
9. Tests and validation

Do not implement contacts, obligations, repayments, shared expenses, reports, insights, CSV import, or goals in this phase except where a type-safe extension point is necessary.

## Data model

### Profile

```ts
interface Profile {
  id: 'profile'
  country: string
  language: string
  primaryCurrency: string
  onboardingCompleted: boolean
  currencyLocked: boolean
}
```

### Account

Keep the existing account fields and preserve compatibility where possible:

```ts
interface Account {
  id: string
  name: string
  type: 'cash' | 'bank' | 'credit_card' | 'wallet' | 'other'
  openingBalance: number // signed minor units
  openingBalanceDate: string // YYYY-MM-DD
  archived: boolean
}
```

The opening balance is a starting ledger value, not the current balance.

### AccountMovement

```ts
interface AccountMovement {
  id: string
  accountId: string
  amount: number // signed minor units
  financialDate: string // YYYY-MM-DD
  eventType: 'opening_balance' | 'transaction' | 'transfer_in' | 'transfer_out'
  sourceId: string
  createdAt: string // ISO timestamp
  reversedBy: string | null
}
```

A positive amount increases the account balance. A negative amount decreases it.

### Transaction

```ts
interface Transaction {
  id: string
  type: 'expense' | 'income'
  amount: number // positive minor units
  accountId: string
  categoryId: string | null
  financialDate: string // YYYY-MM-DD
  merchant: string | null
  description: string | null
  notes: string | null
  voided: boolean
  createdAt: string
}
```

The transaction describes the financial event. The corresponding `AccountMovement` changes the account ledger.

### Transfer

```ts
interface Transfer {
  id: string
  fromAccountId: string
  toAccountId: string
  amount: number // positive minor units
  financialDate: string // YYYY-MM-DD
  description: string | null
  status: 'completed' | 'voided'
  createdAt: string
}
```

A completed transfer creates exactly two movements:

- `fromAccountId`: `-amount`, event type `transfer_out`
- `toAccountId`: `+amount`, event type `transfer_in`

A transfer must not affect income or expense totals.

### Category

```ts
interface Category {
  id: string
  name: string
  archived: boolean
  createdAt: string
}
```

Seed these categories once:

- Food
- Transport
- Housing
- Entertainment
- Health
- Shopping
- Other

Do not recreate seed categories every time the app starts.

## Dexie requirements

Create a database module under `src/db/` and use a Dexie version upgrade/migration.

The migration must:

1. Preserve existing profile, account, and transaction data where possible.
2. Convert existing decimal monetary values to integer minor units exactly once.
3. Create default categories once.
4. Create account movements for existing account opening balances.
5. Create account movements for existing transactions.
6. Avoid duplicate movements if the migration runs again.
7. Keep the application usable if an older local database already exists.

Before changing the schema, inspect the existing `src/db.ts` and current data shapes. Do not assume a fresh browser database.

## Domain functions

Extract pure, testable functions for:

```ts
getAccountBalance(accountId, accounts, movements)
getAllAccountBalances(accounts, movements)
getMonthlyIncome(transactions, month)
getMonthlyExpenses(transactions, month)
getMonthlyNet(transactions, month)
createTransactionMovement(transaction)
createTransferMovements(transfer)
canUseFinancialDate(date, today)
```

Required balance formula:

```text
account balance = opening balance + sum(all non-voided movements for the account)
```

Avoid calculating account balances from transaction lists in multiple UI locations.

## Money rules

- Store all persisted amounts in minor units as integers.
- Convert user-entered major units to minor units at the form boundary.
- Format minor units only at the display boundary.
- Use the profile currency for display.
- Do not use `Number(value) * 100` without rounding and validation.
- Accept signed opening balances.
- Transaction and transfer amounts must be strictly greater than zero.

## Date rules

- Financial dates use `YYYY-MM-DD`.
- Technical timestamps use ISO timestamps.
- Default a new transaction date to today, but allow the user to change it.
- Reject dates after the local current date for completed transactions and transfers.
- Do not silently change historical financial dates when timezone or locale changes.

## UI requirements for Phase 1

Keep the current onboarding and dashboard working.

Update the transaction form to include:

- Expense/income type
- Amount
- Financial date
- Account
- Category for expenses
- Merchant/person, optional
- Description, optional
- Notes, optional

Update the account form so that:

- Opening balance accepts negative values
- Amounts are stored as minor units
- Account balance is derived from movements

Add a transfer form or a clearly isolated transfer action with:

- From account
- To account
- Amount
- Financial date
- Description

Prevent selecting the same account as both source and destination.

The dashboard must show:

- Monthly income
- Monthly expenses
- Monthly net
- Derived account balances
- Recent transactions
- Transfers separately or clearly labelled as transfers

## Testing and validation

Before declaring the phase complete, run:

```bash
npm run build
```

Add automated tests if a test runner already exists. If none exists, add the smallest appropriate test setup or provide a deterministic manual validation script without adding unnecessary dependencies.

At minimum validate:

1. Opening balance `2000.00` displays as `2000.00`.
2. Expense `100.00` creates a `-10000` movement.
3. Income `3000.00` creates a `+300000` movement.
4. A `2000.00` opening balance minus `100.00` expense equals `1900.00`.
5. A credit-card opening balance of `-1200.00` remains negative.
6. A `500.00` transfer creates `-500.00` and `+500.00` movements.
7. Transfers do not change income or expense totals.
8. Future-dated completed transactions are rejected.
9. Voided transactions do not affect balances or totals.
10. Existing local data survives the migration without duplicate movements.

## Completion criteria

Phase 1 is complete only when:

- `npm run build` succeeds.
- Existing onboarding still works.
- Existing accounts and transactions remain visible after migration.
- Account balances are derived from movements.
- Signed balances work.
- Transactions support a user-selected non-future date.
- Categories are database-backed.
- Transfers create balanced opposing movements.
- No financial data is sent to a remote service.
- The implementation is split into maintainable modules rather than expanding `App.tsx` further.

## Agent workflow

1. Inspect the repository and current files before editing.
2. Check `package.json`, `src/db.ts`, `src/App.tsx`, `src/main.tsx`, and the existing CSS.
3. Make one coherent step at a time.
4. After each schema or migration change, run `npm run build`.
5. Do not delete existing data or use destructive database resets.
6. Do not use `git push --force`.
7. Report changed files, migration behavior, tests run, and any remaining limitations.
8. Do not proceed to budgets or advanced features until the completion criteria above pass.
