import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { HouseholdData } from '../types/db'
import { dataApi, type NewRow, type TableName } from '../lib/data'

interface HouseholdContextValue {
  data: HouseholdData | null
  loading: boolean
  error: string | null
  refresh(): Promise<void>
  insert<T extends TableName>(table: T, row: NewRow<T>): Promise<void>
  update<T extends TableName>(table: T, id: string, patch: Partial<NewRow<T>>): Promise<void>
  remove(table: TableName, id: string): Promise<void>
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null)

export function HouseholdDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<HouseholdData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const fresh = await dataApi.fetchAll()
      setData(fresh)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value: HouseholdContextValue = {
    data,
    loading,
    error,
    refresh,
    async insert(table, row) {
      await dataApi.insert(table, row)
      await refresh()
    },
    async update(table, id, patch) {
      await dataApi.update(table, id, patch)
      await refresh()
    },
    async remove(table, id) {
      await dataApi.remove(table, id)
      await refresh()
    },
  }

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>
}

export function useHouseholdData(): HouseholdContextValue {
  const ctx = useContext(HouseholdContext)
  if (!ctx) throw new Error('useHouseholdData must be used within HouseholdDataProvider')
  return ctx
}
