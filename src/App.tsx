import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type ReactNode } from 'react'
import {
  db,
  formatCurrency,
  makeId,
  today,
  type Account,
  type AccountType,
  type Transaction,
  type TransactionType,
} from './db'

const categories = [
  'Food',
  'Transport',
  'Housing',
  'Entertainment',
  'Health',
  'Shopping',
  'Other',
]

export default function App() {
  const profile = useLiveQuery(
    async () => {
      const savedProfile = await db.profiles.get('profile')
      return savedProfile ?? null
    },
    [],
  )

  const accounts =
    useLiveQuery(async () => {
      const savedAccounts = await db.accounts.toArray()
      return savedAccounts.filter((account) => !account.archived)
    }, []) ?? []

  const transactions =
    useLiveQuery(async () => {
      const savedTransactions = await db.transactions.toArray()

      return savedTransactions
        .filter((transaction) => !transaction.voided)
        .sort((a, b) => b.financialDate.localeCompare(a.financialDate))
    }, []) ?? []

  if (profile === undefined) {
    return <div className="loading">Loading Monevo…</div>
  }

  if (profile === null) {
    return <Onboarding />
  }

  const currency = profile.primaryCurrency
  const currentMonth = today().slice(0, 7)

  const monthTransactions = transactions.filter((transaction) =>
    transaction.financialDate.startsWith(currentMonth),
  )

  const income = monthTransactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((total, transaction) => total + transaction.amount, 0)

  const expenses = monthTransactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((total, transaction) => total + transaction.amount, 0)

  const net = income - expenses

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-cluster">
          <div className="brand-mark">M</div>
          <div className="wordmark">Monevo</div>
        </div>

        <div className="fwx-tag">Powered by FWXplus</div>
      </header>

      <main className="content-wrap">
        <section className="hero-panel">
          <div>
            <p className="eyebrow">
              {new Date().toLocaleString('en-US', {
                month: 'long',
                year: 'numeric',
              }).toUpperCase()}
            </p>

            <h1>Understand your money.</h1>

            <p className="subtext">
              Build your future with a clear, private, local-first view of
              what you earn, spend, owe, and save.
            </p>
          </div>

          <AddTransactionButton accounts={accounts} />
        </section>

        <section className="metrics-grid">
          <Metric
            label="Income"
            value={formatCurrency(income, currency)}
            tone="positive"
          />

          <Metric
            label="Spent"
            value={formatCurrency(expenses, currency)}
            tone="negative"
          />

          <Metric
            label="Net this month"
            value={formatCurrency(Math.abs(net), currency)}
            tone={net >= 0 ? 'positive' : 'negative'}
            prefix={net >= 0 ? '+' : '-'}
          />

          <Metric
            label="Accounts"
            value={String(accounts.length)}
          />
        </section>

        <section className="panel-grid">
          <Panel title="Accounts" action={<AddAccountButton />}>
            {accounts.length === 0 ? (
              <EmptyState message="Add an account to start tracking your money." />
            ) : (
              accounts.map((account) => (
                <AccountRow
                  key={account.id}
                  account={account}
                  transactions={transactions}
                  currency={currency}
                />
              ))
            )}
          </Panel>

          <Panel
            title="Recent activity"
            action={<AddTransactionButton accounts={accounts} />}
          >
            {transactions.length === 0 ? (
              <EmptyState message="No transactions yet. Add one to start recording activity." />
            ) : (
              transactions.slice(0, 8).map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  currency={currency}
                />
              ))
            )}
          </Panel>
        </section>
      </main>
    </div>
  )
}

function Onboarding() {
  const [country, setCountry] = useState('United Arab Emirates')
  const [currency, setCurrency] = useState('AED')
  const [error, setError] = useState('')

  async function completeOnboarding() {
    const cleanCountry = country.trim()
    const cleanCurrency = currency.trim().toUpperCase()

    if (!cleanCountry) {
      setError('Please enter your country.')
      return
    }

    if (!/^[A-Z]{3}$/.test(cleanCurrency)) {
      setError('Currency must be a three-letter code, such as AED or USD.')
      return
    }

    await db.profiles.put({
      id: 'profile',
      country: cleanCountry,
      language: 'en',
      primaryCurrency: cleanCurrency,
      onboardingCompleted: true,
      currencyLocked: false,
    })
  }

  return (
    <main className="center-shell">
      <section className="welcome-card">
        <div className="welcome-brand">
          <div className="brand-mark large">M</div>
          <div className="wordmark">Monevo</div>
        </div>

        <p className="eyebrow">PRIVATE PERSONAL FINANCE</p>

        <h1>Understand your money.</h1>
        <h2>Build your future.</h2>

        <div className="form-stack">
          <label>
            Country
            <input
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              placeholder="Your country"
            />
          </label>

          <label>
            Primary currency
            <input
              value={currency}
              maxLength={3}
              onChange={(event) =>
                setCurrency(event.target.value.toUpperCase())
              }
              placeholder="AED"
            />
          </label>

          {error && <p className="error-message">{error}</p>}

          <button className="primary-button" onClick={completeOnboarding}>
            Get started
          </button>
        </div>

        <div className="powered-by">Powered by FWXplus</div>
      </section>
    </main>
  )
}

function AddAccountButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button className="ghost-button" onClick={() => setOpen(true)}>
        + Add account
      </button>

      {open && <AccountModal onClose={() => setOpen(false)} />}
    </>
  )
}

function AddTransactionButton({ accounts }: { accounts: Account[] }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        className="primary-button"
        onClick={() => setOpen(true)}
        disabled={accounts.length === 0}
        title={
          accounts.length === 0
            ? 'Create an account first'
            : 'Add transaction'
        }
      >
        + Add transaction
      </button>

      {open && (
        <TransactionModal
          accounts={accounts}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

function AccountModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('cash')
  const [openingBalance, setOpeningBalance] = useState('0')
  const [error, setError] = useState('')

  async function saveAccount() {
    const cleanName = name.trim()
    const balance = Number(openingBalance)

    if (!cleanName) {
      setError('Please enter an account name.')
      return
    }

    if (!Number.isFinite(balance) || balance < 0) {
      setError('Enter a valid opening balance.')
      return
    }

    await db.accounts.add({
      id: makeId(),
      name: cleanName,
      type,
      openingBalance: Math.round(balance * 100),
      openingBalanceDate: today(),
      archived: false,
    })

    await db.profiles.update('profile', {
      currencyLocked: true,
    })

    onClose()
  }

  return (
    <Modal title="Add account" onClose={onClose}>
      <label>
        Account name
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Main bank account"
        />
      </label>

      <label>
        Account type
        <select
          value={type}
          onChange={(event) =>
            setType(event.target.value as AccountType)
          }
        >
          <option value="cash">Cash</option>
          <option value="bank">Bank</option>
          <option value="credit_card">Credit card</option>
          <option value="wallet">Wallet</option>
          <option value="other">Other</option>
        </select>
      </label>

      <label>
        Opening balance
        <input
          type="number"
          min="0"
          step="0.01"
          value={openingBalance}
          onChange={(event) => setOpeningBalance(event.target.value)}
        />
      </label>

      {error && <p className="error-message">{error}</p>}

      <button className="primary-button" onClick={saveAccount}>
        Create account
      </button>
    </Modal>
  )
}

function TransactionModal({
  accounts,
  onClose,
}: {
  accounts: Account[]
  onClose: () => void
}) {
  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [category, setCategory] = useState(categories[0])
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  async function saveTransaction() {
    const numericAmount = Number(amount)

    if (!accountId) {
      setError('Please choose an account.')
      return
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }

    await db.transactions.add({
      id: makeId(),
      type,
      amount: Math.round(numericAmount * 100),
      accountId,
      category: type === 'expense' ? category : null,
      financialDate: today(),
      description: description.trim() || null,
      voided: false,
    })

    await db.profiles.update('profile', {
      currencyLocked: true,
    })

    onClose()
  }

  return (
    <Modal title="Add transaction" onClose={onClose}>
      <div className="toggle-group">
        <button
          className={type === 'expense' ? 'active' : ''}
          onClick={() => setType('expense')}
        >
          Expense
        </button>

        <button
          className={type === 'income' ? 'active' : ''}
          onClick={() => setType('income')}
        >
          Income
        </button>
      </div>

      <label>
        Amount
        <input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="0.00"
        />
      </label>

      <label>
        Account
        <select
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </label>

      {type === 'expense' && (
        <label>
          Category
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      )}

      <label>
        Description
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional note"
        />
      </label>

      {error && <p className="error-message">{error}</p>}

      <button className="primary-button" onClick={saveTransaction}>
        Record {type}
      </button>
    </Modal>
  )
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>

          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="form-stack">{children}</div>
      </div>
    </div>
  )
}

function Panel({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow tiny">OVERVIEW</p>
          <h2>{title}</h2>
        </div>

        {action}
      </div>

      {children}
    </section>
  )
}

function Metric({
  label,
  value,
  tone,
  prefix = '',
}: {
  label: string
  value: string
  tone?: 'positive' | 'negative'
  prefix?: string
}) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong className={tone ?? ''}>
        {prefix}
        {value}
      </strong>
    </div>
  )
}

function AccountRow({
  account,
  transactions,
  currency,
}: {
  account: Account
  transactions: Transaction[]
  currency: string
}) {
  const balance = getAccountBalance(account, transactions)

  return (
    <div className="list-row">
      <div>
        <strong>{account.name}</strong>
        <small>{account.type.replace('_', ' ')}</small>
      </div>

      <strong>{formatCurrency(balance, currency)}</strong>
    </div>
  )
}

function TransactionRow({
  transaction,
  currency,
}: {
  transaction: Transaction
  currency: string
}) {
  const title =
    transaction.description ||
    transaction.category ||
    (transaction.type === 'income' ? 'Income' : 'Expense')

  return (
    <div className="list-row">
      <div>
        <strong>{title}</strong>
        <small>{transaction.financialDate}</small>
      </div>

      <strong className={transaction.type === 'income' ? 'positive' : 'negative'}>
        {transaction.type === 'income' ? '+' : '-'}
        {formatCurrency(transaction.amount, currency)}
      </strong>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="empty-state">
      <p>{message}</p>
    </div>
  )
}

function getAccountBalance(
  account: Account,
  transactions: Transaction[],
) {
  const accountTransactions = transactions.filter(
    (transaction) => transaction.accountId === account.id,
  )

  return accountTransactions.reduce(
    (balance, transaction) =>
      balance +
      (transaction.type === 'income'
        ? transaction.amount
        : -transaction.amount),
    account.openingBalance,
  )
}
