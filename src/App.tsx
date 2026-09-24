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

const countries = [
  ['United Arab Emirates', 'AED'],
  ['Australia', 'AUD'],
  ['Brazil', 'BRL'],
  ['Canada', 'CAD'],
  ['China', 'CNY'],
  ['Egypt', 'EGP'],
  ['France', 'EUR'],
  ['Germany', 'EUR'],
  ['India', 'INR'],
  ['Indonesia', 'IDR'],
  ['Italy', 'EUR'],
  ['Japan', 'JPY'],
  ['Kenya', 'KES'],
  ['Mexico', 'MXN'],
  ['Netherlands', 'EUR'],
  ['New Zealand', 'NZD'],
  ['Nigeria', 'NGN'],
  ['Pakistan', 'PKR'],
  ['Philippines', 'PHP'],
  ['Saudi Arabia', 'SAR'],
  ['Singapore', 'SGD'],
  ['South Africa', 'ZAR'],
  ['South Korea', 'KRW'],
  ['Spain', 'EUR'],
  ['Switzerland', 'CHF'],
  ['Turkey', 'TRY'],
  ['United Kingdom', 'GBP'],
  ['United States', 'USD'],
] as const

const currencies = [
  ['AED', 'UAE dirham'],
  ['AUD', 'Australian dollar'],
  ['BRL', 'Brazilian real'],
  ['CAD', 'Canadian dollar'],
  ['CHF', 'Swiss franc'],
  ['CNY', 'Chinese yuan'],
  ['EGP', 'Egyptian pound'],
  ['EUR', 'Euro'],
  ['GBP', 'British pound'],
  ['IDR', 'Indonesian rupiah'],
  ['INR', 'Indian rupee'],
  ['JPY', 'Japanese yen'],
  ['KES', 'Kenyan shilling'],
  ['KRW', 'South Korean won'],
  ['MXN', 'Mexican peso'],
  ['NGN', 'Nigerian naira'],
  ['NZD', 'New Zealand dollar'],
  ['PHP', 'Philippine peso'],
  ['PKR', 'Pakistani rupee'],
  ['SAR', 'Saudi riyal'],
  ['SGD', 'Singapore dollar'],
  ['TRY', 'Turkish lira'],
  ['USD', 'US dollar'],
  ['ZAR', 'South African rand'],
] as const

type DashboardView = 'overview' | 'accounts' | 'activity'

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeView, setActiveView] = useState<DashboardView>('overview')
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

        <div className="topbar-actions">
          <div className="fwx-tag">Powered by FWXplus</div>
          <button
            className="menu-button"
            aria-label="Open navigation menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="side-menu-overlay" onClick={() => setMenuOpen(false)}>
          <aside
            className="side-menu"
            aria-label="Navigation menu"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="side-menu-header">
              <div>
                <p className="eyebrow tiny">MONEVO</p>
                <h2>Your workspace</h2>
              </div>
              <button
                className="close-button"
                aria-label="Close navigation menu"
                onClick={() => setMenuOpen(false)}
              >
                ×
              </button>
            </div>
            <nav className="side-menu-nav">
              <button
                className={activeView === 'overview' ? 'active' : ''}
                onClick={() => {
                  setActiveView('overview')
                  setMenuOpen(false)
                }}
              >
                Overview
              </button>
              <button
                className={activeView === 'accounts' ? 'active' : ''}
                onClick={() => {
                  setActiveView('accounts')
                  setMenuOpen(false)
                }}
              >
                Accounts
              </button>
              <button
                className={activeView === 'activity' ? 'active' : ''}
                onClick={() => {
                  setActiveView('activity')
                  setMenuOpen(false)
                }}
              >
                Recent activity
              </button>
            </nav>
            <div className="side-menu-note">
              <strong>Private by design.</strong>
              <p>Your financial data stays stored locally on this device.</p>
            </div>
          </aside>
        </div>
      )}

      <main className="content-wrap">
        {activeView === 'overview' && (
          <OverviewView
            accounts={accounts}
            currency={currency}
            expenses={expenses}
            income={income}
            net={net}
            transactions={transactions}
            onViewActivity={() => setActiveView('activity')}
          />
        )}

        {activeView === 'accounts' && (
          <AccountsView
            accounts={accounts}
            currency={currency}
            transactions={transactions}
          />
        )}

        {activeView === 'activity' && (
          <ActivityView
            accounts={accounts}
            currency={currency}
            transactions={transactions}
          />
        )}
      </main>
    </div>
  )
}

function ViewHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <section className="view-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="subtext">{description}</p>
      </div>
      {action}
    </section>
  )
}

function OverviewView({
  accounts,
  currency,
  expenses,
  income,
  net,
  transactions,
  onViewActivity,
}: {
  accounts: Account[]
  currency: string
  expenses: number
  income: number
  net: number
  transactions: Transaction[]
  onViewActivity: () => void
}) {
  return (
    <>
      <ViewHeader
        eyebrow={new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}
        title="Understand your money."
        description="A clear, private, local-first view of your financial progress."
        action={<AddTransactionButton accounts={accounts} />}
      />
      <section className="metrics-grid">
        <Metric label="Income" value={formatCurrency(income, currency)} tone="positive" />
        <Metric label="Spent" value={formatCurrency(expenses, currency)} tone="negative" />
        <Metric
          label="Net this month"
          value={formatCurrency(Math.abs(net), currency)}
          tone={net >= 0 ? 'positive' : 'negative'}
          prefix={net >= 0 ? '+' : '-'}
        />
        <Metric label="Accounts" value={String(accounts.length)} />
      </section>
      <section className="snapshot-grid">
        <div className="snapshot-card">
          <p className="eyebrow tiny">ACCOUNT SNAPSHOT</p>
          <strong>{accounts.length === 0 ? 'No accounts yet' : `${accounts.length} account${accounts.length === 1 ? '' : 's'}`}</strong>
          <p>{accounts.length === 0 ? 'Add your first account to see balances here.' : 'Keep your balances organized in one place.'}</p>
        </div>
        <div className="snapshot-card">
          <p className="eyebrow tiny">LATEST ACTIVITY</p>
          <strong>{transactions.length === 0 ? 'No transactions yet' : transactions[0].description || transactions[0].category || 'Latest transaction'}</strong>
          <p>{transactions.length === 0 ? 'Your recent activity will appear here.' : `${transactions.length} recorded transaction${transactions.length === 1 ? '' : 's'}`}</p>
          <button className="text-button" onClick={onViewActivity}>View all activity →</button>
        </div>
      </section>
    </>
  )
}

function AccountsView({
  accounts,
  currency,
  transactions,
}: {
  accounts: Account[]
  currency: string
  transactions: Transaction[]
}) {
  return (
    <>
      <ViewHeader
        eyebrow="YOUR MONEY"
        title="Accounts"
        description="Track the balances that make up your financial picture."
        action={<AddAccountButton />}
      />
      <section className="single-panel">
        <Panel title="All accounts">
          {accounts.length === 0 ? (
            <EmptyState message="Add an account to start tracking your money." />
          ) : (
            accounts.map((account) => (
              <AccountRow key={account.id} account={account} transactions={transactions} currency={currency} />
            ))
          )}
        </Panel>
      </section>
    </>
  )
}

function ActivityView({
  accounts,
  currency,
  transactions,
}: {
  accounts: Account[]
  currency: string
  transactions: Transaction[]
}) {
  return (
    <>
      <ViewHeader
        eyebrow="YOUR MONEY"
        title="Recent activity"
        description="Review everything you have earned and spent."
        action={<AddTransactionButton accounts={accounts} />}
      />
      <section className="single-panel">
        <Panel title="Transactions">
          {transactions.length === 0 ? (
            <EmptyState message="No transactions yet. Add one to start recording activity." />
          ) : (
            transactions.map((transaction) => (
              <TransactionRow key={transaction.id} transaction={transaction} currency={currency} />
            ))
          )}
        </Panel>
      </section>
    </>
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
            <select
              value={country}
              onChange={(event) => {
                const selectedCountry = event.target.value
                setCountry(selectedCountry)
                const matchingCurrency = countries.find(
                  ([name]) => name === selectedCountry,
                )?.[1]
                if (matchingCurrency) setCurrency(matchingCurrency)
              }}
            >
              {countries.map(([name, code]) => (
                <option key={name} value={name}>
                  {name} ({code})
                </option>
              ))}
            </select>
          </label>

          <label>
            Primary currency
            <select
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
            >
              {currencies.map(([code, name]) => (
                <option key={code} value={code}>
                  {code} — {name}
                </option>
              ))}
            </select>
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
  id,
  children,
}: {
  title: string
  action?: ReactNode
  id?: string
  children: ReactNode
}) {
  return (
    <section className="panel" id={id}>
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
