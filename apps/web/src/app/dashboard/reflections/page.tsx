'use client'

import React from 'react'
import { ReflectionForm } from '@/components/ReflectionForm'

export default function ReflectionsPage() {
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Daily Reflections</h1>
          <p className="text-gray-600 mt-2">
            Take a moment to reflect on your day and track your progress
          </p>
        </div>

        <ReflectionForm />
      </div>
    </div>
  )
} 