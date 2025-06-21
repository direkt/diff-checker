import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@/test/utils'
import { ErrorProvider, useError } from '../ErrorToast'
import React from 'react'

// Simple test component to use the error context
const TestComponent = () => {
  const { showError } = useError()
  
  return (
    <div>
      <button onClick={() => showError('Test error message', 'error')}>
        Show Error
      </button>
      <button onClick={() => showError('Test warning message', 'warning')}>
        Show Warning
      </button>
    </div>
  )
}

describe('ErrorToast', () => {
  it('should render children without error toast initially', () => {
    render(
      <ErrorProvider>
        <div>Test content</div>
      </ErrorProvider>
    )

    expect(screen.getByText('Test content')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('should show error toast when showError is called', () => {
    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    )

    const showErrorButton = screen.getByText('Show Error')
    fireEvent.click(showErrorButton)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Test error message')).toBeInTheDocument()
  })

  it('should show warning toast with correct styling', () => {
    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    )

    const showWarningButton = screen.getByText('Show Warning')
    fireEvent.click(showWarningButton)

    const toast = screen.getByRole('alert')
    expect(toast).toBeInTheDocument()
    expect(screen.getByText('Test warning message')).toBeInTheDocument()
    expect(toast).toHaveClass('bg-yellow-100', 'border-yellow-400')
  })

  it('should allow manual dismissal by clicking close button', () => {
    render(
      <ErrorProvider>
        <TestComponent />
      </ErrorProvider>
    )

    const showErrorButton = screen.getByText('Show Error')
    fireEvent.click(showErrorButton)

    expect(screen.getByRole('alert')).toBeInTheDocument()

    const closeButton = screen.getByLabelText('Close notification')
    fireEvent.click(closeButton)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})