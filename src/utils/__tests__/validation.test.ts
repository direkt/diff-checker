import { describe, it, expect } from 'vitest'
import {
  validateProfileJsonStructure,
  validateJsonContent,
  validateFileType,
  validateQueryId,
  validateDataScanStructure,
  validateCompleteProfileData
} from '../validation'

describe('Validation Functions', () => {
  describe('validateProfileJsonStructure', () => {
    it('should validate a well-formed profile structure', () => {
      const validProfile = {
        id: { part1: 'query-123' },
        start: 1640000000000,
        end: 1640000005000,
        planPhases: [
          { phaseName: 'Planning', durationMillis: 1000 }
        ],
        datasetProfile: [
          { type: 1, datasetPath: 'path1' }
        ]
      }

      const result = validateProfileJsonStructure(validProfile)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject non-object input', () => {
      const result = validateProfileJsonStructure('not an object')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Profile data must be a valid JSON object')
    })

    it('should warn about missing optional fields', () => {
      const profileWithoutOptionalFields = {}

      const result = validateProfileJsonStructure(profileWithoutOptionalFields)
      
      expect(result.isValid).toBe(true)
      expect(result.warnings).toContain('Missing query ID - will use default value')
      expect(result.warnings).toContain('Missing or invalid start time - timing metrics may be inaccurate')
    })

    it('should validate planPhases array structure', () => {
      const profileWithInvalidPhases = {
        planPhases: 'not an array'
      }

      const result = validateProfileJsonStructure(profileWithInvalidPhases)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('planPhases must be an array')
    })

    it('should validate individual phase objects', () => {
      const profileWithInvalidPhaseObjects = {
        planPhases: [
          { phaseName: 'Valid Phase', durationMillis: 1000 },
          'invalid phase object',
          null
        ]
      }

      const result = validateProfileJsonStructure(profileWithInvalidPhaseObjects)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('planPhases[1] must be an object')
      expect(result.errors).toContain('planPhases[2] must be an object')
    })

    it('should warn when profile has minimal data', () => {
      const minimalProfile = {
        id: { part1: 'test' }
      }

      const result = validateProfileJsonStructure(minimalProfile)
      
      expect(result.isValid).toBe(true)
      expect(result.warnings).toContain('Profile appears to have minimal data - some features may not work')
    })
  })

  describe('validateJsonContent', () => {
    it('should validate valid JSON content', () => {
      const validJson = JSON.stringify({
        id: { part1: 'test' },
        start: 1640000000000,
        end: 1640000005000
      })

      const result = validateJsonContent(validJson)
      
      expect(result.isValid).toBe(true)
    })

    it('should reject empty content', () => {
      const result = validateJsonContent('')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('File content is empty')
    })

    it('should reject invalid JSON', () => {
      const invalidJson = '{ invalid json content'

      const result = validateJsonContent(invalidJson)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('Invalid JSON format'))).toBe(true)
    })
  })

  describe('validateFileType', () => {
    it('should validate JSON files', () => {
      const jsonFile = new File(['{}'], 'test.json', { type: 'application/json' })

      const result = validateFileType(jsonFile)
      
      expect(result.isValid).toBe(true)
    })

    it('should validate ZIP files', () => {
      const zipFile = new File(['fake zip content'], 'test.zip', { type: 'application/zip' })

      const result = validateFileType(zipFile)
      
      expect(result.isValid).toBe(true)
    })

    it('should reject files with invalid extensions', () => {
      const txtFile = new File(['content'], 'test.txt', { type: 'text/plain' })

      const result = validateFileType(txtFile)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('Invalid file extension'))).toBe(true)
    })

    it('should reject files that are too large', () => {
      const largeContent = 'x'.repeat(51 * 1024 * 1024) // 51MB
      const largeFile = new File([largeContent], 'large.json', { type: 'application/json' })

      const result = validateFileType(largeFile)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('File too large'))).toBe(true)
    })

    it('should reject empty files', () => {
      const emptyFile = new File([], 'empty.json', { type: 'application/json' })

      const result = validateFileType(emptyFile)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('File is empty')
    })

    it('should warn about unexpected MIME types', () => {
      const file = new File(['{}'], 'test.json', { type: 'text/html' })

      const result = validateFileType(file)
      
      expect(result.warnings.some(warning => warning.includes('Unexpected file type'))).toBe(true)
    })
  })

  describe('validateQueryId', () => {
    it('should validate normal query IDs', () => {
      const result = validateQueryId('query-123-abc')
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject empty query IDs', () => {
      const result = validateQueryId('')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Query ID cannot be empty')
    })

    it('should warn about very long query IDs', () => {
      const longId = 'x'.repeat(300)
      const result = validateQueryId(longId)
      
      expect(result.isValid).toBe(true)
      expect(result.warnings).toContain('Query ID is unusually long')
    })

    it('should warn about special characters', () => {
      const result = validateQueryId('query<with>special:chars')
      
      expect(result.isValid).toBe(true)
      expect(result.warnings).toContain('Query ID contains special characters that might cause display issues')
    })
  })

  describe('validateDataScanStructure', () => {
    it('should validate well-formed scan data', () => {
      const validScan = {
        tableName: 'test_table',
        scanType: 'DATA_FILE_SCAN',
        rowsScanned: 1000,
        durationMs: 500
      }

      const result = validateDataScanStructure(validScan)
      
      expect(result.isValid).toBe(true)
      expect(result.warnings).toHaveLength(0)
    })

    it('should reject non-object scan data', () => {
      const result = validateDataScanStructure('not an object')
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Data scan must be an object')
    })

    it('should warn about missing fields', () => {
      const incompleteScan = {}

      const result = validateDataScanStructure(incompleteScan)
      
      expect(result.isValid).toBe(true)
      expect(result.warnings).toContain('Missing or invalid table name in data scan')
      expect(result.warnings).toContain('Missing or invalid scan type in data scan')
    })

    it('should warn about invalid numeric fields', () => {
      const scanWithInvalidNumbers = {
        tableName: 'test',
        rowsScanned: 'not a number',
        durationMs: 'also not a number'
      }

      const result = validateDataScanStructure(scanWithInvalidNumbers)
      
      expect(result.warnings).toContain('Invalid rows_scanned value - should be a number')
      expect(result.warnings).toContain('Invalid duration value - should be a number')
    })
  })

  describe('validateCompleteProfileData', () => {
    it('should validate complete, well-formed profile data', () => {
      const completeProfile = {
        id: { part1: 'query-123' },
        start: 1640000000000,
        end: 1640000005000,
        planPhases: [
          { phaseName: 'Planning', durationMillis: 1000 }
        ],
        dataScans: [
          {
            tableName: 'test_table',
            scanType: 'DATA_FILE_SCAN',
            rowsScanned: 1000,
            durationMs: 500
          }
        ]
      }

      const jsonContent = JSON.stringify(completeProfile)
      const result = validateCompleteProfileData(jsonContent)
      
      expect(result.isValid).toBe(true)
    })

    it('should fail for invalid JSON', () => {
      const result = validateCompleteProfileData('{ invalid json')
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('Invalid JSON format'))).toBe(true)
    })

    it('should accumulate warnings from structure and scan validation', () => {
      const profileWithIssues = {
        // Missing timing data
        dataScans: [
          {}, // Missing scan data
          { tableName: 'table2' } // Incomplete scan data
        ]
      }

      const jsonContent = JSON.stringify(profileWithIssues)
      const result = validateCompleteProfileData(jsonContent)
      
      expect(result.isValid).toBe(true) // Structure is valid even with warnings
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings.some(w => w.includes('Data scan 0:'))).toBe(true)
      expect(result.warnings.some(w => w.includes('Data scan 1:'))).toBe(true)
    })
  })
})