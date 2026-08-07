import type {
  CardStatement,
  CreditCard,
  FixedItem,
  HouseholdData,
  IncomeSource,
  OtherSpend,
} from '../types/db'
import { supabase } from './supabase'
import { loadDemoData, saveDemoData } from './demoData'

export interface TableRowMap {
  fixed_items: FixedItem
  income_sources: IncomeSource
  credit_cards: CreditCard
  card_statements: CardStatement
  other_spend: OtherSpend
}

export type TableName = keyof TableRowMap
export type NewRow<T extends TableName> = Omit<TableRowMap[T], 'id' | 'created_at'>

export interface DataApi {
  fetchAll(): Promise<HouseholdData>
  insert<T extends TableName>(table: T, row: NewRow<T>): Promise<void>
  update<T extends TableName>(table: T, id: string, patch: Partial<NewRow<T>>): Promise<void>
  remove(table: TableName, id: string): Promise<void>
}

const TABLE_TO_KEY: Record<TableName, keyof HouseholdData> = {
  fixed_items: 'fixedItems',
  income_sources: 'incomeSources',
  credit_cards: 'creditCards',
  card_statements: 'cardStatements',
  other_spend: 'otherSpend',
}

function friendlyDbError(error: { code?: string; message: string }): string {
  if (error.code === '23505') {
    return 'That record already exists. Try updating it instead.'
  }
  return error.message
}

function createSupabaseApi(): DataApi {
  const client = supabase!
  return {
    async fetchAll() {
      const [fixedItems, incomeSources, creditCards, cardStatements, otherSpend] =
        await Promise.all([
          client.from('fixed_items').select('*').order('created_at'),
          client.from('income_sources').select('*').order('created_at'),
          client.from('credit_cards').select('*').order('created_at'),
          client.from('card_statements').select('*').order('statement_date', { ascending: false }),
          client.from('other_spend').select('*').order('month', { ascending: false }),
        ])
      const failed = [fixedItems, incomeSources, creditCards, cardStatements, otherSpend].find(
        (r) => r.error,
      )
      if (failed?.error) throw new Error(failed.error.message)
      return {
        fixedItems: (fixedItems.data ?? []) as FixedItem[],
        incomeSources: (incomeSources.data ?? []) as IncomeSource[],
        creditCards: (creditCards.data ?? []) as CreditCard[],
        cardStatements: (cardStatements.data ?? []) as CardStatement[],
        otherSpend: (otherSpend.data ?? []) as OtherSpend[],
      }
    },
    // Payloads are cast at this boundary: without generated Database types,
    // supabase-js can't type dynamic table names. DataApi keeps callers safe.
    async insert(table, row) {
      const { error } = await client.from(table).insert(row as never)
      if (error) throw new Error(friendlyDbError(error))
    },
    async update(table, id, patch) {
      const { error } = await client.from(table).update(patch as never).eq('id', id)
      if (error) throw new Error(error.message)
    },
    async remove(table, id) {
      const { error } = await client.from(table).delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
  }
}

/**
 * Demo-mode implementation backed by localStorage so the app is fully
 * explorable (and edits persist) before Supabase is connected.
 */
function createDemoApi(): DataApi {
  const store = loadDemoData()

  function rows(table: TableName): { id: string }[] {
    return store[TABLE_TO_KEY[table]] as { id: string }[]
  }

  return {
    async fetchAll() {
      return structuredClone(store)
    },
    async insert(table, row) {
      // Mirror the DB unique constraint: card statements are one per (card_id, statement_date).
      if (table === 'card_statements') {
        const r = row as unknown as { card_id: string; statement_date: string; balance: number }
        const existing = store.cardStatements.find(
          (s) => s.card_id === r.card_id && s.statement_date === r.statement_date,
        )
        if (existing) {
          existing.balance = r.balance
          saveDemoData(store)
          return
        }
      }
      rows(table).push({
        ...row,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      } as never)
      saveDemoData(store)
    },
    async update(table, id, patch) {
      const row = rows(table).find((r) => r.id === id)
      if (row) Object.assign(row, patch)
      saveDemoData(store)
    },
    async remove(table, id) {
      const list = rows(table)
      const idx = list.findIndex((r) => r.id === id)
      if (idx >= 0) list.splice(idx, 1)
      if (table === 'credit_cards') {
        // Mirror the FK cascade: deleting a card deletes its statements.
        store.cardStatements = store.cardStatements.filter((s) => s.card_id !== id)
      }
      saveDemoData(store)
    },
  }
}

export const dataApi: DataApi = supabase ? createSupabaseApi() : createDemoApi()
