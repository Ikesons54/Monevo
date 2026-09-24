import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type ReactNode } from 'react'
import {
  db,
  formatCurrency,
  makeId,
  today,
  type Account,
  type AccountType,
  type AccountMovement,
  type Category,
  type Contact,
  type ContactType,
  type Obligation,
  type SharedExpense,
  type Transfer,
  type Transaction,
  type TransactionType,
} from './db'

const defaultCategories = [
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

type DashboardView = 'overview' | 'accounts' | 'activity' | 'transfers' | 'contacts' | 'obligations' | 'shared-expenses'

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
  const categories =
    useLiveQuery(async () => {
      const savedCategories = await db.categories.toArray()
      return savedCategories.filter((category) => !category.archived)
    }, []) ?? []
  const movements =
    useLiveQuery(async () => db.accountMovements.toArray(), []) ?? []
  const transfers = useLiveQuery(async () => db.transfers.toArray(), []) ?? []
  const contacts = useLiveQuery(async () => (await db.contacts.toArray()).filter((contact) => !contact.archived), []) ?? []
  const obligations = useLiveQuery(async () => db.obligations.toArray(), []) ?? []
  const sharedExpenses = useLiveQuery(async () => db.sharedExpenses.toArray(), []) ?? []

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
              <button className={activeView === 'transfers' ? 'active' : ''} onClick={() => { setActiveView('transfers'); setMenuOpen(false) }}>
                Transfers
              </button>
              <button className={activeView === 'contacts' ? 'active' : ''} onClick={() => { setActiveView('contacts'); setMenuOpen(false) }}>
                Contacts
              </button>
              <button className={activeView === 'obligations' ? 'active' : ''} onClick={() => { setActiveView('obligations'); setMenuOpen(false) }}>
                Obligations
              </button>
              <button className={activeView === 'shared-expenses' ? 'active' : ''} onClick={() => { setActiveView('shared-expenses'); setMenuOpen(false) }}>
                Shared expenses
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
            categories={categories}
            onViewActivity={() => setActiveView('activity')}
          />
        )}

        {activeView === 'accounts' && (
          <AccountsView
            accounts={accounts}
            currency={currency}
            movements={movements}
          />
        )}

        {activeView === 'activity' && (
          <ActivityView
            accounts={accounts}
            currency={currency}
            transactions={transactions}
            categories={categories}
          />
        )}
        {activeView === 'transfers' && <TransfersView accounts={accounts} currency={currency} transfers={transfers} />}
        {activeView === 'contacts' && <ContactsView contacts={contacts} />}
        {activeView === 'obligations' && <ObligationsView contacts={contacts} currency={currency} obligations={obligations} />}
        {activeView === 'shared-expenses' && <SharedExpensesView accounts={accounts} contacts={contacts} currency={currency} sharedExpenses={sharedExpenses} />}
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
  categories,
  onViewActivity,
}: {
  accounts: Account[]
  currency: string
  expenses: number
  income: number
  net: number
  transactions: Transaction[]
  categories: Category[]
  onViewActivity: () => void
}) {
  return (
    <>
      <ViewHeader
        eyebrow={new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()}
        title="Understand your money."
        description="A clear, private, local-first view of your financial progress."
        action={<AddTransactionButton accounts={accounts} categories={categories} />}
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
  movements,
}: {
  accounts: Account[]
  currency: string
  movements: AccountMovement[]
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
              <AccountRow key={account.id} account={account} movements={movements} currency={currency} />
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
  categories,
}: {
  accounts: Account[]
  currency: string
  transactions: Transaction[]
  categories: Category[]
}) {
  return (
    <>
      <ViewHeader
        eyebrow="YOUR MONEY"
        title="Recent activity"
        description="Review everything you have earned and spent."
        action={<AddTransactionButton accounts={accounts} categories={categories} />}
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

function TransfersView({ accounts, currency, transfers }: { accounts: Account[]; currency: string; transfers: Transfer[] }) {
  return (
    <>
      <ViewHeader eyebrow="MOVE MONEY" title="Transfers" description="Move money between your accounts without changing income or spending." action={<AddTransferButton accounts={accounts} />} />
      <section className="single-panel">
        <Panel title="Transfer history">
          {transfers.length === 0 ? <EmptyState message="No transfers yet." /> : transfers.map((transfer) => (
            <div className="list-row" key={transfer.id}>
              <div><strong>{accountName(accounts, transfer.fromAccountId)} → {accountName(accounts, transfer.toAccountId)}</strong><small>{transfer.financialDate}{transfer.description ? ` · ${transfer.description}` : ''}</small></div>
              <strong>{formatCurrency(transfer.amount, currency)}</strong>
            </div>
          ))}
        </Panel>
      </section>
    </>
  )
}

function ContactsView({ contacts }: { contacts: Contact[] }) {
  return (
    <>
      <ViewHeader eyebrow="PEOPLE & BUSINESSES" title="Contacts" description="Keep merchants, people, and companies connected to your financial records." action={<AddContactButton />} />
      <section className="single-panel"><Panel title="Saved contacts">
        {contacts.length === 0 ? <EmptyState message="No contacts yet." /> : contacts.map((contact) => <div className="list-row" key={contact.id}><div><strong>{contact.name}</strong><small>{contact.type}</small></div></div>)}
      </Panel></section>
    </>
  )
}

function ObligationsView({ contacts, currency, obligations }: { contacts: Contact[]; currency: string; obligations: Obligation[] }) {
  return (
    <>
      <ViewHeader eyebrow="MONEY OWED" title="Obligations" description="Track what others owe you and what you owe them." action={<AddObligationButton contacts={contacts} />} />
      <section className="single-panel"><Panel title="Open obligations">
        {obligations.filter((item) => item.status === 'open').length === 0 ? <EmptyState message="No open obligations." /> : obligations.filter((item) => item.status === 'open').map((item) => (
          <div className="list-row" key={item.id}><div><strong>{contactName(contacts, item.contactId)}</strong><small>{item.direction === 'owed_to_me' ? 'Owes you' : 'You owe'}{item.description ? ` · ${item.description}` : ''}</small></div><strong>{formatCurrency(item.amount, currency)}</strong></div>
        ))}
      </Panel></section>
    </>
  )
}

function SharedExpensesView({ accounts, contacts, currency, sharedExpenses }: { accounts: Account[]; contacts: Contact[]; currency: string; sharedExpenses: SharedExpense[] }) {
  return (
    <>
      <ViewHeader eyebrow="SHARED COSTS" title="Shared expenses" description="Record costs paid on behalf of someone else and follow up later." action={<AddSharedExpenseButton accounts={accounts} contacts={contacts} />} />
      <section className="single-panel"><Panel title="Shared expense history">
        {sharedExpenses.length === 0 ? <EmptyState message="No shared expenses yet." /> : sharedExpenses.map((item) => <div className="list-row" key={item.id}><div><strong>{contactName(contacts, item.contactId)}</strong><small>{item.description || item.financialDate}</small></div><strong>{formatCurrency(item.amount, currency)}</strong></div>)}
      </Panel></section>
    </>
  )
}

function AddTransferButton({ accounts }: { accounts: Account[] }) {
  const [open, setOpen] = useState(false)
  return <><button className="primary-button" disabled={accounts.length < 2} onClick={() => setOpen(true)}>+ Transfer</button>{open && <TransferModal accounts={accounts} onClose={() => setOpen(false)} />}</>
}

function TransferModal({ accounts, onClose }: { accounts: Account[]; onClose: () => void }) {
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id ?? '')
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id ?? '')
  const [amount, setAmount] = useState('')
  const [financialDate, setFinancialDate] = useState(today())
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  async function save() {
    const value = Number(amount)
    if (fromAccountId === toAccountId) return setError('Choose two different accounts.')
    if (!Number.isFinite(value) || value <= 0) return setError('Enter an amount greater than zero.')
    if (financialDate > today()) return setError('Transfers cannot be future-dated.')
    const id = makeId()
    const cents = Math.round(value * 100)
    await db.transfers.add({ id, fromAccountId, toAccountId, amount: cents, financialDate, description: description.trim() || null, status: 'completed' })
    const now = new Date().toISOString()
    await db.accountMovements.bulkAdd([
      { id: makeId(), accountId: fromAccountId, amount: -cents, financialDate, eventType: 'transfer', sourceId: id, createdAt: now, reversedBy: null },
      { id: makeId(), accountId: toAccountId, amount: cents, financialDate, eventType: 'transfer', sourceId: id, createdAt: now, reversedBy: null },
    ])
    onClose()
  }
  return <Modal title="Transfer money" onClose={onClose}>
    <label>From<select value={fromAccountId} onChange={(event) => setFromAccountId(event.target.value)}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
    <label>To<select value={toAccountId} onChange={(event) => setToAccountId(event.target.value)}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
    <label>Amount<input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
    <label>Date<input type="date" max={today()} value={financialDate} onChange={(event) => setFinancialDate(event.target.value)} /></label>
    <label>Description<input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional" /></label>
    {error && <p className="error-message">{error}</p>}<button className="primary-button" onClick={save}>Complete transfer</button>
  </Modal>
}

function AddContactButton() {
  const [open, setOpen] = useState(false)
  return <><button className="primary-button" onClick={() => setOpen(true)}>+ Contact</button>{open && <ContactModal onClose={() => setOpen(false)} />}</>
}

function ContactModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [type, setType] = useState<ContactType>('person')
  const [error, setError] = useState('')
  async function save() {
    if (!name.trim()) return setError('Enter a contact name.')
    await db.contacts.add({ id: makeId(), name: name.trim(), type, archived: false })
    onClose()
  }
  return <Modal title="Add contact" onClose={onClose}><label>Name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Alvin or Carrefour" /></label><label>Type<select value={type} onChange={(event) => setType(event.target.value as ContactType)}><option value="person">Person</option><option value="merchant">Merchant</option><option value="company">Company</option><option value="other">Other</option></select></label>{error && <p className="error-message">{error}</p>}<button className="primary-button" onClick={save}>Save contact</button></Modal>
}

function AddObligationButton({ contacts }: { contacts: Contact[] }) {
  const [open, setOpen] = useState(false)
  return <><button className="primary-button" disabled={contacts.length === 0} onClick={() => setOpen(true)}>+ Obligation</button>{open && <ObligationModal contacts={contacts} onClose={() => setOpen(false)} />}</>
}

function ObligationModal({ contacts, onClose }: { contacts: Contact[]; onClose: () => void }) {
  const [contactId, setContactId] = useState(contacts[0]?.id ?? '')
  const [direction, setDirection] = useState<Obligation['direction']>('owed_to_me')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  async function save() {
    const value = Number(amount)
    if (!contactId) return setError('Choose a contact.')
    if (!Number.isFinite(value) || value <= 0) return setError('Enter an amount greater than zero.')
    await db.obligations.add({ id: makeId(), contactId, amount: Math.round(value * 100), direction, dueDate: null, description: description.trim() || null, status: 'open', createdAt: new Date().toISOString() })
    onClose()
  }
  return <Modal title="Add obligation" onClose={onClose}><label>Contact<select value={contactId} onChange={(event) => setContactId(event.target.value)}>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}</select></label><label>Direction<select value={direction} onChange={(event) => setDirection(event.target.value as Obligation['direction'])}><option value="owed_to_me">They owe me</option><option value="i_owe">I owe them</option></select></label><label>Amount<input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label>Description<input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional" /></label>{error && <p className="error-message">{error}</p>}<button className="primary-button" onClick={save}>Save obligation</button></Modal>
}

function AddSharedExpenseButton({ accounts, contacts }: { accounts: Account[]; contacts: Contact[] }) {
  const [open, setOpen] = useState(false)
  return <><button className="primary-button" disabled={accounts.length === 0 || contacts.length === 0} onClick={() => setOpen(true)}>+ Shared expense</button>{open && <SharedExpenseModal accounts={accounts} contacts={contacts} onClose={() => setOpen(false)} />}</>
}

function SharedExpenseModal({ accounts, contacts, onClose }: { accounts: Account[]; contacts: Contact[]; onClose: () => void }) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [contactId, setContactId] = useState(contacts[0]?.id ?? '')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  async function save() {
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) return setError('Enter an amount greater than zero.')
    await db.sharedExpenses.add({ id: makeId(), accountId, contactId, amount: Math.round(value * 100), description: description.trim() || null, financialDate: today(), status: 'open' })
    onClose()
  }
  return <Modal title="Add shared expense" onClose={onClose}><label>Paid from<select value={accountId} onChange={(event) => setAccountId(event.target.value)}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><label>For contact<select value={contactId} onChange={(event) => setContactId(event.target.value)}>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name}</option>)}</select></label><label>Amount<input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label>Description<input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional" /></label>{error && <p className="error-message">{error}</p>}<button className="primary-button" onClick={save}>Save shared expense</button></Modal>
}

function accountName(accounts: Account[], id: string) {
  return accounts.find((account) => account.id === id)?.name ?? 'Unknown account'
}

function contactName(contacts: Contact[], id: string) {
  return contacts.find((contact) => contact.id === id)?.name ?? 'Unknown contact'
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

function AddTransactionButton({
  accounts,
  categories,
}: {
  accounts: Account[]
  categories: Category[]
}) {
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
          categories={categories}
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

    if (!Number.isFinite(balance)) {
      setError('Enter a valid opening balance.')
      return
    }

    const accountId = makeId()
    await db.accounts.add({
      id: accountId,
      name: cleanName,
      type,
      openingBalance: Math.round(balance * 100),
      openingBalanceDate: today(),
      archived: false,
    })
    await db.accountMovements.add({
      id: makeId(),
      accountId,
      amount: Math.round(balance * 100),
      financialDate: today(),
      eventType: 'opening_balance',
      sourceId: accountId,
      createdAt: new Date().toISOString(),
      reversedBy: null,
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
  categories,
  onClose,
}: {
  accounts: Account[]
  categories: Category[]
  onClose: () => void
}) {
  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [category, setCategory] = useState(categories[0]?.name ?? defaultCategories[0])
  const [financialDate, setFinancialDate] = useState(today())
  const [merchant, setMerchant] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const categoryOptions = categories.length > 0
    ? categories
    : defaultCategories.map((name) => ({ id: name, name, archived: false }))

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

    if (financialDate > today()) {
      setError('Transactions cannot be dated in the future.')
      return
    }

    const transactionId = makeId()
    await db.transactions.add({
      id: transactionId,
      type,
      amount: Math.round(numericAmount * 100),
      accountId,
      category: type === 'expense' ? category : null,
      financialDate,
      merchant: merchant.trim() || null,
      description: description.trim() || null,
      notes: notes.trim() || null,
      voided: false,
    })
    await db.accountMovements.add({
      id: makeId(),
      accountId,
      amount: type === 'income' ? Math.round(numericAmount * 100) : -Math.round(numericAmount * 100),
      financialDate,
      eventType: 'transaction',
      sourceId: transactionId,
      createdAt: new Date().toISOString(),
      reversedBy: null,
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
            {categoryOptions.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label>
        Date
        <input
          type="date"
          max={today()}
          value={financialDate}
          onChange={(event) => setFinancialDate(event.target.value)}
        />
      </label>

      <label>
        Merchant / person
        <input
          value={merchant}
          onChange={(event) => setMerchant(event.target.value)}
          placeholder="Optional"
        />
      </label>

      <label>
        Description
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional note"
        />
      </label>

      <label>
        Notes
        <input
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Optional"
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
  movements,
  currency,
}: {
  account: Account
  movements: AccountMovement[]
  currency: string
}) {
  const balance = movements
    .filter((movement) => movement.accountId === account.id && !movement.reversedBy)
    .reduce((total, movement) => total + movement.amount, 0)

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
