// Performance analysis thresholds and constants
export const PERFORMANCE_THRESHOLDS = {
  // Duration thresholds in milliseconds
  LONG_PHASE_DURATION_MS: 30000,
  LONG_QUERY_DURATION_MS: 60000,
  
  // Throughput thresholds
  HIGH_THROUGHPUT_RECORDS_PER_SEC: 100000,
  LOW_THROUGHPUT_RECORDS_PER_SEC: 10000,
  CRITICAL_LOW_THROUGHPUT_RECORDS_PER_SEC: 1000,
  
  // Memory thresholds in MB
  HIGH_MEMORY_MB: 1000,
  MEDIUM_MEMORY_MB: 500,
  LOW_MEMORY_MB: 100,
  
  // Phase analysis
  EARLY_PHASE_INDEX_LIMIT: 10,
  
  // Record processing thresholds
  HIGH_RECORD_COUNT: 1_000_000,
  MEDIUM_RECORD_COUNT: 100_000,
  LOW_RECORD_COUNT: 1_000,
  
  // I/O wait time thresholds (as percentage of total time)
  HIGH_WAIT_PERCENTAGE: 50,
  MEDIUM_WAIT_PERCENTAGE: 25,
  
  // Selectivity thresholds
  POOR_SELECTIVITY: 0.01,
  VERY_POOR_SELECTIVITY: 0.001,
  
  // File size limits
  MAX_FILE_SIZE_BYTES: 50 * 1024 * 1024, // 50MB
  
  // Time conversion constants
  NANOS_TO_MILLIS: 1_000_000,
  NANOS_TO_SECONDS: 1_000_000_000,
  MICROS_TO_NANOS: 1_000,
  
  // Data size conversion constants
  BYTES_TO_MB: 1024 * 1024,
  BYTES_TO_GB: 1024 * 1024 * 1024,
  
  // Top operator limits
  MAX_TOP_OPERATORS: 10,
  
  // Bottleneck detection thresholds
  MIN_WAIT_TIME_NANOS: 1_000_000, // 1ms minimum to consider as wait time
  
  // Query validation
  MAX_QUERY_ID_LENGTH: 255,
  
  // UI Constants
  DEFAULT_TOAST_DURATION_MS: 5000,
  SHORT_TOAST_DURATION_MS: 2000,
  LONG_TOAST_DURATION_MS: 10000,
} as const;

// Operator type mappings for performance analysis
export const OPERATOR_TYPE_MAP = {
  1: 'Screen',
  2: 'Project',
  3: 'Filter',
  4: 'Union',
  5: 'HashJoin',
  6: 'MergeJoin',
  7: 'HashAggregate',
  8: 'StreamingAggregate',
  9: 'Sort',
  10: 'Limit',
  53: 'TableFunction',
} as const;

// File type constants
export const FILE_TYPES = {
  JSON: 'application/json',
  ZIP: 'application/zip',
  ZIP_COMPRESSED: 'application/x-zip-compressed',
} as const;

// Data scan types
export const SCAN_TYPES = {
  DATA_FILE_SCAN: 'DATA_FILE_SCAN',
  TABLE_FUNCTION: 'TABLE_FUNCTION',
  TABLE_SCAN: 'TABLE_SCAN',
  UNKNOWN: 'Unknown',
} as const;

// Reflection types
export const REFLECTION_TYPES = {
  RAW: 'Raw Reflection',
  AGGREGATION: 'Aggregation Reflection',
  DEFAULT: 'Default Reflection',
} as const;

// Severity levels for bottleneck analysis
export const SEVERITY_LEVELS = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
} as const;

// Bottleneck types
export const BOTTLENECK_TYPES = {
  IO: 'I/O',
  CPU: 'CPU',
  MEMORY: 'Memory',
  SELECTIVITY: 'Selectivity',
} as const;