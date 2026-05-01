// =====================================================
// Loading Spinner Component
// =====================================================

import React from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  text?: string
}

export function LoadingSpinner({ size = 'md', className = '', text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600 ${sizeClasses[size]}`} />
      {text && (
        <p className="mt-4 text-sm text-gray-600">{text}</p>
      )}
    </div>
  )
}

export function PageLoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner size="lg" text="Loading..." />
    </div>
  )
}

export function InlineLoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <div className={`inline-flex items-center ${className}`}>
      <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-indigo-600" />
    </div>
  )
}