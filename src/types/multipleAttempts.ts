// Types for handling multiple query attempts
export interface QueryAttempt {
  attemptNumber: number;          // 0-based index
  attemptId: string;              // Unique identifier for this attempt
  timestamp: {
    start: string;                // ISO 8601 timestamp
    end: string;                  // ISO 8601 timestamp
    duration: number;             // Duration in milliseconds
  };
  errorId: string;               // Database-specific error ID
  status: 'failed' | 'success' | 'timeout' | 'cancelled';
  logFile?: string;              // Path to log file
  profileFile?: string;          // Path to profile file
  rawLogContent?: string;        // Raw log content
  rawProfileContent?: string;    // Raw profile content
}

export interface MultiAttemptQuery {
  baseQueryId: string;           // Primary query identifier
  totalAttempts: number;         // Total number of attempts made
  finalStatus: 'failed' | 'success' | 'partial';
  attempts: QueryAttempt[];      // Array of all attempts
  headerFile: string;            // Path to header/main data file
  headerContent?: string;        // Raw header content
  retryPattern: RetryPattern;    // Analysis of retry behavior
}

export interface RetryPattern {
  retryIntervals: number[];      // Time between retries in seconds
  timeoutProgression: number[];  // Query timeout increases per attempt
  backoffType: 'linear' | 'exponential' | 'custom';
  maxRetries: number;
  totalDuration: number;         // Total time from first to last attempt
}

export interface AttemptFile {
  filename: string;
  content: string;
  type: 'log' | 'profile' | 'header';
  attemptNumber?: number;
  isInitial?: boolean;
}

// Enhanced ProcessedFile to support multiple attempts
export interface ProcessedFileWithAttempts {
  name: string;
  content: string;
  queryId: string;
  attemptInfo?: {
    attemptNumber: number;
    type: 'log' | 'profile' | 'header';
    isInitial: boolean;
  };
} 