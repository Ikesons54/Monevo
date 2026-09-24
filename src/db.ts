import Dexie, { type EntityTable } from 'dexie'

export type AccountType = 'cash' | 'bank' | 'credit_card' | 'wallet' | 'other'
export type TransactionType = 'expense' | 'income'

export interface Profile {
  id: 'profile'
  country: string
  language: string
  primaryCurrency: string
  onboardingCompleted: boolean
  currencyLocked: boolean
}

export interface Account {
  id: string
  name: string
  type: AccountType
  openingBalance: number
  openingBalanceDate: string
  archived: boolean
}

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  accountId: string
  category: string | null
  financialDate: string
  merchant: string | null
  description: string | null
  notes: string | null
  voided: boolean
}

export interface AccountMovement {
  id: string
  accountId: string
  amount: number
  financialDate: string
  eventType: 'opening_balance' | 'transaction' | 'transfer'
  sourceId: string
  createdAt: string
  reversedBy: string | null
}

export interface Category {
  id: string
  name: string
  archived: boolean
}

export interface Transfer {
  id: string
  fromAccountId: string
  toAccountId: string
  amount: number
  financialDate: string
  description: string | null
  status: 'completed' | 'voided'
}

export type ContactType = 'person' | 'merchant' | 'company' | 'other'

export interface Contact {
  id: string
  name: string
  type: ContactType
  archived: boolean
}

export interface Obligation {
  id: string
  contactId: string
  amount: number
  direction: 'owed_to_me' | 'i_owe'
  dueDate: string | null
  description: string | null
  status: 'open' | 'settled'
  createdAt: string
}

export interface SharedExpense {
  id: string
  accountId: string
  contactId: string
  amount: number
  description: string | null
  financialDate: string
  status: 'open' | 'settled'
}

class MonevoDB extends Dexie {
  profiles!: EntityTable<Profile, 'id'>
  accounts!: EntityTable<Account, 'id'>
  transactions!: EntityTable<Transaction, 'id'>
  accountMovements!: EntityTable<AccountMovement, 'id'>
  categories!: EntityTable<Category, 'id'>
  transfers!: EntityTable<Transfer, 'id'>
  contacts!: EntityTable<Contact, 'id'>
  obligations!: EntityTable<Obligation, 'id'>
  sharedExpenses!: EntityTable<SharedExpense, 'id'>

  constructor() {
    super('monevo-db')
    this.version(1).stores({
      profiles: 'id',
      accounts: 'id, archived',
      transactions: 'id, type, accountId, financialDate, voided',
    })
    this.version(2)
      .stores({
        profiles: 'id',
        accounts: 'id, archived',
        transactions: 'id, type, accountId, financialDate, voided',
        accountMovements: 'id, accountId, financialDate, eventType, sourceId',
        categories: 'id, name, archived',
        transfers: 'id, fromAccountId, toAccountId, financialDate, status',
      })
      .upgrade(async (transaction) => {
        const accounts = transaction.table('accounts')
        const savedAccounts = await accounts.toArray() as Account[]
        const movements = transaction.table('accountMovements')
        const now = new Date().toISOString()

        for (const account of savedAccounts) {
          await movements.add({
            id: `opening-${account.id}`,
            accountId: account.id,
            amount: account.openingBalance,
            financialDate: account.openingBalanceDate,
            eventType: 'opening_balance',
            sourceId: account.id,
            createdAt: now,
            reversedBy: null,
          })
        }

        const savedTransactions = await transaction.table('transactions').toArray() as Transaction[]
        for (const item of savedTransactions) {
          await movements.add({
            id: `transaction-${item.id}`,
            accountId: item.accountId,
            amount: item.type === 'income' ? item.amount : -item.amount,
            financialDate: item.financialDate,
            eventType: 'transaction',
            sourceId: item.id,
            createdAt: now,
            reversedBy: null,
          })
        }

        const categories = transaction.table('categories')
        for (const name of ['Food', 'Transport', 'Housing', 'Entertainment', 'Health', 'Shopping', 'Other']) {
          await categories.add({
            id: name.toLowerCase().replaceAll(' ', '-'),
            name,
            archived: false,
          })
        }
      })
    this.version(3).stores({
      profiles: 'id',
      accounts: 'id, archived',
      transactions: 'id, type, accountId, financialDate, voided',
      accountMovements: 'id, accountId, financialDate, eventType, sourceId',
      categories: 'id, name, archived',
      transfers: 'id, fromAccountId, toAccountId, financialDate, status',
      contacts: 'id, type, archived',
      obligations: 'id, contactId, direction, status, dueDate',
      sharedExpenses: 'id, accountId, contactId, financialDate, status',
    })
  }
}

export const db = new MonevoDB()

export const makeId = () => crypto.randomUUID()
export const today = () => new Date().toISOString().slice(0, 10)

export const formatCurrency = (value: number, currency = 'AED') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100)
