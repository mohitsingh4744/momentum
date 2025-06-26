'use client'

import React, { useState } from 'react'
import { trpc } from '@/lib/trpc/client'
import { useRealtimeStreak } from '@/hooks/useRealtimeStreak'

const samplePrompts = [
  'What was your biggest achievement today?',
  'What challenged you the most?',
  'What are you grateful for today?',
  'What would you like to improve tomorrow?',
]

export function ReflectionForm() {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // tRPC mutation for saving reflections
  const saveReflectionMutation = trpc.reflections.saveReflection.useMutation({
    onSuccess: () => {
      setAnswers({})
      setIsSubmitting(false)
    },
    onError: (error) => {
      console.error('Failed to save reflection:', error)
      setIsSubmitting(false)
    },
  })

  // Realtime streak hook
  const { streak, isLoading: streakLoading } = useRealtimeStreak()

  const handleAnswerChange = (question: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [question]: answer,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (Object.keys(answers).length === 0) {
      alert('Please answer at least one question')
      return
    }

    setIsSubmitting(true)
    saveReflectionMutation.mutate({
      answers,
      date: new Date().toISOString(),
    })
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Daily Reflection</h2>
        <div className="text-right">
          <div className="text-sm text-gray-600">Current Streak</div>
          <div className="text-2xl font-bold text-blue-600">
            {streakLoading ? '...' : streak} 🔥
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {samplePrompts.map((prompt, index) => (
          <div key={index}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {prompt}
            </label>
            <textarea
              value={answers[prompt] || ''}
              onChange={(e) => handleAnswerChange(prompt, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Share your thoughts..."
              rows={3}
            />
          </div>
        ))}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || Object.keys(answers).length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Saving...' : 'Submit Reflection'}
          </button>
        </div>
      </form>

      {saveReflectionMutation.isError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 text-sm">
            Failed to save reflection. Please try again.
          </p>
        </div>
      )}

      {saveReflectionMutation.isSuccess && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-700 text-sm">
            Reflection saved successfully! Your streak has been updated.
          </p>
        </div>
      )}
    </div>
  )
} 