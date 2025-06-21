// Comprehensive input validation for profile data
import { isObject, isArray, isString, isNumber } from './typeGuards'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface ProfileDataInput {
  planPhases?: unknown[]
  fragmentProfile?: unknown[]
  id?: unknown
  user?: unknown
  dremioVersion?: unknown
  clusterInfo?: unknown
  start?: unknown
  end?: unknown
  planningStart?: unknown
  planningEnd?: unknown
  dataScans?: unknown[]
  tableScanProfiles?: unknown[]
  executionEvents?: unknown[]
  plan?: unknown
  datasetProfile?: unknown[]
  nonDefaultOptions?: unknown[]
}

export function validateProfileJsonStructure(data: unknown): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  }

  if (!isObject(data)) {
    result.isValid = false
    result.errors.push('Profile data must be a valid JSON object')
    return result
  }

  const profileData = data as Record<string, unknown>

  // Check for required basic structure
  if (!profileData.id) {
    result.warnings.push('Missing query ID - will use default value')
  }

  if (!profileData.start || !isNumber(profileData.start)) {
    result.warnings.push('Missing or invalid start time - timing metrics may be inaccurate')
  }

  if (!profileData.end || !isNumber(profileData.end)) {
    result.warnings.push('Missing or invalid end time - timing metrics may be inaccurate')
  }

  // Validate plan phases
  if (profileData.planPhases) {
    if (!isArray(profileData.planPhases)) {
      result.errors.push('planPhases must be an array')
      result.isValid = false
    } else {
      const invalidPhases = profileData.planPhases.filter((phase, index) => {
        if (!isObject(phase)) {
          result.errors.push(`planPhases[${index}] must be an object`)
          return true
        }
        return false
      })
      
      if (invalidPhases.length > 0) {
        result.isValid = false
      }
    }
  }

  // Validate fragment profiles
  if (profileData.fragmentProfile) {
    if (!isArray(profileData.fragmentProfile)) {
      result.errors.push('fragmentProfile must be an array')
      result.isValid = false
    }
  }

  // Validate dataset profiles
  if (profileData.datasetProfile) {
    if (!isArray(profileData.datasetProfile)) {
      result.errors.push('datasetProfile must be an array')
      result.isValid = false
    } else {
      const invalidDatasets = profileData.datasetProfile.filter((dataset, index) => {
        if (!isObject(dataset)) {
          result.errors.push(`datasetProfile[${index}] must be an object`)
          return true
        }
        return false
      })
      
      if (invalidDatasets.length > 0) {
        result.isValid = false
      }
    }
  }

  // Validate data scans
  if (profileData.dataScans && !isArray(profileData.dataScans)) {
    result.errors.push('dataScans must be an array')
    result.isValid = false
  }

  if (profileData.tableScanProfiles && !isArray(profileData.tableScanProfiles)) {
    result.errors.push('tableScanProfiles must be an array')
    result.isValid = false
  }

  if (profileData.executionEvents && !isArray(profileData.executionEvents)) {
    result.errors.push('executionEvents must be an array')
    result.isValid = false
  }

  // Check for essential data presence
  const hasAnyDataScans = profileData.dataScans || profileData.tableScanProfiles || profileData.executionEvents
  const hasPlan = profileData.plan && isString(profileData.plan)
  const hasPhases = profileData.planPhases && isArray(profileData.planPhases) && profileData.planPhases.length > 0

  if (!hasAnyDataScans && !hasPlan && !hasPhases) {
    result.warnings.push('Profile appears to have minimal data - some features may not work')
  }

  return result
}

export function validateJsonContent(content: string): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  }

  if (!content || content.trim().length === 0) {
    result.isValid = false
    result.errors.push('File content is empty')
    return result
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(content)
  } catch (error) {
    result.isValid = false
    result.errors.push(`Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown parsing error'}`)
    return result
  }

  // Validate the parsed structure
  const structureValidation = validateProfileJsonStructure(parsedJson)
  result.isValid = result.isValid && structureValidation.isValid
  result.errors.push(...structureValidation.errors)
  result.warnings.push(...structureValidation.warnings)

  return result
}

export function validateFileType(file: File): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  }

  const validTypes = ['application/json', 'text/plain', 'application/zip', 'application/x-zip-compressed']
  const validExtensions = ['.json', '.zip']

  // Check MIME type
  if (!validTypes.includes(file.type) && file.type !== '') {
    result.warnings.push(`Unexpected file type: ${file.type}. Expected JSON or ZIP.`)
  }

  // Check file extension
  const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
  if (!hasValidExtension) {
    result.isValid = false
    result.errors.push(`Invalid file extension. Expected .json or .zip, got: ${file.name}`)
  }

  // Check file size (50MB limit)
  const maxSize = 50 * 1024 * 1024 // 50MB in bytes
  if (file.size > maxSize) {
    result.isValid = false
    result.errors.push(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum allowed: 50MB`)
  }

  // Check for empty files
  if (file.size === 0) {
    result.isValid = false
    result.errors.push('File is empty')
  }

  return result
}

export function validateQueryId(queryId: string): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  }

  if (!queryId || queryId.trim().length === 0) {
    result.isValid = false
    result.errors.push('Query ID cannot be empty')
    return result
  }

  // Check for reasonable length
  if (queryId.length > 255) {
    result.warnings.push('Query ID is unusually long')
  }

  // Check for special characters that might cause issues
  const hasSpecialChars = /[<>:"/\\|?*]/.test(queryId)
  if (hasSpecialChars) {
    result.warnings.push('Query ID contains special characters that might cause display issues')
  }

  return result
}

export function validateDataScanStructure(scan: unknown): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  }

  if (!isObject(scan)) {
    result.isValid = false
    result.errors.push('Data scan must be an object')
    return result
  }

  const scanObj = scan as Record<string, unknown>

  // Check for table name
  const tableName = scanObj.tableName || scanObj.table_name
  if (!tableName || !isString(tableName)) {
    result.warnings.push('Missing or invalid table name in data scan')
  }

  // Check for scan type
  const scanType = scanObj.scanType || scanObj.scan_type
  if (!scanType || !isString(scanType)) {
    result.warnings.push('Missing or invalid scan type in data scan')
  }

  // Check for numeric fields
  const rowsScanned = scanObj.rowsScanned || scanObj.rows_scanned
  if (rowsScanned !== undefined && !isNumber(rowsScanned)) {
    result.warnings.push('Invalid rows_scanned value - should be a number')
  }

  const duration = scanObj.durationMs || scanObj.duration_ms
  if (duration !== undefined && !isNumber(duration)) {
    result.warnings.push('Invalid duration value - should be a number')
  }

  return result
}

// Main validation function that combines all checks
export function validateCompleteProfileData(content: string): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  }

  // First validate JSON content
  const jsonValidation = validateJsonContent(content)
  if (!jsonValidation.isValid) {
    return jsonValidation
  }

  try {
    const parsedData = JSON.parse(content)
    
    // Validate structure
    const structureValidation = validateProfileJsonStructure(parsedData)
    result.errors.push(...structureValidation.errors)
    result.warnings.push(...structureValidation.warnings)
    result.isValid = result.isValid && structureValidation.isValid

    // Validate data scans if present
    const dataScans = parsedData.dataScans || parsedData.tableScanProfiles || []
    if (isArray(dataScans)) {
      dataScans.forEach((scan, index) => {
        const scanValidation = validateDataScanStructure(scan)
        scanValidation.errors.forEach(error => {
          result.errors.push(`Data scan ${index}: ${error}`)
        })
        scanValidation.warnings.forEach(warning => {
          result.warnings.push(`Data scan ${index}: ${warning}`)
        })
        if (!scanValidation.isValid) {
          result.isValid = false
        }
      })
    }

  } catch (error) {
    result.isValid = false
    result.errors.push('Failed to parse JSON for detailed validation')
  }

  return result
}