import { validateQueryPhases, QueryPhaseValidationResult } from './queryPhaseValidator';
import { 
  safeString, 
  safeNumber, 
  safeStringArray, 
  safeObject, 
  validateQueryId,
  validateScanData,
  validatePhaseData
} from './typeGuards';
import { sanitizeString, sanitizeSqlContent, sanitizeQueryPlan, isSuspiciousContent, isSuspiciousQueryPlan } from './sanitization';
import { 
  PERFORMANCE_THRESHOLDS, 
  OPERATOR_TYPE_MAP, 
  SCAN_TYPES,
  SEVERITY_LEVELS,
  BOTTLENECK_TYPES
} from '@/constants/thresholds';

export interface DataScan {
  table_name: string;
  scan_type: string;
  filters: string[];
  timestamp: string;
  rows_scanned: number;
  duration_ms: number;
  table_function_filter?: string;
}

export interface PerformanceMetrics {
  totalQueryTimeMs: number;
  planningTimeMs: number;
  executionTimeMs: number;
  queryInfo: {
    queryId: string;
    user: string;
    dremioVersion?: string;
  };
  topOperators: {
    operatorId: number;
    operatorType: string;
    operatorName: string;
    setupMs: number;
    processMs: number;
    waitMs: number;
    totalMs: number;
    fragmentId: string;
    inputRecords: number;
    outputRecords: number;
    inputBytes: number;
    outputBytes: number;
    peakMemoryMB: number;
    selectivity?: number;
    throughputRecordsPerSec?: number;
    operatorMetrics?: { [key: string]: number };
  }[];
  phases: {
    phaseName: string;
    durationMs: number;
  }[];
  bottlenecks: {
    type: 'I/O' | 'CPU' | 'Memory' | 'Selectivity';
    description: string;
    severity: 'High' | 'Medium' | 'Low';
    operatorId?: number;
    recommendation: string;
    details?: string;
  }[];
  dataVolumeStats: {
    totalRecordsProcessed: number;
    totalInputBytes: number;
    totalOutputBytes: number;
    totalDataSizeGB: number;
    avgThroughputRecordsPerSec: number;
    compressionRatio?: number;
  };
  operatorStats: {
    totalOperators: number;
    totalOperatorTimeMs: number;
    maxOperatorTimeMs: number;
    avgOperatorTimeMs: number;
  };
  longestRunningOperator?: {
    operatorId: number;
    operatorName: string;
    fragmentId: string;
    totalMs: number;
  };
  longestRunningPhase?: {
    phaseName: string;
    durationMs: number;
  };
}

export interface ProfileData {
  query: string;
  plan: string;
  pdsDatasetPaths: string[];
  vdsDatasetPaths: string[];
  vdsDetails: { path: string; sql: string }[];
  planOperators: string;
  /**
   * Reflection data for the query.
   * This can come from three sources:
   * 1. Direct 'reflections' field in the JSON
   * 2. Extracted from Base64 encoded 'accelerationProfile.accelerationDetails' field
   * 3. Extracted from Base64 encoded 'accelerationDetails' field (legacy fallback)
   * 
   * When from encoded sources, the data is parsed from patterns in the decoded content
   * including "Default Reflections Used", "Raw Reflection", and "Replacements Chosen".
   */
  reflections: {
    chosen: string[];
    considered: string[];
  };
  /**
   * Data scans information extracted from the profile.
   * This includes table names, scan types, and metrics.
   */
  dataScans: DataScan[];
  jsonPlan?: Record<string, unknown>;
  /**
   * The snapshot ID extracted from the plan string, if present.
   */
  snapshotId?: string;
  /**
   * The Dremio version from the profile.
   */
  version?: string;
  /**
   * The non-default options (support keys and their values) parsed from nonDefaultOptionsJSON.
   */
  nonDefaultOptions?: { name: string; value: string | number | boolean }[];
  /**
   * Performance metrics extracted from the profile for analysis.
   */
  performanceMetrics?: PerformanceMetrics;
  /**
   * Query phase validation results to ensure phases are correct and complete.
   */
  queryPhaseValidation?: QueryPhaseValidationResult;
}

interface DatasetProfile {
  type: number;
  datasetPath: string;
  sql?: string;
}

interface PlanOperator {
  operatorName: string;
  plan: string;
}

// Optimized single-pass data processing function
function processDatasetProfiles(datasetProfile: unknown): {
  pdsDatasetPaths: string[];
  vdsDatasetPaths: string[];
  vdsDetails: { path: string; sql: string }[];
} {
  if (!Array.isArray(datasetProfile)) {
    return {
      pdsDatasetPaths: [],
      vdsDatasetPaths: [],
      vdsDetails: []
    };
  }

  try {
    const result = datasetProfile.reduce((acc, profile: DatasetProfile) => {
      if (profile.type === 1) {
        const sanitizedPath = sanitizeString(profile.datasetPath);
        acc.pds.push(sanitizedPath);
      } else if (profile.type === 2) {
        const sanitizedPath = sanitizeString(profile.datasetPath);
        const rawSql = safeString(profile.sql);
        
        // Check for suspicious SQL content
        let sanitizedSql = '';
        if (isSuspiciousContent(rawSql)) {
          console.warn('Suspicious SQL content detected in VDS, blocking content');
          sanitizedSql = '-- SQL content blocked for security reasons --';
        } else {
          sanitizedSql = sanitizeSqlContent(rawSql);
        }
        
        acc.vds.push(sanitizedPath);
        acc.vdsDetails.push({
          path: sanitizedPath,
          sql: sanitizedSql
        });
      }
      return acc;
    }, { pds: [] as string[], vds: [] as string[], vdsDetails: [] as { path: string; sql: string }[] });
    
    // Sort VDS paths to match jq output order
    result.vds.sort();
    
    return {
      pdsDatasetPaths: result.pds,
      vdsDatasetPaths: result.vds,
      vdsDetails: result.vdsDetails
    };
  } catch (error) {
    console.error('Error processing dataset profiles:', error);
    return {
      pdsDatasetPaths: [],
      vdsDatasetPaths: [],
      vdsDetails: []
    };
  }
}

// Optimized data scans extraction combining all sources
function extractDataScans(parsedJson: Record<string, unknown>, plan: string): DataScan[] {
  const dataScans: DataScan[] = [];
  const processedTables = new Set<string>(); // Avoid duplicates

  try {
    // Extract from direct dataScans array
    if (parsedJson.dataScans && Array.isArray(parsedJson.dataScans)) {
      parsedJson.dataScans.forEach((scan: unknown) => {
        const validatedScan = validateScanData(scan);
        if (!processedTables.has(validatedScan.table_name)) {
          dataScans.push(validatedScan);
          processedTables.add(validatedScan.table_name);
        }
      });
    }

    // Extract from tableScanProfiles
    if (parsedJson.tableScanProfiles && Array.isArray(parsedJson.tableScanProfiles)) {
      parsedJson.tableScanProfiles.forEach((scan: unknown) => {
        const validatedScan = validateScanData(scan);
        if (!processedTables.has(validatedScan.table_name)) {
          dataScans.push(validatedScan);
          processedTables.add(validatedScan.table_name);
        }
      });
    }

    // Extract from execution events
    if (parsedJson.executionEvents && Array.isArray(parsedJson.executionEvents)) {
      parsedJson.executionEvents.forEach((event: unknown) => {
        const eventObj = safeObject(event);
        if (eventObj.type === 'TABLE_SCAN' || eventObj.eventType === 'TABLE_SCAN' || 
            (eventObj.type === 'TABLE_FUNCTION' || eventObj.eventType === 'TABLE_FUNCTION')) {
          
          // Special handling for scan type detection
          let scanType = safeString(eventObj.scanType) || safeString(eventObj.scan_type);
          if (!scanType || scanType === 'Unknown') {
            const attributes = safeStringArray(eventObj.attributes);
            if (attributes.includes('Type=[DATA_FILE_SCAN]')) {
              scanType = SCAN_TYPES.DATA_FILE_SCAN;
            } else if (eventObj.type === 'TABLE_FUNCTION') {
              scanType = SCAN_TYPES.TABLE_FUNCTION;
            } else {
              scanType = SCAN_TYPES.UNKNOWN;
            }
          }
          
          const tableName = safeString(eventObj.tableName) || safeString(eventObj.table, 'Unknown');
          if (!processedTables.has(tableName)) {
            dataScans.push({
              table_name: tableName,
              scan_type: scanType,
              filters: safeStringArray(eventObj.filters),
              timestamp: safeString(eventObj.timestamp) || safeString(eventObj.time, ''),
              rows_scanned: safeNumber(eventObj.rowsScanned) || safeNumber(eventObj.rows_scanned, 0),
              duration_ms: safeNumber(eventObj.durationMs) || safeNumber(eventObj.duration_ms, 0),
              table_function_filter: safeString(eventObj.tableFunctionFilter, '') || safeString(eventObj.table_function_filter, '')
            });
            processedTables.add(tableName);
          }
        }
      });
    }

    // Extract from plan text
    if (plan) {
      // Look for data file scans
      const dataFileScanMatches = plan.match(/Table Function Type=\[DATA_FILE_SCAN\].*?table=(\S+)/g);
      dataFileScanMatches?.forEach((match: string) => {
        const tableMatch = match.match(/table=(\S+)/);
        const tableName = tableMatch ? tableMatch[1] : 'Unknown';
        
        if (!processedTables.has(tableName)) {
          dataScans.push({
            table_name: tableName,
            scan_type: SCAN_TYPES.DATA_FILE_SCAN,
            filters: [],
            timestamp: '',
            rows_scanned: 0,
            duration_ms: 0
          });
          processedTables.add(tableName);
        }
      });
      
      // Look for TableFunction with filters
      const tableFilterMatches = plan.match(/TableFunction\(filters=\[\[.*?\]\].*?table=(\S+)/g);
      tableFilterMatches?.forEach((match: string) => {
        const tableMatch = match.match(/table=(\S+)/);
        const tableName = tableMatch ? tableMatch[1].replace(/,/g, '') : 'Unknown';
        const filterMatch = match.match(/filters=\[\[(.*?)\]\]/);
        const filterExpression = filterMatch ? filterMatch[1] : '';
        
        const existingScan = dataScans.find(scan => scan.table_name === tableName);
        if (existingScan) {
          existingScan.table_function_filter = filterExpression;
        } else if (!processedTables.has(tableName)) {
          dataScans.push({
            table_name: tableName,
            scan_type: SCAN_TYPES.TABLE_FUNCTION,
            filters: [],
            timestamp: '',
            rows_scanned: 0,
            duration_ms: 0,
            table_function_filter: filterExpression
          });
          processedTables.add(tableName);
        }
      });
      
      // Look for other TableFunction patterns
      const moreFunctionMatches = plan.match(/TableFunction\(.*?columns=/g);
      moreFunctionMatches?.forEach((match: string) => {
        const tableMatch = match.match(/table=(\S+)/);
        if (!tableMatch) return;
        
        const tableName = tableMatch[1].replace(/,/g, '');
        if (!processedTables.has(tableName)) {
          dataScans.push({
            table_name: tableName,
            scan_type: SCAN_TYPES.TABLE_FUNCTION,
            filters: [],
            timestamp: '',
            rows_scanned: 0,
            duration_ms: 0,
            table_function_filter: match
          });
          processedTables.add(tableName);
        }
      });
    }
  } catch (error) {
    console.error('Error extracting data scans:', error);
  }

  return dataScans;
}

export async function extractProfileData(jsonContent: string): Promise<ProfileData> {
  // Initialize with empty values to ensure we always return a valid object
  const defaultData: ProfileData = {
    query: '',
    plan: '',
    pdsDatasetPaths: [],
    vdsDatasetPaths: [],
    vdsDetails: [],
    planOperators: '',
    reflections: {
      chosen: [],
      considered: []
    },
    dataScans: [],
    jsonPlan: undefined,
    snapshotId: undefined,
    version: undefined,
    nonDefaultOptions: [],
    performanceMetrics: undefined,
    queryPhaseValidation: undefined
  };

  try {
    console.log('Parsing JSON content...');
    const parsedJson = JSON.parse(jsonContent);
    
    // Debug what's available in the parsed JSON
    console.log('Available top-level fields:', Object.keys(parsedJson));
    console.log('Has accelerationProfile:', !!parsedJson.accelerationProfile);
    if (parsedJson.accelerationProfile) {
      console.log('Has accelerationDetails in accelerationProfile:', !!parsedJson.accelerationProfile.accelerationDetails);
    }
    
    // Extract version
    let version: string | undefined = undefined;
    if (parsedJson.dremioVersion) {
      version = parsedJson.dremioVersion;
    } else if (parsedJson.clusterInfo && parsedJson.clusterInfo.version && parsedJson.clusterInfo.version.version) {
      version = parsedJson.clusterInfo.version.version;
    }
    
    // Extract and sanitize query
    let query = safeString(parsedJson.query);
    if (isSuspiciousContent(query)) {
      console.warn('Suspicious content detected in query field');
      query = 'Query content blocked for security reasons';
    } else {
      query = sanitizeSqlContent(query);
    }
    
    // Extract plan - use specialized check for query plans
    let plan = safeString(parsedJson.plan);
    if (isSuspiciousQueryPlan(plan)) {
      console.warn('Malicious content detected in plan field');
      plan = 'Plan content blocked for security reasons';
    } else {
      // Only apply minimal sanitization to preserve plan structure
      plan = plan.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:\s*(?:alert|confirm|prompt|eval)/gi, '')
                .replace(/vbscript:\s*(?:msgbox|eval)/gi, '');
    }
    
    // Keep the plan as is without removing any information
    if (plan) {
      try {
        plan = plan.split('\n').map((line: string) => {
          return line.replace(/\s+$/, ''); // Only trim trailing whitespace
        }).join('\n');
      } catch (error) {
        console.error('Error cleaning plan:', error);
        // Keep original plan if there's an error
      }
    }
    
    // Extract snapshotId from plan using regex
    let snapshotId: string | undefined = undefined;
    if (plan) {
      const match = plan.match(/snapshot=\[([0-9]+)\]/);
      if (match && match[1]) {
        snapshotId = match[1];
      }
    }
    
    // Extract dataset profiles - optimized single-pass processing
    const { pdsDatasetPaths, vdsDatasetPaths, vdsDetails } = processDatasetProfiles(parsedJson.datasetProfile);
    
    // Extract plan operators
    let planOperators = '';
    if (parsedJson.planPhases && Array.isArray(parsedJson.planPhases)) { // Keep planPhases since it's the API field name
      try {
        const convertToRelOperator = parsedJson.planPhases.find(
          (operator: PlanOperator) => operator.operatorName === "Convert To Rel"
        );
        
        if (convertToRelOperator && convertToRelOperator.plan) {
          // Process the plan operators to exactly match the jq/sed command sequence
          planOperators = convertToRelOperator.plan
            .replace(/\\n/g, '\n')
            .split('\n')
            .filter((line: string) => /ScanCrel|ExpansionNode/.test(line))
            .map((line: string) => {
              if (line.includes('ScanCrel')) {
                // Keep the exact format, just replace the prefix
                return line.replace(/^.*?ScanCrel/, 'PDS:');
              } else if (line.includes('ExpansionNode')) {
                // Keep DefaultExpansionNode and exact format
                return line;
              }
              return line;
            })
            .sort((a: string, b: string) => {
              // Custom sort to match the original command's output
              const aIsExpansion = a.includes('ExpansionNode');
              const bIsExpansion = b.includes('ExpansionNode');
              
              if (aIsExpansion && !bIsExpansion) return -1;
              if (!aIsExpansion && bIsExpansion) return 1;
              
              return a.localeCompare(b);
            })
            .join('\n');
        }
      } catch (error) {
        console.error('Error processing plan operators:', error);
      }
    }
    
    // Extract reflections
    const reflections = {
      chosen: [] as string[],
      considered: [] as string[]
    };
    
    console.log('Looking for reflection data...');
    
    try {
      if (parsedJson.reflections) {
        console.log('Found direct reflections field');
        if (Array.isArray(parsedJson.reflections.chosen)) {
          reflections.chosen = parsedJson.reflections.chosen;
          console.log('Found chosen reflections:', reflections.chosen.length);
        }
        if (Array.isArray(parsedJson.reflections.considered)) {
          reflections.considered = parsedJson.reflections.considered;
          console.log('Found considered reflections:', reflections.considered.length);
        }
      } else if (parsedJson.accelerationProfile) {
        console.log('Found accelerationProfile, checking for reflection data...');
        
        // Check for layout profiles first
        if (parsedJson.accelerationProfile.layoutProfiles && 
            Array.isArray(parsedJson.accelerationProfile.layoutProfiles) && 
            parsedJson.accelerationProfile.layoutProfiles.length > 0) {
          
          console.log(`Found ${parsedJson.accelerationProfile.layoutProfiles.length} layout profiles`);
          
          // Process each layout profile and extract reflection info
          parsedJson.accelerationProfile.layoutProfiles.forEach((layout: Record<string, unknown>, index: number) => {
            try {
              console.log(`Layout ${index + 1} fields:`, Object.keys(layout));
              
              if (layout.name) {
                console.log(`Layout ${index + 1} name: ${layout.name}`);
                
                // Add Raw Reflections to the considered list
                if (layout.name === 'Raw Reflection') {
                  reflections.considered.push(`Raw Reflection ${index + 1}`);
                } else {
                  reflections.considered.push(`Reflection: ${layout.name}`);
                }
              }
              
              // Add default reflections to the chosen list
              if (layout.defaultReflection) {
                console.log(`Layout ${index + 1} is default reflection`);
                
                if (layout.name === 'Raw Reflection') {
                  reflections.chosen.push(`Default Raw Reflection`);
                } else {
                  reflections.chosen.push(`Default reflection: ${layout.name || 'unnamed'}`);
                }
              }
              
              // Add substitution info if available
              if (layout.numSubstitutions && (layout.numSubstitutions as number) > 0) {
                console.log(`Layout ${index + 1} substitutions: ${layout.numSubstitutions}`);
                reflections.chosen.push(`Substitutions used: ${layout.numSubstitutions}`);
              }
            } catch (error) {
              console.error(`Error processing layout ${index + 1}:`, error);
            }
          });
        }
      }
    } catch (error) {
      console.error('Error extracting reflection data:', error);
    }
    
    // Extract data scans - optimized single collection
    const dataScans: DataScan[] = extractDataScans(parsedJson, plan);
    
    // Extract jsonPlan if present
    const jsonPlan = parsedJson.jsonPlan ? parsedJson.jsonPlan : undefined;
    
    // Extract nonDefaultOptionsJSON
    let nonDefaultOptions: { name: string; value: string | number | boolean }[] = [];
    if (parsedJson.nonDefaultOptionsJSON) {
      try {
        // Parse the JSON string (may be escaped)
        const optionsArr = JSON.parse(parsedJson.nonDefaultOptionsJSON);
        if (Array.isArray(optionsArr)) {
          nonDefaultOptions = optionsArr.map((opt: Record<string, unknown>) => {
            let value = opt.num_val;
            if (value === undefined) value = opt.float_val;
            if (value === undefined) value = opt.bool_val;
            if (value === undefined) value = opt.string_val;
            return {
              name: (opt.name as string) || 'Unknown',
              value: (value as string | number | boolean) || 'Unknown'
            };
          });
        }
      } catch (err) {
        console.error('Failed to parse nonDefaultOptionsJSON:', err);
      }
    }
    
    // Extract performance metrics if present
    const performanceMetrics: PerformanceMetrics | undefined = extractPerformanceMetrics(parsedJson);
    
    // Extract query phase validation results
    const queryPhaseValidation: QueryPhaseValidationResult | undefined = validateQueryPhases(parsedJson);
    
    return {
      query,
      plan,
      pdsDatasetPaths,
      vdsDatasetPaths,
      vdsDetails,
      planOperators,
      reflections,
      dataScans,
      jsonPlan,
      snapshotId,
      version,
      nonDefaultOptions,
      performanceMetrics,
      queryPhaseValidation
    };
  } catch (error) {
    console.error('Error extracting profile data:', error);
    console.log('Returning default empty data structure');
    return defaultData;
  }
}

function extractPerformanceMetrics(parsedJson: Record<string, unknown>): PerformanceMetrics | undefined {
  try {
    // Extract basic timing information
    const startTime = safeNumber(parsedJson.start, 0);
    const endTime = safeNumber(parsedJson.end, 0);
    const planningStart = safeNumber(parsedJson.planningStart, 0);
    const planningEnd = safeNumber(parsedJson.planningEnd, 0);
    
    const totalQueryTimeMs = endTime - startTime;
    const planningTimeMs = planningEnd - planningStart;
    const executionTimeMs = totalQueryTimeMs - planningTimeMs;

    // Extract query info
    const queryInfo = {
      queryId: validateQueryId(parsedJson.id),
      user: safeString(parsedJson.user, 'Unknown'),
      dremioVersion: safeString(parsedJson.dremioVersion) || 
        safeString(safeObject(safeObject(parsedJson.clusterInfo).version).version, 'Unknown')
    };

    // Extract phases
    const phases: PerformanceMetrics['phases'] = [];
    const planPhases = Array.isArray(parsedJson.planPhases) ? parsedJson.planPhases : [];
    
    for (const phase of planPhases) {
      const validatedPhase = validatePhaseData(phase);
      phases.push({
        phaseName: validatedPhase.phaseName,
        durationMs: validatedPhase.durationMillis
      });
    }

    // Extract detailed operator performance data
    const operators: Array<Record<string, unknown>> = [];
    const fragmentProfiles = (parsedJson.fragmentProfile as Array<{
      majorFragmentId?: number;
      minorFragmentProfile?: Array<{
        minorFragmentId?: number;
        operatorProfile?: Array<{
          operatorId?: number;
          operatorType?: number;
          setupNanos?: number;
          processNanos?: number;
          waitNanos?: number;
          inputProfile?: Array<{ records?: number; size?: number }>;
          outputRecords?: number;
          outputBytes?: number;
          peakLocalMemoryAllocated?: number;
          metric?: Array<{ metricId?: number; longValue?: number; doubleValue?: number }>;
        }>;
      }>;
    }>) || [];
    
    for (const fragment of fragmentProfiles) {
      const majorFragmentId = fragment.majorFragmentId || 0;
      const minorFragments = fragment.minorFragmentProfile || [];
      
      for (const minorFragment of minorFragments) {
        const minorFragmentId = minorFragment.minorFragmentId || 0;
        const operatorProfiles = minorFragment.operatorProfile || [];
        
        for (const op of operatorProfiles) {
          const operatorId = op.operatorId || 0;
          const operatorType = op.operatorType || 0;
          const setupNanos = op.setupNanos || 0;
          const processNanos = op.processNanos || 0;
          const waitNanos = op.waitNanos || 0;
          
          // Extract I/O metrics
          const inputProfiles = op.inputProfile || [];
          const totalInputRecords = inputProfiles.reduce((sum: number, ip) => sum + (ip.records || 0), 0);
          const totalInputBytes = inputProfiles.reduce((sum: number, ip) => sum + (ip.size || 0), 0);
          const outputRecords = op.outputRecords || 0;
          const outputBytes = op.outputBytes || 0;
          const peakMemory = op.peakLocalMemoryAllocated || 0;
          
          // Extract operator-specific metrics
          const operatorMetrics: { [key: string]: number } = {};
          const metrics = op.metric || [];
          for (const metric of metrics) {
            const metricId = metric.metricId || 0;
            if (metric.longValue !== undefined) {
              operatorMetrics[`metric_${metricId}`] = metric.longValue;
            } else if (metric.doubleValue !== undefined) {
              operatorMetrics[`metric_${metricId}`] = metric.doubleValue;
            }
          }
          
          // Calculate selectivity if applicable
          let selectivity: number | undefined;
          if (totalInputRecords > 0 && outputRecords >= 0) {
            selectivity = outputRecords / totalInputRecords;
          }
          
          // Calculate throughput
          let throughputRecordsPerSec: number | undefined;
          if (processNanos > 0 && totalInputRecords > 0) {
            throughputRecordsPerSec = Math.round(totalInputRecords / (processNanos / PERFORMANCE_THRESHOLDS.NANOS_TO_SECONDS));
          }
          
          const totalMs = Math.round((setupNanos + processNanos + waitNanos) / PERFORMANCE_THRESHOLDS.NANOS_TO_MILLIS);
          
          operators.push({
            operatorId,
            operatorType: getOperatorTypeName(operatorType),
            operatorName: getOperatorTypeName(operatorType),
            setupMs: Math.round(setupNanos / PERFORMANCE_THRESHOLDS.NANOS_TO_MILLIS),
            processMs: Math.round(processNanos / PERFORMANCE_THRESHOLDS.NANOS_TO_MILLIS),
            waitMs: Math.round(waitNanos / PERFORMANCE_THRESHOLDS.NANOS_TO_MILLIS),
            totalMs,
            fragmentId: `${majorFragmentId}-${minorFragmentId}`,
            inputRecords: totalInputRecords,
            outputRecords,
            inputBytes: totalInputBytes,
            outputBytes,
            peakMemoryMB: Math.round(peakMemory / PERFORMANCE_THRESHOLDS.BYTES_TO_MB),
            selectivity,
            throughputRecordsPerSec,
            operatorMetrics: Object.keys(operatorMetrics).length > 0 ? operatorMetrics : undefined,
            // Store raw nanos for calculations
            _setupNanos: setupNanos,
            _processNanos: processNanos,
            _waitNanos: waitNanos,
            _totalNanos: setupNanos + processNanos + waitNanos
          });
        }
      }
    }

    // Sort operators by total time and get top operators
    const topOperators = operators
      .sort((a, b) => (b.totalMs as number) - (a.totalMs as number))
      .slice(0, PERFORMANCE_THRESHOLDS.MAX_TOP_OPERATORS)
      .map(op => {
        // Remove internal fields before returning
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _setupNanos, _processNanos, _waitNanos, _totalNanos, ...cleanOp } = op;
        return cleanOp as PerformanceMetrics['topOperators'][0];
      });

    // Calculate operator statistics
    const operatorStats = {
      totalOperators: operators.length,
      totalOperatorTimeMs: operators.reduce((sum, op) => sum + (op.totalMs as number), 0),
      maxOperatorTimeMs: operators.length > 0 ? Math.max(...operators.map(op => op.totalMs as number)) : 0,
      avgOperatorTimeMs: operators.length > 0 ? Math.round(operators.reduce((sum, op) => sum + (op.totalMs as number), 0) / operators.length) : 0
    };

    // Find longest running operator and phase
    const longestRunningOperator = operators.length > 0 ? 
      (() => {
        const longest = operators.reduce((max, op) => (op.totalMs as number) > (max.totalMs as number) ? op : max);
        return {
          operatorId: longest.operatorId as number,
          operatorName: longest.operatorName as string,
          fragmentId: longest.fragmentId as string,
          totalMs: longest.totalMs as number
        };
      })() : undefined;

    const longestRunningPhase = phases.length > 0 ?
      phases.reduce((max, phase) => phase.durationMs > max.durationMs ? phase : max) : undefined;

    // Comprehensive bottleneck analysis
    const bottlenecks: PerformanceMetrics['bottlenecks'] = [];
    
    // 1. I/O Bottlenecks (high wait times)
    const highWaitOperators = operators.filter(op => 
      (op._waitNanos as number) > (op._processNanos as number) && 
      (op._waitNanos as number) > PERFORMANCE_THRESHOLDS.MIN_WAIT_TIME_NANOS && 
      (op._totalNanos as number) > 0
    ).sort((a, b) => (b._waitNanos as number) - (a._waitNanos as number));
    
    if (highWaitOperators.length > 0) {
      const topWaitOp = highWaitOperators[0];
      const waitPercentage = Math.round(((topWaitOp._waitNanos as number) / (topWaitOp._totalNanos as number)) * 100);
      bottlenecks.push({
        type: BOTTLENECK_TYPES.IO,
        description: `High I/O wait time detected in Op ${topWaitOp.operatorId} (${topWaitOp.operatorName})`,
        severity: waitPercentage > PERFORMANCE_THRESHOLDS.HIGH_WAIT_PERCENTAGE ? SEVERITY_LEVELS.HIGH : 
                 waitPercentage > PERFORMANCE_THRESHOLDS.MEDIUM_WAIT_PERCENTAGE ? SEVERITY_LEVELS.MEDIUM : SEVERITY_LEVELS.LOW,
        operatorId: topWaitOp.operatorId as number,
        recommendation: 'Consider optimizing storage access, partitioning strategy, or predicate pushdown',
        details: `${waitPercentage}% of execution time spent waiting (${formatTime(topWaitOp._waitNanos as number)})`
      });
    }

    // 2. Selectivity Issues (low selectivity filters)
    const lowSelectivityOperators = operators.filter(op => 
      op.selectivity !== undefined && 
      (op.selectivity as number) < PERFORMANCE_THRESHOLDS.POOR_SELECTIVITY && 
      (op.inputRecords as number) > PERFORMANCE_THRESHOLDS.LOW_RECORD_COUNT
    ).sort((a, b) => (a.selectivity as number || 0) - (b.selectivity as number || 0));
    
    if (lowSelectivityOperators.length > 0) {
      const worstSelectivity = lowSelectivityOperators[0];
      const selectivityPct = ((worstSelectivity.selectivity as number) * 100).toFixed(3);
      bottlenecks.push({
        type: BOTTLENECK_TYPES.SELECTIVITY,
        description: `Poor filter selectivity in Op ${worstSelectivity.operatorId} (${worstSelectivity.operatorName})`,
        severity: (worstSelectivity.selectivity as number) < PERFORMANCE_THRESHOLDS.VERY_POOR_SELECTIVITY ? SEVERITY_LEVELS.HIGH : SEVERITY_LEVELS.MEDIUM,
        operatorId: worstSelectivity.operatorId as number,
        recommendation: 'Improve predicate pushdown, add better indexes, or optimize query filters',
        details: `${selectivityPct}% selectivity (${(worstSelectivity.inputRecords as number).toLocaleString()} → ${(worstSelectivity.outputRecords as number).toLocaleString()} records)`
      });
    }

    // 3. Memory Bottlenecks
    const highMemoryOperators = operators.filter(op => (op.peakMemoryMB as number) > PERFORMANCE_THRESHOLDS.LOW_MEMORY_MB)
      .sort((a, b) => (b.peakMemoryMB as number) - (a.peakMemoryMB as number));
    
    if (highMemoryOperators.length > 0) {
      const topMemoryOp = highMemoryOperators[0];
      bottlenecks.push({
        type: BOTTLENECK_TYPES.MEMORY,
        description: `High memory usage in Op ${topMemoryOp.operatorId} (${topMemoryOp.operatorName})`,
        severity: (topMemoryOp.peakMemoryMB as number) > PERFORMANCE_THRESHOLDS.HIGH_MEMORY_MB ? SEVERITY_LEVELS.HIGH : 
                 (topMemoryOp.peakMemoryMB as number) > PERFORMANCE_THRESHOLDS.MEDIUM_MEMORY_MB ? SEVERITY_LEVELS.MEDIUM : SEVERITY_LEVELS.LOW,
        operatorId: topMemoryOp.operatorId as number,
        recommendation: 'Consider increasing memory allocation or optimizing data processing',
        details: `${topMemoryOp.peakMemoryMB}MB peak memory allocation`
      });
    }

    // 4. High Record Volume Analysis
    const highRecordOperators = operators.filter(op => (op.inputRecords as number) > PERFORMANCE_THRESHOLDS.HIGH_RECORD_COUNT)
      .sort((a, b) => (b.inputRecords as number) - (a.inputRecords as number));
    
    if (highRecordOperators.length > 0) {
      const topRecordOp = highRecordOperators[0];
      const throughput = (topRecordOp.throughputRecordsPerSec as number) || 0;
      if (throughput < PERFORMANCE_THRESHOLDS.HIGH_THROUGHPUT_RECORDS_PER_SEC) {
        bottlenecks.push({
          type: BOTTLENECK_TYPES.CPU,
          description: `Low throughput in high-volume Op ${topRecordOp.operatorId} (${topRecordOp.operatorName})`,
          severity: throughput < PERFORMANCE_THRESHOLDS.CRITICAL_LOW_THROUGHPUT_RECORDS_PER_SEC ? SEVERITY_LEVELS.HIGH : 
                   throughput < PERFORMANCE_THRESHOLDS.LOW_THROUGHPUT_RECORDS_PER_SEC ? SEVERITY_LEVELS.MEDIUM : SEVERITY_LEVELS.LOW,
          operatorId: topRecordOp.operatorId as number,
          recommendation: 'Consider query optimization, better parallelization, or more CPU resources',
          details: `Processing ${formatRecords(topRecordOp.inputRecords as number)} records at ${throughput.toLocaleString()} rec/sec`
        });
      }
    }

    // Calculate comprehensive data volume statistics
    const totalRecordsProcessed = operators.reduce((sum, op) => sum + (op.inputRecords as number), 0);
    const totalInputBytes = operators.reduce((sum, op) => sum + (op.inputBytes as number), 0);
    const totalOutputBytes = operators.reduce((sum, op) => sum + (op.outputBytes as number), 0);
    const totalDataSizeGB = totalInputBytes / PERFORMANCE_THRESHOLDS.BYTES_TO_GB;
    const avgThroughputRecordsPerSec = executionTimeMs > 0 ? Math.round(totalRecordsProcessed / (executionTimeMs / 1000)) : 0;
    
    // Calculate compression ratio if we have both input and output bytes
    let compressionRatio: number | undefined;
    if (totalInputBytes > 0 && totalOutputBytes > 0) {
      compressionRatio = totalInputBytes / totalOutputBytes;
    }

    return {
      totalQueryTimeMs,
      planningTimeMs,
      executionTimeMs,
      queryInfo,
      topOperators,
      phases: phases.sort((a, b) => b.durationMs - a.durationMs), // Sort phases by duration
      bottlenecks,
      dataVolumeStats: {
        totalRecordsProcessed,
        totalInputBytes,
        totalOutputBytes,
        totalDataSizeGB,
        avgThroughputRecordsPerSec,
        compressionRatio
      },
      operatorStats,
      longestRunningOperator,
      longestRunningPhase
    };
  } catch (error) {
    console.error('Error extracting performance metrics:', error);
    return undefined;
  }
}

// Helper function to format records (similar to Python script)
function formatRecords(records: number): string {
  if (records < PERFORMANCE_THRESHOLDS.LOW_RECORD_COUNT) return records.toString();
  if (records < PERFORMANCE_THRESHOLDS.HIGH_RECORD_COUNT) return `${(records / PERFORMANCE_THRESHOLDS.LOW_RECORD_COUNT).toFixed(1)}K`;
  if (records < 1_000_000_000) return `${(records / PERFORMANCE_THRESHOLDS.HIGH_RECORD_COUNT).toFixed(1)}M`;
  return `${(records / 1_000_000_000).toFixed(1)}B`;
}

// Helper function to format time (similar to Python script)
function formatTime(nanos: number): string {
  if (nanos < PERFORMANCE_THRESHOLDS.MICROS_TO_NANOS) return `${nanos}ns`;
  if (nanos < PERFORMANCE_THRESHOLDS.NANOS_TO_MILLIS) return `${(nanos / PERFORMANCE_THRESHOLDS.MICROS_TO_NANOS).toFixed(2)}μs`;
  if (nanos < PERFORMANCE_THRESHOLDS.NANOS_TO_SECONDS) return `${(nanos / PERFORMANCE_THRESHOLDS.NANOS_TO_MILLIS).toFixed(2)}ms`;
  return `${(nanos / PERFORMANCE_THRESHOLDS.NANOS_TO_SECONDS).toFixed(2)}s`;
}

function getOperatorTypeName(operatorType: number): string {
  return OPERATOR_TYPE_MAP[operatorType as keyof typeof OPERATOR_TYPE_MAP] || `Operator_${operatorType}`;
}
