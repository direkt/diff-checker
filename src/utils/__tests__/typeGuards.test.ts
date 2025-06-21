import { describe, it, expect } from 'vitest'
import {
  isString,
  isNumber,
  isBoolean,
  isArray,
  isStringArray,
  isObject,
  hasProperty,
  safeString,
  safeNumber,
  safeBoolean,
  safeStringArray,
  safeObject,
  validateQueryId,
  validateScanData,
  validatePhaseData
} from '../typeGuards'

describe('Type Guards', () => {
  describe('isString', () => {
    it('should return true for strings', () => {
      expect(isString('hello')).toBe(true)
      expect(isString('')).toBe(true)
      expect(isString('123')).toBe(true)
    })

    it('should return false for non-strings', () => {
      expect(isString(123)).toBe(false)
      expect(isString(null)).toBe(false)
      expect(isString(undefined)).toBe(false)
      expect(isString({})).toBe(false)
      expect(isString([])).toBe(false)
    })
  })

  describe('isNumber', () => {
    it('should return true for valid numbers', () => {
      expect(isNumber(123)).toBe(true)
      expect(isNumber(0)).toBe(true)
      expect(isNumber(-456)).toBe(true)
      expect(isNumber(3.14)).toBe(true)
    })

    it('should return false for invalid numbers and non-numbers', () => {
      expect(isNumber(NaN)).toBe(false)
      expect(isNumber('123')).toBe(false)
      expect(isNumber(null)).toBe(false)
      expect(isNumber(undefined)).toBe(false)
      expect(isNumber({})).toBe(false)
    })
  })

  describe('isArray', () => {
    it('should return true for arrays', () => {
      expect(isArray([])).toBe(true)
      expect(isArray([1, 2, 3])).toBe(true)
      expect(isArray(['a', 'b'])).toBe(true)
    })

    it('should return false for non-arrays', () => {
      expect(isArray('array')).toBe(false)
      expect(isArray({})).toBe(false)
      expect(isArray(null)).toBe(false)
      expect(isArray(undefined)).toBe(false)
    })
  })

  describe('isStringArray', () => {
    it('should return true for string arrays', () => {
      expect(isStringArray([])).toBe(true)
      expect(isStringArray(['a', 'b', 'c'])).toBe(true)
      expect(isStringArray([''])).toBe(true)
    })

    it('should return false for mixed or non-string arrays', () => {
      expect(isStringArray([1, 2, 3])).toBe(false)
      expect(isStringArray(['a', 1, 'b'])).toBe(false)
      expect(isStringArray('not array')).toBe(false)
    })
  })

  describe('isObject', () => {
    it('should return true for plain objects', () => {
      expect(isObject({})).toBe(true)
      expect(isObject({ key: 'value' })).toBe(true)
    })

    it('should return false for non-objects', () => {
      expect(isObject(null)).toBe(false)
      expect(isObject([])).toBe(false)
      expect(isObject('string')).toBe(false)
      expect(isObject(123)).toBe(false)
      expect(isObject(undefined)).toBe(false)
    })
  })

  describe('hasProperty', () => {
    it('should return true when object has property', () => {
      const obj = { name: 'test', value: 123 }
      expect(hasProperty(obj, 'name')).toBe(true)
      expect(hasProperty(obj, 'value')).toBe(true)
    })

    it('should return false when object lacks property', () => {
      const obj = { name: 'test' }
      expect(hasProperty(obj, 'missing')).toBe(false)
      expect(hasProperty(null, 'prop')).toBe(false)
      expect(hasProperty('not object', 'prop')).toBe(false)
    })
  })
})

describe('Safe Type Converters', () => {
  describe('safeString', () => {
    it('should return string values unchanged', () => {
      expect(safeString('test')).toBe('test')
      expect(safeString('')).toBe('')
    })

    it('should return fallback for non-strings', () => {
      expect(safeString(123)).toBe('Unknown')
      expect(safeString(null)).toBe('Unknown')
      expect(safeString(undefined, 'default')).toBe('default')
    })
  })

  describe('safeNumber', () => {
    it('should return number values unchanged', () => {
      expect(safeNumber(123)).toBe(123)
      expect(safeNumber(0)).toBe(0)
      expect(safeNumber(-456)).toBe(-456)
    })

    it('should return fallback for non-numbers', () => {
      expect(safeNumber('123')).toBe(0)
      expect(safeNumber(null)).toBe(0)
      expect(safeNumber(undefined, 999)).toBe(999)
      expect(safeNumber(NaN)).toBe(0)
    })
  })

  describe('safeStringArray', () => {
    it('should return string arrays unchanged', () => {
      expect(safeStringArray(['a', 'b'])).toEqual(['a', 'b'])
      expect(safeStringArray([])).toEqual([])
    })

    it('should return fallback for non-string arrays', () => {
      expect(safeStringArray([1, 2, 3])).toEqual([])
      expect(safeStringArray('not array')).toEqual([])
      expect(safeStringArray(null, ['default'])).toEqual(['default'])
    })
  })
})

describe('Specific Validators', () => {
  describe('validateQueryId', () => {
    it('should extract queryId from valid object', () => {
      const validId = { part1: 'query-123' }
      expect(validateQueryId(validId)).toBe('query-123')
    })

    it('should return Unknown for invalid objects', () => {
      expect(validateQueryId(null)).toBe('Unknown')
      expect(validateQueryId({})).toBe('Unknown')
      expect(validateQueryId({ other: 'value' })).toBe('Unknown')
      expect(validateQueryId('string')).toBe('Unknown')
    })
  })

  describe('validateScanData', () => {
    it('should validate and transform scan data correctly', () => {
      const input = {
        tableName: 'test_table',
        scanType: 'DATA_FILE_SCAN',
        filters: ['filter1', 'filter2'],
        timestamp: '2023-01-01',
        rowsScanned: 1000,
        durationMs: 500,
        tableFunctionFilter: 'test_filter'
      }

      const result = validateScanData(input)
      
      expect(result).toEqual({
        table_name: 'test_table',
        scan_type: 'DATA_FILE_SCAN',
        filters: ['filter1', 'filter2'],
        timestamp: '2023-01-01',
        rows_scanned: 1000,
        duration_ms: 500,
        table_function_filter: 'test_filter'
      })
    })

    it('should use fallbacks for missing data', () => {
      const result = validateScanData({})
      
      expect(result).toEqual({
        table_name: 'Unknown',
        scan_type: 'Unknown',
        filters: [],
        timestamp: '',
        rows_scanned: 0,
        duration_ms: 0,
        table_function_filter: ''
      })
    })

    it('should handle alternative field names', () => {
      const input = {
        table_name: 'alt_table',
        scan_type: 'ALT_SCAN',
        rows_scanned: 2000,
        duration_ms: 1000,
        table_function_filter: 'alt_filter'
      }

      const result = validateScanData(input)
      
      expect(result.table_name).toBe('alt_table')
      expect(result.scan_type).toBe('ALT_SCAN')
      expect(result.rows_scanned).toBe(2000)
      expect(result.duration_ms).toBe(1000)
      expect(result.table_function_filter).toBe('alt_filter')
    })
  })

  describe('validatePhaseData', () => {
    it('should validate and transform phase data correctly', () => {
      const input = {
        phaseName: 'Planning Phase',
        durationMillis: 1500
      }

      const result = validatePhaseData(input)
      
      expect(result).toEqual({
        phaseName: 'Planning Phase',
        durationMillis: 1500
      })
    })

    it('should use fallbacks for missing data', () => {
      const result = validatePhaseData({})
      
      expect(result).toEqual({
        phaseName: 'Unknown Phase',
        durationMillis: 0
      })
    })

    it('should handle invalid input types', () => {
      const result = validatePhaseData(null)
      
      expect(result).toEqual({
        phaseName: 'Unknown Phase',
        durationMillis: 0
      })
    })
  })
})