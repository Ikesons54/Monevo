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
  description: string | null
  voided: boolean
}

class MonevoDB extends Dexie {
  profiles!: EntityTable<Profile, 'id'>
  accounts!: EntityTable<Account, 'id'>
  transactions!: EntityTable<Transaction, 'id'>

  constructor() {
    super('monevo-db')
    this.version(1).stores({
      profiles: 'id',
      accounts: 'id, archived',
      transactions: 'id, type, accountId, financialDate, voided',
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
