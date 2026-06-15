'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SkillInput } from './SkillInput'
import { FitScoreCard } from './FitScoreCard'
import type { ApiResponse, CandidateAnalysis } from '@/lib/types'

type AnalysisState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: CandidateAnalysis }
  | { status: 'error'; message: string }

export function FitAnalyser() {
  const [skills, setSkills] = useState<string[]>([])
  const [state, setState] = useState<AnalysisState>({ status: 'idle' })

  async function handleAnalyse() {
    if (skills.length === 0) return
    setState({ status: 'loading' })

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skills }),
      })

      const json = (await res.json()) as ApiResponse<CandidateAnalysis>

      if (!json.success || !json.data) {
        throw new Error(json.error ?? 'Analysis failed')
      }

      setState({ status: 'success', data: json.data })
    } catch (error) {
      setState({
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Something went wrong. Please try again.',
      })
    }
  }

  const isLoading = state.status === 'loading'

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl text-brand-primary">Personal Fit Analyser</CardTitle>
        <CardDescription>
          Enter your skills to see how you match against live Malaysian job market demand
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <SkillInput skills={skills} onChange={setSkills} disabled={isLoading} />

        <Button
          onClick={handleAnalyse}
          disabled={skills.length === 0 || isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? 'Analysing market fit…' : 'Analyse My Fit →'}
        </Button>

        {/* C-08 — loading skeleton */}
        {isLoading && (
          <div className="space-y-3 pt-2">
            <div className="flex gap-4">
              <Skeleton className="size-32 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2 pt-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        )}

        {/* C-09 — error state */}
        {state.status === 'error' && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <span className="font-medium">Analysis failed: </span>
            {state.message}
          </div>
        )}

        {state.status === 'success' && <FitScoreCard analysis={state.data} />}
      </CardContent>
    </Card>
  )
}
