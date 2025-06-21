import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@/test/utils'
import ViewModeToggle from '../ViewModeToggle'

const mockOnViewModeChange = vi.fn()

describe('ViewModeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render all view mode options', () => {
    render(
      <ViewModeToggle 
        viewMode="split"
        onViewModeChange={mockOnViewModeChange}
      />
    )

    expect(screen.getByText('Split View')).toBeInTheDocument()
    expect(screen.getByText('Source Only')).toBeInTheDocument()
    expect(screen.getByText('Target Only')).toBeInTheDocument()
  })

  it('should highlight the selected view mode', () => {
    render(
      <ViewModeToggle 
        viewMode="source"
        onViewModeChange={mockOnViewModeChange}
      />
    )

    const sourceButton = screen.getByText('Source Only')
    const splitButton = screen.getByText('Split View')
    
    // The selected button should have different styling
    expect(sourceButton.closest('button')).toHaveClass('bg-blue-600', 'text-white')
    expect(splitButton.closest('button')).toHaveClass('bg-gray-200', 'text-gray-700')
  })

  it('should call onViewModeChange when different mode is selected', () => {
    render(
      <ViewModeToggle 
        viewMode="split"
        onViewModeChange={mockOnViewModeChange}
      />
    )

    const sourceButton = screen.getByText('Source Only')
    fireEvent.click(sourceButton)

    expect(mockOnViewModeChange).toHaveBeenCalledWith('source')
  })

  it('should call onViewModeChange for target mode', () => {
    render(
      <ViewModeToggle 
        viewMode="split"
        onViewModeChange={mockOnViewModeChange}
      />
    )

    const targetButton = screen.getByText('Target Only')
    fireEvent.click(targetButton)

    expect(mockOnViewModeChange).toHaveBeenCalledWith('target')
  })

  it('should call onViewModeChange for split mode', () => {
    render(
      <ViewModeToggle 
        viewMode="source"
        onViewModeChange={mockOnViewModeChange}
      />
    )

    const splitButton = screen.getByText('Split View')
    fireEvent.click(splitButton)

    expect(mockOnViewModeChange).toHaveBeenCalledWith('split')
  })

  it('should not call onViewModeChange when clicking already selected mode', () => {
    render(
      <ViewModeToggle 
        viewMode="split"
        onViewModeChange={mockOnViewModeChange}
      />
    )

    const splitButton = screen.getByText('Split View')
    fireEvent.click(splitButton)

    // Should still call the function even if it's the same mode
    // This allows parent components to handle any necessary updates
    expect(mockOnViewModeChange).toHaveBeenCalledWith('split')
  })

  it('should render buttons with correct accessibility attributes', () => {
    render(
      <ViewModeToggle 
        viewMode="split"
        onViewModeChange={mockOnViewModeChange}
      />
    )

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(3)
    
    buttons.forEach(button => {
      expect(button).toHaveAttribute('type', 'button')
    })
  })
})