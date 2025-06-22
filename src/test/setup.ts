import '@testing-library/jest-dom'
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup()
})

// Mock window.alert since we replaced it with toast notifications
Object.defineProperty(window, 'alert', {
  value: vi.fn(),
  writable: true
})

// Mock console methods to avoid noise in tests
Object.defineProperty(console, 'warn', {
  value: vi.fn(),
  writable: true
})

// Mock fetch for API calls
global.fetch = vi.fn()

// Mock FileReader for file upload tests
Object.defineProperty(global, 'FileReader', {
  value: class MockFileReader {
    readAsText = vi.fn()
    onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null = null
    onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null = null
    result: string | ArrayBuffer | null = null
    
    constructor() {
      setTimeout(() => {
        this.result = '{"test": "data"}'
        if (this.onload) {
          this.onload.call(this, {} as ProgressEvent<FileReader>)
        }
      }, 0)
    }
  },
  writable: true
})

// Mock URL.createObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  value: vi.fn(() => 'mocked-url'),
  writable: true
})

// Extend expect with custom matchers
expect.extend({
  toBeInTheDocument(received) {
    const pass = received && received.ownerDocument && received.ownerDocument.body.contains(received)
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be in the document`,
      pass
    }
  }
})