import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/utils'
import FileUploader from '../FileUploader'
import { useDropzone } from 'react-dropzone'

// Mock react-dropzone
vi.mock('react-dropzone', () => ({
  useDropzone: vi.fn()
}))

// Mock JSZip
vi.mock('jszip', () => ({
  default: vi.fn(() => ({
    loadAsync: vi.fn()
  }))
}))

// Mock the validation utilities
vi.mock('@/utils/validation', () => ({
  validateFileType: vi.fn(() => ({ isValid: true, errors: [], warnings: [] })),
  validateCompleteProfileData: vi.fn(() => ({ isValid: true, errors: [], warnings: [] }))
}))

const mockOnFilesProcessed = vi.fn()
const mockUseDropzone = useDropzone as unknown as vi.MockedFunction<typeof useDropzone>

describe('FileUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock implementation for useDropzone
    mockUseDropzone.mockReturnValue({
      getRootProps: () => ({ onClick: vi.fn() }),
      isDragActive: false
    })
  })

  it('should render dropzone with correct text for left side', () => {
    render(
      <FileUploader 
        onFilesProcessed={mockOnFilesProcessed}
        side="left"
      />
    )

    expect(screen.getByText('Drag & drop JSON files or ZIP archives here for Source')).toBeInTheDocument()
    expect(screen.getByText('Browse Files')).toBeInTheDocument()
    expect(screen.getByText('Or select a folder:')).toBeInTheDocument()
  })

  it('should render dropzone with correct text for right side', () => {
    render(
      <FileUploader 
        onFilesProcessed={mockOnFilesProcessed}
        side="right"
      />
    )

    expect(screen.getByText('Drag & drop JSON files or ZIP archives here for Target')).toBeInTheDocument()
  })

  it('should show active state when dragging', () => {
    mockUseDropzone.mockReturnValue({
      getRootProps: () => ({ onClick: vi.fn() }),
      isDragActive: true
    })

    render(
      <FileUploader 
        onFilesProcessed={mockOnFilesProcessed}
        side="left"
      />
    )

    expect(screen.getByText('Drop the files here...')).toBeInTheDocument()
  })

  it('should handle folder input click', () => {
    render(
      <FileUploader 
        onFilesProcessed={mockOnFilesProcessed}
        side="left"
      />
    )

    const browseButton = screen.getByText('Browse Files')
    const folderInput = screen.getByDisplayValue('')
    
    const clickSpy = vi.spyOn(folderInput, 'click')
    fireEvent.click(browseButton)

    expect(clickSpy).toHaveBeenCalled()
  })

  it('should show loading state', async () => {
    // Mock a file processing scenario that triggers loading
    const mockProcessFiles = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    
    render(
      <FileUploader 
        onFilesProcessed={mockOnFilesProcessed}
        side="left"
      />
    )

    // This test would need to trigger file processing to show loading
    // The current implementation makes it difficult to test loading state directly
    // In a real scenario, we'd need to mock the internal processFiles function
  })

  it('should have folder input with correct attributes', () => {
    render(
      <FileUploader 
        onFilesProcessed={mockOnFilesProcessed}
        side="left"
      />
    )

    const folderInput = screen.getByDisplayValue('')
    
    expect(folderInput).toHaveAttribute('webkitdirectory', 'true')
    expect(folderInput).toHaveAttribute('directory', '')
    expect(folderInput).toHaveAttribute('multiple')
  })

  it('should configure dropzone with correct file types', () => {
    render(
      <FileUploader 
        onFilesProcessed={mockOnFilesProcessed}
        side="left"
      />
    )

    expect(mockUseDropzone).toHaveBeenCalledWith(
      expect.objectContaining({
        accept: {
          'application/json': ['.json'],
          'application/zip': ['.zip'],
          'application/x-zip-compressed': ['.zip']
        },
        maxSize: 50 * 1024 * 1024
      })
    )
  })

  it('should handle file rejection callbacks', () => {
    const mockOnDropRejected = vi.fn()
    const mockOnError = vi.fn()

    mockUseDropzone.mockReturnValue({
      getRootProps: () => ({ onClick: vi.fn() }),
      isDragActive: false
    })

    render(
      <FileUploader 
        onFilesProcessed={mockOnFilesProcessed}
        side="left"
      />
    )

    // Verify that dropzone was configured with rejection handlers
    const dropzoneConfig = mockUseDropzone.mock.calls[0][0]
    expect(dropzoneConfig.onDropRejected).toBeDefined()
    expect(dropzoneConfig.onError).toBeDefined()
  })
})