import { AttemptFile, QueryAttempt, MultiAttemptQuery, RetryPattern, ProcessedFileWithAttempts } from '@/types/multipleAttempts';

/**
 * Sanitizes JSON string by escaping control characters that cause parsing errors
 */
function sanitizeJsonString(jsonStr: string): string {
  try {
    // First try to parse as-is in case it's already valid
    JSON.parse(jsonStr);
    return jsonStr;
  } catch {
    // If parsing fails, sanitize the content
    return jsonStr
      .replace(/\r\n/g, '\\n')  // Replace Windows line endings
      .replace(/\n/g, '\\n')    // Replace Unix line endings
      .replace(/\r/g, '\\r')    // Replace Mac line endings
      .replace(/\t/g, '\\t')    // Replace tabs
      .replace(/\f/g, '\\f')    // Replace form feeds
      .replace(/\b/g, '\\b')    // Replace backspaces
      .replace(/\v/g, '\\v')    // Replace vertical tabs
      .replace(/\0/g, '\\0')    // Replace null characters
      .replace(/[\x00-\x1F\x7F]/g, (match) => {
        // Replace any remaining control characters with unicode escapes
        return '\\u' + match.charCodeAt(0).toString(16).padStart(4, '0');
      });
  }
}

// Regular expressions for different file naming patterns
const ATTEMPT_PATTERNS = {
  // Current pattern: log_attempt_0.json, profile_attempt_0.json
  current: /^(log|profile)_attempt_(\d+)\.json$/,
  // Proposed pattern: attempt_00_initial.json, attempt_01_retry.json, attempt_00_initial_profile.json
  proposed: /^attempt_(\d+)_(initial|retry)(?:_profile)?\.json$/,
  // Header file: header.json
  header: /^header\.json$/
};

/**
 * Detects if a filename follows a multiple attempt pattern
 */
export function isAttemptFile(filename: string): boolean {
  const baseName = filename.split('/').pop() || filename;
  return Object.values(ATTEMPT_PATTERNS).some(pattern => pattern.test(baseName));
}

/**
 * Parses attempt information from a filename
 */
export function parseAttemptInfo(filename: string): {
  attemptNumber: number;
  type: 'log' | 'profile' | 'header';
  isInitial: boolean;
} | null {
  const baseName = filename.split('/').pop() || filename;
  
  // Check header file
  if (ATTEMPT_PATTERNS.header.test(baseName)) {
    return {
      attemptNumber: -1, // Header files don't have attempt numbers
      type: 'header',
      isInitial: false
    };
  }
  
  // Check current pattern (log_attempt_0.json, profile_attempt_0.json)
  const currentMatch = baseName.match(ATTEMPT_PATTERNS.current);
  if (currentMatch) {
    const [, type, attemptStr] = currentMatch;
    const attemptNumber = parseInt(attemptStr, 10);
    return {
      attemptNumber,
      type: type as 'log' | 'profile',
      isInitial: attemptNumber === 0
    };
  }
  
  // Check proposed pattern (attempt_00_initial.json, attempt_01_retry.json)
  const proposedMatch = baseName.match(ATTEMPT_PATTERNS.proposed);
  if (proposedMatch) {
    const [fullMatch, attemptStr, attemptType] = proposedMatch;
    const attemptNumber = parseInt(attemptStr, 10);
    const isProfile = fullMatch.includes('_profile');
    
    return {
      attemptNumber,
      type: isProfile ? 'profile' : 'log',
      isInitial: attemptType === 'initial'
    };
  }
  
  return null;
}

/**
 * Groups files by query ID and detects multiple attempts
 */
export function detectMultipleAttempts(files: ProcessedFileWithAttempts[]): {
  singleQueries: ProcessedFileWithAttempts[];
  multiAttemptQueries: MultiAttemptQuery[];
} {
  const singleQueries: ProcessedFileWithAttempts[] = [];
  const multiAttemptGroups: { [queryId: string]: AttemptFile[] } = {};
  
  // Group files by queryId and identify attempt files
  files.forEach(file => {
    const attemptInfo = parseAttemptInfo(file.name);
    
    if (attemptInfo) {
      // This is an attempt file
      if (!multiAttemptGroups[file.queryId]) {
        multiAttemptGroups[file.queryId] = [];
      }
      
      multiAttemptGroups[file.queryId].push({
        filename: file.name,
        content: file.content,
        type: attemptInfo.type,
        attemptNumber: attemptInfo.attemptNumber,
        isInitial: attemptInfo.isInitial
      });
      
      // Also update the original file with attempt info
      file.attemptInfo = attemptInfo;
    } else {
      // This is a regular file
      singleQueries.push(file);
    }
  });
  
  // Convert attempt groups to MultiAttemptQuery objects
  const multiAttemptQueries: MultiAttemptQuery[] = Object.entries(multiAttemptGroups).map(
    ([queryId, attemptFiles]) => buildMultiAttemptQuery(queryId, attemptFiles)
  );
  
  return {
    singleQueries,
    multiAttemptQueries
  };
}

/**
 * Builds a MultiAttemptQuery from attempt files
 */
function buildMultiAttemptQuery(queryId: string, attemptFiles: AttemptFile[]): MultiAttemptQuery {
  // Find header file
  const headerFile = attemptFiles.find(f => f.type === 'header');
  
  // Group files by attempt number
  const attemptGroups: { [attemptNumber: number]: AttemptFile[] } = {};
  
  attemptFiles
    .filter(f => f.type !== 'header' && f.attemptNumber !== undefined)
    .forEach(file => {
      const attemptNum = file.attemptNumber!;
      if (!attemptGroups[attemptNum]) {
        attemptGroups[attemptNum] = [];
      }
      attemptGroups[attemptNum].push(file);
    });
  
  // Create QueryAttempt objects
  const attempts: QueryAttempt[] = Object.entries(attemptGroups)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([attemptNumStr, files]) => {
      const attemptNumber = parseInt(attemptNumStr);
      const logFile = files.find(f => f.type === 'log');
      const profileFile = files.find(f => f.type === 'profile');
      
      return createQueryAttempt(attemptNumber, logFile, profileFile);
    });
  
  // Analyze retry pattern
  const retryPattern = analyzeRetryPattern(attempts);
  
  // Determine final status
  const finalStatus = attempts.length > 0 ? 
    (attempts.some(a => a.status === 'success') ? 'success' : 'failed') : 
    'failed';
  
  return {
    baseQueryId: queryId,
    totalAttempts: attempts.length,
    finalStatus,
    attempts,
    headerFile: headerFile?.filename || '',
    headerContent: headerFile?.content,
    retryPattern
  };
}

/**
 * Creates a QueryAttempt from log and profile files
 */
function createQueryAttempt(
  attemptNumber: number,
  logFile?: AttemptFile,
  profileFile?: AttemptFile
): QueryAttempt {
  // Extract timestamp and error info from log file
  let startTime = '';
  let endTime = '';
  let duration = 0;
  let errorId = '';
  let status: QueryAttempt['status'] = 'failed';
  
  if (logFile?.content) {
    try {
      // First try to parse as JSON
      let logData: any = null;
      
      try {
        // Sanitize the JSON content to handle unescaped control characters
        const sanitizedContent = sanitizeJsonString(logFile.content);
        logData = JSON.parse(sanitizedContent);
      } catch (jsonError) {
        // If JSON parsing fails, treat it as raw log content and extract what we can
        console.warn(`Log file ${attemptNumber} is not valid JSON, treating as raw content:`, jsonError);
        logData = { message: logFile.content };
      }
      
      if (logData.message) {
        // Extract timestamps from SQL query in the message
        const timestampMatches = logData.message.match(/timestamp'([^']+)'/g);
        if (timestampMatches && timestampMatches.length >= 2) {
          startTime = timestampMatches[0].replace("timestamp'", "").replace("'", "");
          endTime = timestampMatches[1].replace("timestamp'", "").replace("'", "");
          
          // Calculate duration
          const startTimeMs = new Date(startTime).getTime();
          const endTimeMs = new Date(endTime).getTime();
          duration = endTimeMs - startTimeMs;
        }
        
        // Extract error ID
        const errorIdMatch = logData.message.match(/\[Error Id: ([^\]]+)\]/);
        if (errorIdMatch) {
          errorId = errorIdMatch[1];
        }
        
        // Determine status based on message content
        if (logData.message.includes('SUCCESS') || logData.message.includes('COMPLETED')) {
          status = 'success';
        } else if (logData.message.includes('TIMEOUT')) {
          status = 'timeout';
        } else if (logData.message.includes('CANCELLED')) {
          status = 'cancelled';
        }
      }
    } catch (error) {
      console.error(`Error parsing log file for attempt ${attemptNumber}:`, error);
    }
  }
  
  const timestamp = {
    start: startTime,
    end: endTime,
    duration
  };
  
  return {
    attemptNumber,
    attemptId: `attempt_${attemptNumber.toString().padStart(2, '0')}`,
    timestamp,
    errorId,
    status,
    logFile: logFile?.filename,
    profileFile: profileFile?.filename,
    rawLogContent: logFile?.content,
    rawProfileContent: profileFile?.content
  };
}

/**
 * Analyzes retry patterns across attempts
 */
function analyzeRetryPattern(attempts: QueryAttempt[]): RetryPattern {
  const retryIntervals: number[] = [];
  const timeoutProgression: number[] = [];
  
  // Calculate intervals between attempts
  for (let i = 1; i < attempts.length; i++) {
    const prevEnd = new Date(attempts[i - 1].timestamp.end).getTime();
    const currentStart = new Date(attempts[i].timestamp.start).getTime();
    const interval = (currentStart - prevEnd) / 1000; // Convert to seconds
    retryIntervals.push(interval);
  }
  
  // Calculate timeout progression (duration of each attempt)
  attempts.forEach(attempt => {
    timeoutProgression.push(attempt.timestamp.duration);
  });
  
  // Determine backoff type
  let backoffType: RetryPattern['backoffType'] = 'custom';
  if (retryIntervals.length > 1) {
    const isLinear = retryIntervals.every((interval, i) => 
      i === 0 || Math.abs(interval - retryIntervals[0]) < 1000 // Within 1 second tolerance
    );
    
    if (isLinear) {
      backoffType = 'linear';
    } else {
      // Check for exponential backoff (each interval roughly double the previous)
      const isExponential = retryIntervals.every((interval, i) => 
        i === 0 || (interval / retryIntervals[i - 1] >= 1.5 && interval / retryIntervals[i - 1] <= 3)
      );
      
      if (isExponential) {
        backoffType = 'exponential';
      }
    }
  }
  
  // Calculate total duration
  let totalDuration = 0;
  if (attempts.length > 0) {
    const firstStart = new Date(attempts[0].timestamp.start).getTime();
    const lastEnd = new Date(attempts[attempts.length - 1].timestamp.end).getTime();
    totalDuration = lastEnd - firstStart;
  }
  
  return {
    retryIntervals,
    timeoutProgression,
    backoffType,
    maxRetries: attempts.length - 1, // First attempt is not a retry
    totalDuration
  };
}

/**
 * Generates new filename following the proposed naming convention
 */
export function generateNewAttemptFilename(
  attemptNumber: number,
  type: 'log' | 'profile',
  isInitial: boolean
): string {
  const paddedNumber = attemptNumber.toString().padStart(2, '0');
  const attemptType = isInitial ? 'initial' : 'retry';
  const suffix = type === 'profile' ? '_profile' : '';
  
  return `attempt_${paddedNumber}_${attemptType}${suffix}.json`;
}

/**
 * Checks if a query has multiple attempts
 */
export function hasMultipleAttempts(files: ProcessedFileWithAttempts[], queryId: string): boolean {
  const queryFiles = files.filter(f => f.queryId === queryId);
  const attemptFiles = queryFiles.filter(f => isAttemptFile(f.name));
  
  // Count unique attempt numbers
  const attemptNumbers = new Set(
    attemptFiles
      .map(f => parseAttemptInfo(f.name))
      .filter(info => info && info.attemptNumber >= 0)
      .map(info => info!.attemptNumber)
  );
  
  return attemptNumbers.size > 1;
} 