import type { CandidateAnalysis } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface FitScoreCardProps {
  analysis: CandidateAnalysis
}

function ScoreCircle({ score }: { score: number }) {
  const radius = 48
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  const color =
    score >= 71
      ? 'var(--color-brand-rising)'
      : score >= 41
        ? '#D97706'
        : 'var(--color-brand-falling)'

  return (
    <div className="relative flex shrink-0 items-center justify-center size-32">
      <svg width="128" height="128" className="absolute inset-0 -rotate-90">
        <circle
          cx="64"
          cy="64"
          r={radius}
          className="stroke-muted fill-none"
          strokeWidth="10"
        />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="relative flex flex-col items-center leading-none">
        <span className="text-3xl font-bold" style={{ color }}>
          {score}
        </span>
        <span className="mt-1 text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  )
}

export function FitScoreCard({ analysis }: FitScoreCardProps) {
  const topMissing = analysis.missingHighDemandSkills[0]

  return (
    <div className="space-y-4">
      {/* Score + narrative */}
      <div className="flex items-start gap-6">
        <ScoreCircle score={analysis.matchScore} />
        <div className="flex-1 pt-1">
          <p className="mb-1 text-sm font-medium">Market Positioning</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {analysis.marketPositioning}
          </p>
        </div>
      </div>

      {/* Matched / Missing */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm text-brand-rising">
              ✅ You have ({analysis.matchedSkills.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analysis.matchedSkills.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {analysis.matchedSkills.map(skill => (
                  <Badge
                    key={skill}
                    variant="outline"
                    className="border-brand-rising/40 text-xs text-brand-rising"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">None matched yet</span>
            )}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm text-brand-falling">❌ High-demand gaps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {analysis.missingHighDemandSkills.slice(0, 5).map(skill => (
                <div key={skill.name} className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium">{skill.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    #{skill.demandRank} · ~{skill.estimatedLearningWeeks}w
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommended roles */}
      {analysis.recommendedRoles.length > 0 && (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm">🎯 Best fit roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analysis.recommendedRoles.slice(0, 3).map(role => (
                <div key={role.title} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{role.title}</div>
                    <div className="text-xs capitalize text-muted-foreground">
                      {role.industry} · {role.salaryRange}
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {role.matchPercentage}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quickest win hint */}
      {topMissing?.resourceSuggestion && (
        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Quickest win: </span>
          {topMissing.name} — {topMissing.resourceSuggestion}
        </div>
      )}
    </div>
  )
}
