import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ErrorProvider } from '@/components/ErrorToast'

// Custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ErrorProvider>
      {children}
    </ErrorProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }

// Test data factories
export const createMockProfileData = (overrides = {}) => ({
  plan: 'Mock plan data',
  jsonPlan: { operators: [] },
  pdsDatasetPaths: ['path1', 'path2'],
  vdsDatasetPaths: ['vds1', 'vds2'],
  vdsDetails: [{ path: 'vds1', sql: 'SELECT * FROM table' }],
  planOperators: 'Mock operators',
  reflections: {
    chosen: ['reflection1'],
    considered: ['reflection2']
  },
  dataScans: [
    {
      table_name: 'test_table',
      scan_type: 'DATA_FILE_SCAN',
      filters: [],
      timestamp: '2023-01-01',
      rows_scanned: 1000,
      duration_ms: 100,
      table_function_filter: 'filter'
    }
  ],
  performanceMetrics: {
    totalQueryTimeMs: 5000,
    planningTimeMs: 1000,
    executionTimeMs: 4000,
    queryInfo: {
      queryId: 'test-query-123',
      user: 'test-user',
      dremioVersion: '1.0.0'
    },
    phases: [
      { phaseName: 'Planning', durationMs: 1000 },
      { phaseName: 'Execution', durationMs: 4000 }
    ],
    topOperators: [
      {
        operatorId: 1,
        operatorName: 'TableScan',
        fragmentId: 'frag1',
        totalMs: 2000,
        peakMemoryMB: 100,
        inputRecords: 1000,
        outputRecords: 800,
        inputBytes: 50000,
        outputBytes: 40000,
        throughputRecordsPerSec: 500
      }
    ],
    operatorStats: {
      totalOperatorTimeMs: 4000,
      maxOperatorTimeMs: 2000,
      avgOperatorTimeMs: 1000
    },
    bottlenecks: [],
    summary: {
      totalRecordsProcessed: 1000,
      totalInputBytes: 50000,
      totalOutputBytes: 40000,
      avgThroughputRecordsPerSec: 500,
      peakMemoryUsageMB: 100
    }
  },
  queryPhaseValidation: {
    isValid: true,
    totalPhases: 2,
    totalPlanningTime: 1000,
    phases: [],
    phaseBreakdown: {
      planningPhases: [],
      executionPhases: [],
      optimizationPhases: [],
      resourcePhases: []
    },
    issues: [],
    recommendations: []
  },
  snapshotId: 'snapshot-123',
  nonDefaultOptions: [
    { name: 'option1', value: 'value1' }
  ],
  ...overrides
})

export const createMockProcessedFile = (overrides = {}) => ({
  name: 'test-profile.json',
  content: JSON.stringify(createMockProfileData()),
  queryId: 'test-query',
  ...overrides
})

export const createMockQueryGroup = (overrides = {}) => ({
  queryId: 'test-query',
  folderName: 'test-folder',
  files: [createMockProcessedFile()],
  ...overrides
})

// Mock event helpers
export const createMockFileUploadEvent = (files: File[]) => ({
  target: {
    files
  }
})

export const createMockFile = (name = 'test.json', content = '{}', type = 'application/json') => {
  const file = new File([content], name, { type })
  return file
}

// Wait helpers for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

// Custom matchers for testing
export const expectToHaveErrorMessage = (container: HTMLElement, message: string) => {
  const errorElement = container.querySelector('[role="alert"]')
  expect(errorElement).toBeInTheDocument()
  expect(errorElement).toHaveTextContent(message)
}

export const expectToHaveLoadingState = (container: HTMLElement) => {
  expect(container).toHaveTextContent(/processing|loading/i)
}