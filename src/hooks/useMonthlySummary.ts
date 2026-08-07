import { useMemo } from 'react'
import { computeTrailingSummaries, type MonthlySummary } from '../lib/summary'
import { useHouseholdData } from './useHouseholdData'

/**
 * Monthly summaries for the trailing `monthsBack` months (oldest first,
 * ending with the current month). Empty array while data is loading.
 */
export function useMonthlySummary(monthsBack: number): MonthlySummary[] {
  const { data } = useHouseholdData()
  return useMemo(() => {
    if (!data) return []
    return computeTrailingSummaries(data, monthsBack)
  }, [data, monthsBack])
}
