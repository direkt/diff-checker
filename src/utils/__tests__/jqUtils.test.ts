import { describe, it, expect, vi } from 'vitest'
import { extractProfileData } from '../jqUtils'

// Mock the query phase validator
vi.mock('../queryPhaseValidator', () => ({
  validateQueryPhases: vi.fn(() => ({
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
  }))
}))

describe('jqUtils', () => {
  describe('extractProfileData', () => {
    it('should extract basic profile data from valid JSON', async () => {
      const mockProfile = {
        id: { part1: 'test-query-123' },
        user: 'test-user',
        dremioVersion: '1.0.0',
        start: 1640000000000,
        end: 1640000005000,
        plan: 'Mock execution plan',
        datasetProfile: [
          { type: 1, datasetPath: 'pds.table1' },
          { type: 2, datasetPath: 'vds.view1', sql: 'SELECT * FROM table' }
        ],
        planPhases: [
          { phaseName: 'Planning', durationMillis: 1000 },
          { phaseName: 'Execution', durationMillis: 4000 }
        ]
      }

      const jsonContent = JSON.stringify(mockProfile)
      const result = await extractProfileData(jsonContent)

      expect(result.query).toBeDefined()
      expect(result.plan).toBe('Mock execution plan')
      expect(result.pdsDatasetPaths).toContain('pds.table1')
      expect(result.vdsDatasetPaths).toContain('vds.view1')
      expect(result.vdsDetails).toHaveLength(1)
      expect(result.vdsDetails[0]).toEqual({
        path: 'vds.view1',
        sql: 'SELECT * FROM table'
      })
    })

    it('should handle missing or invalid data gracefully', async () => {
      const incompleteProfile = {
        id: { part1: 'incomplete-query' }
        // Missing most fields
      }

      const jsonContent = JSON.stringify(incompleteProfile)
      const result = await extractProfileData(jsonContent)

      expect(result.query).toBeDefined()
      expect(result.plan).toBe('')
      expect(result.pdsDatasetPaths).toEqual([])
      expect(result.vdsDatasetPaths).toEqual([])
      expect(result.vdsDetails).toEqual([])
      expect(result.dataScans).toEqual([])
    })

    it('should extract data scans from various sources', async () => {
      const profileWithScans = {
        id: { part1: 'scan-test' },
        dataScans: [
          {
            tableName: 'direct_scan_table',
            scanType: 'DATA_FILE_SCAN',
            rowsScanned: 1000,
            durationMs: 500
          }
        ],
        tableScanProfiles: [
          {
            tableName: 'profile_scan_table',
            scanType: 'TABLE_SCAN',
            rowsScanned: 2000,
            durationMs: 750
          }
        ],
        executionEvents: [
          {
            type: 'TABLE_SCAN',
            tableName: 'event_scan_table',
            scanType: 'EVENT_SCAN',
            rowsScanned: 1500,
            durationMs: 600
          }
        ]
      }

      const jsonContent = JSON.stringify(profileWithScans)
      const result = await extractProfileData(jsonContent)

      expect(result.dataScans).toHaveLength(3)
      
      const tableNames = result.dataScans.map(scan => scan.table_name)
      expect(tableNames).toContain('direct_scan_table')
      expect(tableNames).toContain('profile_scan_table')
      expect(tableNames).toContain('event_scan_table')
    })

    it('should extract performance metrics when available', async () => {
      const profileWithPerformance = {
        id: { part1: 'perf-test' },
        start: 1640000000000,
        end: 1640000005000,
        planningStart: 1640000000000,
        planningEnd: 1640000001000,
        planPhases: [
          { phaseName: 'Planning', durationMillis: 1000 },
          { phaseName: 'Execution', durationMillis: 4000 }
        ],
        fragmentProfile: [
          {
            majorFragmentId: 0,
            operatorProfiles: [
              {
                operatorId: 1,
                operatorType: 'TABLE_SCAN',
                totalNanos: 2000000000, // 2 seconds in nanos
                peakLocalMemoryAllocated: 104857600, // 100MB in bytes
                inputRecords: 1000,
                outputRecords: 800,
                inputBytes: 50000,
                outputBytes: 40000
              }
            ]
          }
        ]
      }

      const jsonContent = JSON.stringify(profileWithPerformance)
      const result = await extractProfileData(jsonContent)

      expect(result.performanceMetrics).toBeDefined()
      expect(result.performanceMetrics?.totalQueryTimeMs).toBe(5000)
      expect(result.performanceMetrics?.planningTimeMs).toBe(1000)
      expect(result.performanceMetrics?.executionTimeMs).toBe(4000)
      expect(result.performanceMetrics?.phases).toHaveLength(2)
    })

    it('should handle invalid JSON gracefully', async () => {
      const invalidJson = '{ invalid json content'

      await expect(extractProfileData(invalidJson)).rejects.toThrow('Expected property name')
    })

    it('should extract reflections data', async () => {
      const profileWithReflections = {
        id: { part1: 'reflection-test' },
        accelerationDetails: {
          reflectionsUsed: [
            { name: 'reflection1', type: 'AGGREGATION' },
            { name: 'reflection2', type: 'RAW' }
          ],
          reflectionsConsidered: [
            { name: 'reflection3', type: 'AGGREGATION' },
            { name: 'reflection4', type: 'RAW' }
          ]
        }
      }

      const jsonContent = JSON.stringify(profileWithReflections)
      const result = await extractProfileData(jsonContent)

      expect(result.reflections).toBeDefined()
      expect(result.reflections?.chosen).toBeDefined()
      expect(result.reflections?.considered).toBeDefined()
    })

    it('should extract non-default options', async () => {
      const profileWithOptions = {
        id: { part1: 'options-test' },
        nonDefaultOptions: [
          { name: 'option1', value: 'value1' },
          { name: 'option2', value: 123 },
          { name: 'option3', value: true }
        ]
      }

      const jsonContent = JSON.stringify(profileWithOptions)
      const result = await extractProfileData(jsonContent)

      expect(result.nonDefaultOptions).toHaveLength(3)
      expect(result.nonDefaultOptions?.[0]).toEqual({
        name: 'option1',
        value: 'value1'
      })
      expect(result.nonDefaultOptions?.[1]).toEqual({
        name: 'option2',
        value: 123
      })
      expect(result.nonDefaultOptions?.[2]).toEqual({
        name: 'option3',
        value: true
      })
    })

    it('should include query phase validation results', async () => {
      const mockProfile = {
        id: { part1: 'validation-test' },
        planPhases: [
          { phaseName: 'Planning', durationMillis: 1000 }
        ]
      }

      const jsonContent = JSON.stringify(mockProfile)
      const result = await extractProfileData(jsonContent)

      expect(result.queryPhaseValidation).toBeDefined()
      expect(result.queryPhaseValidation?.isValid).toBe(true)
      expect(result.queryPhaseValidation?.totalPhases).toBe(2)
    })
  })
})