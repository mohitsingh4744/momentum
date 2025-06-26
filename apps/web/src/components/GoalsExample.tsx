'use client'

import React, { useState } from 'react'
import { trpc } from '@/lib/trpc/client'

export function GoalsExample() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  // tRPC hooks
  const { data: goals, isLoading: goalsLoading, refetch: refetchGoals } = trpc.goals.listGoals.useQuery()
  const createGoalMutation = trpc.goals.createGoal.useMutation({
    onSuccess: () => {
      refetchGoals()
      setTitle('')
      setDescription('')
    },
  })
  const archiveGoalMutation = trpc.goals.archiveGoal.useMutation({
    onSuccess: () => {
      refetchGoals()
    },
  })

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    createGoalMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
    })
  }

  const handleArchiveGoal = (goalId: string) => {
    archiveGoalMutation.mutate({ goal_id: goalId })
  }

  if (goalsLoading) {
    return <div>Loading goals...</div>
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Goals Management</h2>
      
      {/* Create Goal Form */}
      <form onSubmit={handleCreateGoal} className="mb-8 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Create New Goal</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-1">
              Title *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Enter goal title"
              required
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="Enter goal description"
              rows={3}
            />
          </div>
          <button
            type="submit"
            disabled={createGoalMutation.isPending || !title.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {createGoalMutation.isPending ? 'Creating...' : 'Create Goal'}
          </button>
        </div>
      </form>

      {/* Goals List */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Your Goals</h3>
        {goals && goals.length > 0 ? (
          <div className="space-y-4">
            {goals.map((goal) => (
              <div key={goal.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{goal.title}</h4>
                    {goal.description && (
                      <p className="text-gray-600 mt-1">{goal.description}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-2">
                      Status: {goal.status} | Created: {new Date(goal.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {goal.status === 'active' && (
                    <button
                      onClick={() => handleArchiveGoal(goal.id)}
                      disabled={archiveGoalMutation.isPending}
                      className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
                    >
                      Archive
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No goals yet. Create your first goal above!</p>
        )}
      </div>
    </div>
  )
} 