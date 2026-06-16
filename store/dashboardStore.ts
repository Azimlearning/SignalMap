'use client'
import { create } from 'zustand'
import type { DashboardFilters, SkillDemand } from '@/lib/types'

interface PipelineStatus {
  seedJobs: number
  scrapedJobs: number
  totalJobs: number
  snapshotDates: string[]
  latestSnapshot: string | null
  dataFreshness: 'seed-only' | 'live'
}

interface DashboardState {
  filters: DashboardFilters
  skillDemands: SkillDemand[]
  trendingSkills: SkillDemand[]
  totalPostings: number
  lastFetched: Date | null
  isLoadingSkills: boolean
  isLoadingTrending: boolean
  error: string | null
  pipelineStatus: PipelineStatus | null
  setFilter: (key: keyof DashboardFilters, value: string) => void
  fetchSkills: () => Promise<void>
  fetchTrending: () => Promise<void>
  init: () => Promise<void>
}

const DEFAULT_FILTERS: DashboardFilters = {
  industry: 'all',
  city: 'all',
  seniority: 'all',
  timeWindow: 'all',
}

export const useDashboardStore = create<DashboardState>()((set, get) => ({
  filters: DEFAULT_FILTERS,
  skillDemands: [],
  trendingSkills: [],
  totalPostings: 0,
  lastFetched: null,
  isLoadingSkills: false,
  isLoadingTrending: false,
  error: null,
  pipelineStatus: null,

  setFilter: (key, value) => {
    set(state => ({ filters: { ...state.filters, [key]: value } }))
    get().fetchSkills()
  },

  fetchSkills: async () => {
    const { filters } = get()
    set({ isLoadingSkills: true, error: null })
    try {
      const params = new URLSearchParams()
      if (filters.industry !== 'all') params.set('industry', filters.industry)
      if (filters.city !== 'all') params.set('city', filters.city)
      if (filters.seniority !== 'all') params.set('seniority', filters.seniority)
      params.set('limit', '20')

      const res = await fetch(`/api/data/skills?${params}`)
      const json = (await res.json()) as { success: boolean; data: SkillDemand[]; error?: string }
      if (!json.success) throw new Error(json.error ?? 'Failed to load skills')
      set({ skillDemands: json.data, isLoadingSkills: false, lastFetched: new Date() })
    } catch (err) {
      set({
        isLoadingSkills: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  },

  fetchTrending: async () => {
    set({ isLoadingTrending: true })
    try {
      const res = await fetch('/api/data/trending?limit=5')
      const json = (await res.json()) as { success: boolean; data: SkillDemand[]; error?: string }
      if (!json.success) throw new Error(json.error ?? 'Failed to load trending')
      set({ trendingSkills: json.data, isLoadingTrending: false })
    } catch {
      set({ isLoadingTrending: false })
    }
  },

  init: async () => {
    await Promise.all([get().fetchSkills(), get().fetchTrending()])
    try {
      const res = await fetch('/api/data/industries')
      const json = (await res.json()) as { success: boolean; data: Array<{ postingCount: number }> }
      if (json.success) {
        const total = json.data.reduce((sum, s) => sum + s.postingCount, 0)
        set({ totalPostings: total })
      }
    } catch {
      // non-fatal
    }
    try {
      const res = await fetch('/api/pipeline/refresh')
      const json = (await res.json()) as { success: boolean; data: PipelineStatus }
      if (json.success) set({ pipelineStatus: json.data })
    } catch {
      // non-fatal
    }
  },
}))
