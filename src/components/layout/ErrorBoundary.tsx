'use client'
import React, { Component, ReactNode } from 'react'

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error, info: any) {
    console.error('[ErrorBoundary]', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div className="p-8 bg-cream-100 min-h-screen">
          <h1 className="text-2xl font-display text-sage-700 mb-2">Something went wrong</h1>
          <p className="text-sm text-sage-600 mb-4">An error was caught by the ErrorBoundary:</p>
          <pre className="p-4 bg-coral-100 text-ink-900 rounded-card text-xs overflow-auto font-mono whitespace-pre-wrap">
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}
