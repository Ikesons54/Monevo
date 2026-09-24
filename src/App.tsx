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

const defaultCategories = ['Food', 'Transport', 'Housing', 'Entertainment', 'Health', 'Other']

export default function App() {
  const profile = useLiveQuery(() => db.profiles.get('profile'))
  const accounts =
    useLiveQuery(() => db.accounts.where('archived').equals(0).toArray(), []) ?? []
  const transactions =
    useLiveQuery(() => db.transactions.where('voided').equals(0).reverse().sortBy('financialDate'), []) ?? []

  if (profile === undefined) {
    return <div className="loading">Loading Monevo…</div>
  }

  if (!profile) {
    return <Onboarding />
  }

  const currency = profile.primaryCurrency
  const monthKey = today().slice(0, 7)
  const monthTx = transactions.filter((tx) => tx.financialDate.startsWith(monthKey))
  const income = monthTx.filter((tx) => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0)
  const spent = monthTx.filter((tx) => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0)
  const net = income - spent

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-cluster">
          <div className="brand-mark">M</div>
          <div className="wordmark-block">
            <div className="wordmark">Monevo</div>
          </div>
        </div>
        <div className="fwx-tag">Powered by FWXplus</div>
      </header>

      <main className="content-wrap">
        <section className="hero-panel">
          <div>
            <p className="eyebrow">
              {new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}
            </p>
            <h1>Understand your money.</h1>
            <p className="subtext">
              Build your future with a clear, local-first view of what you earn, spend, owe, and save.
            </p>
          </div>
          <AddTransactionButton accounts={accounts} />
        </section>

        <section className="metrics-grid">
          <Metric label="Income" value={formatCurrency(income, currency)} />
          <Metric label="Spent" value={formatCurrency(spent, currency)} />
          <Metric
            label="Net this month"
            value={formatCurrency(Math.abs(net), currency)}
            tone={net >= 0 ? 'positive' : 'negative'}
            prefix={net >= 0 ? '' : '-'}
          />
          <Metric label="Accounts" value={String(accounts.length)} />
        </section>

        <section className="panel-grid">
          <Panel title="Accounts" action={<AddAccountButton />}>
            {accounts.length === 0 ? (
              <EmptyState message="Add an account to start tracking your money." buttonLabel="Add account" />
            ) : (
              accounts.map((account) => {
                const balance = getAccountBalance(account, transactions)
                return (
                  <div className="list-row" key={account.id}>
                    <div>
                      <strong>{account.name}</strong>
                      <small>{account.type}</small>
                    </div>
                    <strong>{formatCurrency(balance, currency)}</strong>
                  </div>
                )
              })
            )}
          </Panel>

          <Panel title="Recent activity" action={<AddTransactionButton accounts={accounts} />}>
            {transactions.length === 0 ? (
              <EmptyState
                message="No transactions yet. Add one to start recording activity."
                buttonLabel="Add transaction"
              />
            ) : (
              transactions.slice(0, 8).map((tx) => (
                <div className="list-row" key={tx.id}>
                  <div>
                    <strong>{tx.description || tx.category || (tx.type === 'income' ? 'Income' : 'Expense')}</strong>
                    <small>{tx.financialDate}</small>
                  </div>
                  <strong className={tx.type === 'income' ? 'positive' : 'negative'}>
                    {tx.type === 'income' ? '+' : '-'}
                    {formatCurrency(tx.amount, currency)}
                  </strong>
                </div>
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

  const complete = async () => {
    if (!country.trim() || !currency.trim()) {
      setError('Country and currency are required.')
      return
    }

    await db.profiles.put({
      id: 'profile',
      country: country.trim(),
      language: 'en',
      primaryCurrency: currency.toUpperCase(),
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

        <p className="eyebrow">PERSONAL FINANCE</p>
        <h1>Understand your money.</h1>
        <h2>Build your future.</h2>

        <div className="form-stack">
          <label>
            Country
            <input value={country} onChange={(e) => setCountry(e.target.value)} />
          </label>

          <label>
            Primary currency
            <input value={currency} maxLength={3} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
          </label>

          {error && <p className="error-message">{error}</p>}

          <button className="primary-button" onClick={complete}>Get started</button>
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
      <button className="ghost-button" onClick={() => setOpen(true)}>+ Add account</button>
      {open && <AccountModal onClose={() => setOpen(false)} />}
    </>
  )
}

function AddTransactionButton({ accounts }: { accounts: Account[] }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button className="primary-button" onClick={() => setOpen(true)}>+ Add transaction</button>
      {open && <TransactionModal accounts={accounts} onClose={() => setOpen(false)} />}
    </>
  )
}

function AccountModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('cash')
  const [openingBalance, setOpeningBalance] = useState('0')

  const save = async () => {
    if (!name.trim()) return

    await db.accounts.add({
      id: makeId(),
      name: name.trim(),
      type,
      openingBalance: Number(openingBalance) || 0,
      openingBalanceDate: today(),
      archived: false,
    })

    await db.profiles.update('profile', { currencyLocked: true })
    onClose()
  }

  return (
    <Modal onClose={onClose} title="Add account">
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <label>
        Type
        <select value={type} onChange={(e) => setType(e.target.value as AccountType)}>
          <option value="cash">Cash</option>
          <option value="bank">Bank</option>
          <option value="credit_card">Credit card</option>
          <option value="wallet">Wallet</option>
          <option value="other">Other</option>
        </select>
      </label>

      <label>
        Opening balance
        <input type="number" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} />
      </label>

      <button className="primary-button" onClick={save}>Create account</button>
    </Modal>
  )
}

function TransactionModal({ accounts, onClose }: { accounts: Account[]; onClose: () => void }) {
  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [category, setCategory] = useState(defaultCategories[0])
  const [description, setDescription] = useState('')

  const save = async () => {
    if (!accountId || !amount || Number(amount) <= 0) return

    await db.transactions.add({
      id: makeId(),
      type,
      amount: Number(amount),
      accountId,
      category: type === 'expense' ? category : null,
      financialDate: today(),
      description: description || null,
      voided: false,
    })

    await db.profiles.update('profile', { currencyLocked: true })
    onClose()
  }

  return (
    <Modal onClose={onClose} title="Add transaction">
      <div className="toggle-group">
        <button className={type === 'expense' ? 'active' : ''} onClick={() => setType('expense')}>Expense</button>
        <button className={type === 'income' ? 'active' : ''} onClick={() => setType('income')}>Income</button>
      </div>

      <label>
        Amount
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </label>

      <label>
        Account
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>{account.name}</option>
          ))}
        </select>
      </label>

      {type === 'expense' && (
        <label>
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {defaultCategories.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
      )}

      <label>
        Description
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
      </label>

      <button className="primary-button" onClick={save}>Record {type}</button>
    </Modal>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-button" onClick={onClose}>×</button>
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
          <p className="eyebrow tiny">Overview</p>
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
      <strong className={tone || ''}>{prefix}{value}</strong>
    </div>
  )
}

function EmptyState({ message, buttonLabel }: { message: string; buttonLabel: string }) {
  return (
    <div className="empty-state">
      <p>{message}</p>
      <button className="ghost-button">{buttonLabel}</button>
    </div>
  )
}

function getAccountBalance(account: Account, transactions: Transaction[]) {
  const accountTransactions = transactions.filter((tx) => tx.accountId === account.id)
  const delta = accountTransactions.reduce((sum, tx) => {
    return sum + (tx.type === 'income' ? tx.amount : -tx.amount)
  }, 0)
  return account.openingBalance + delta
}
