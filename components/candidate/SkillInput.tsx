'use client'

import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface SkillInputProps {
  skills: string[]
  onChange: (skills: string[]) => void
  disabled?: boolean
}

export function SkillInput({ skills, onChange, disabled = false }: SkillInputProps) {
  const [inputValue, setInputValue] = useState('')

  function addSkill(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return
    if (skills.some(s => s.toLowerCase() === trimmed.toLowerCase())) return
    onChange([...skills, trimmed])
    setInputValue('')
  }

  function removeSkill(skill: string) {
    onChange(skills.filter(s => s !== skill))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addSkill(inputValue)
    }
    if (e.key === 'Backspace' && !inputValue && skills.length > 0) {
      removeSkill(skills[skills.length - 1])
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a skill and press Enter — e.g. Python, React, SQL"
          disabled={disabled}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addSkill(inputValue)}
          disabled={disabled || !inputValue.trim()}
        >
          Add
        </Button>
      </div>

      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {skills.map(skill => (
            <Badge key={skill} variant="secondary" className="gap-1 pr-1">
              {skill}
              <button
                type="button"
                onClick={() => removeSkill(skill)}
                disabled={disabled}
                className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10 disabled:pointer-events-none"
                aria-label={`Remove ${skill}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {skills.length === 0
          ? 'Add at least 3 skills for best results'
          : `${skills.length} skill${skills.length !== 1 ? 's' : ''} added${skills.length < 3 ? ' — add more for better analysis' : ''}`}
      </p>
    </div>
  )
}
