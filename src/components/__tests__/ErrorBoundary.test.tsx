import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test/utils'
import ErrorBoundary from '../ErrorBoundary'
import React from 'react'

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalConsoleError = console.error
  beforeEach(() => {
    console.error = vi.fn()
  })
  
  afterEach(() => {
    console.error = originalConsoleError
  })

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('should render error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('An unexpected error occurred while rendering this component.')).toBeInTheDocument()
    expect(screen.getByText('Try Again')).toBeInTheDocument()
  })

  it('should show error details in expandable section', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const detailsButton = screen.getByText('Error Details')
    expect(detailsButton).toBeInTheDocument()
    
    // Click to expand details
    detailsButton.click()
    expect(screen.getByText('Test error')).toBeInTheDocument()
  })

  it('should allow retry after error', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    // Should show error UI
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    // Click try again
    const tryAgainButton = screen.getByText('Try Again')
    tryAgainButton.click()

    // Re-render with non-throwing component
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )

    // Should show normal content
    expect(screen.getByText('No error')).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  it('should render custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom error message')).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  it('should call onError callback when error occurs', () => {
    const onErrorSpy = vi.fn()

    render(
      <ErrorBoundary onError={onErrorSpy}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(onErrorSpy).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    )

    const [error] = onErrorSpy.mock.calls[0]
    expect(error.message).toBe('Test error')
  })
})