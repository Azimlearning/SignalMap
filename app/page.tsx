import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4 text-center">
      <Badge variant="secondary" className="mb-6 text-xs uppercase tracking-widest">
        Talentbank Tech Hackathon 2026
      </Badge>

      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 max-w-3xl leading-tight mb-6">
        See what Malaysia is{" "}
        <span className="text-brand-primary">hiring for.</span>
        <br />
        Know where you{" "}
        <span className="text-brand-teal">fit.</span>
      </h1>

      <p className="text-lg text-gray-600 max-w-2xl mb-10 leading-relaxed">
        SignalMap analyses real Malaysian job postings using Claude AI and surfaces
        the skills, salaries, and roles the market actually needs — so you can
        navigate your career with data, not guesswork.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          href="/dashboard"
          className={cn(
            buttonVariants({ size: "lg" }),
            "bg-brand-primary hover:bg-brand-primary/90 text-white px-8"
          )}
        >
          View Demand Dashboard →
        </Link>
        <Link
          href="/dashboard#analyser"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "px-8")}
        >
          Analyse My Fit
        </Link>
      </div>

      <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg text-center">
        <div>
          <div className="text-3xl font-bold text-brand-primary">50+</div>
          <div className="text-sm text-gray-500 mt-1">Job postings indexed</div>
        </div>
        <div>
          <div className="text-3xl font-bold text-brand-teal">20+</div>
          <div className="text-sm text-gray-500 mt-1">Skills tracked</div>
        </div>
        <div>
          <div className="text-3xl font-bold text-brand-rising">5</div>
          <div className="text-sm text-gray-500 mt-1">Industries covered</div>
        </div>
      </div>
    </div>
  )
}
