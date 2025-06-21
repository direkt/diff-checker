// Type guards for safe type checking and validation

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function hasProperty<T extends string>(
  obj: unknown,
  prop: T
): obj is Record<T, unknown> {
  return isObject(obj) && prop in obj;
}

export function safeString(value: unknown, fallback = 'Unknown'): string {
  return isString(value) ? value : fallback;
}

export function safeNumber(value: unknown, fallback = 0): number {
  return isNumber(value) ? value : fallback;
}

export function safeBoolean(value: unknown, fallback = false): boolean {
  return isBoolean(value) ? value : fallback;
}

export function safeStringArray(value: unknown, fallback: string[] = []): string[] {
  return isStringArray(value) ? value : fallback;
}

export function safeObject(value: unknown, fallback: Record<string, unknown> = {}): Record<string, unknown> {
  return isObject(value) ? value : fallback;
}

// Specific validators for profile data
export function validateQueryId(obj: unknown): string {
  if (isObject(obj) && hasProperty(obj, 'part1')) {
    return safeString(obj.part1, 'Unknown');
  }
  return 'Unknown';
}

export function validateScanData(scan: unknown): {
  table_name: string;
  scan_type: string;
  filters: string[];
  timestamp: string;
  rows_scanned: number;
  duration_ms: number;
  table_function_filter?: string;
} {
  const scanObj = safeObject(scan);
  
  return {
    table_name: safeString(scanObj.tableName) || safeString(scanObj.table_name, 'Unknown'),
    scan_type: safeString(scanObj.scanType) || safeString(scanObj.scan_type, 'Unknown'),
    filters: safeStringArray(scanObj.filters),
    timestamp: safeString(scanObj.timestamp, ''),
    rows_scanned: safeNumber(scanObj.rowsScanned) || safeNumber(scanObj.rows_scanned, 0),
    duration_ms: safeNumber(scanObj.durationMs) || safeNumber(scanObj.duration_ms, 0),
    table_function_filter: safeString(scanObj.tableFunctionFilter, '') || safeString(scanObj.table_function_filter, '')
  };
}

export function validateOperatorData(op: unknown): {
  operatorId: number;
  operatorName: string;
  fragmentId: string;
  totalMs: number;
  peakMemoryMB: number;
  inputRecords: number;
  outputRecords: number;
  inputBytes: number;
  outputBytes: number;
  selectivity?: number;
  throughputRecordsPerSec?: number;
  _waitNanos?: number;
  _processNanos?: number;
  _totalNanos?: number;
} {
  const opObj = safeObject(op);
  
  const inputRecords = safeNumber(opObj.inputRecords, 0);
  const outputRecords = safeNumber(opObj.outputRecords, 0);
  
  return {
    operatorId: safeNumber(opObj.operatorId, 0),
    operatorName: safeString(opObj.operatorName, 'Unknown'),
    fragmentId: safeString(opObj.fragmentId, ''),
    totalMs: safeNumber(opObj.totalMs, 0),
    peakMemoryMB: safeNumber(opObj.peakMemoryMB, 0),
    inputRecords,
    outputRecords,
    inputBytes: safeNumber(opObj.inputBytes, 0),
    outputBytes: safeNumber(opObj.outputBytes, 0),
    selectivity: inputRecords > 0 ? outputRecords / inputRecords : undefined,
    throughputRecordsPerSec: safeNumber(opObj.throughputRecordsPerSec, 0),
    _waitNanos: safeNumber(opObj._waitNanos, 0),
    _processNanos: safeNumber(opObj._processNanos, 0),
    _totalNanos: safeNumber(opObj._totalNanos, 0)
  };
}

export function validatePhaseData(phase: unknown): {
  phaseName: string;
  durationMillis: number;
} {
  const phaseObj = safeObject(phase);
  
  return {
    phaseName: safeString(phaseObj.phaseName, 'Unknown Phase'),
    durationMillis: safeNumber(phaseObj.durationMillis, 0)
  };
}