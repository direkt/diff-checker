export interface DataScan {
  table_name: string;
  scan_type: string;
  filters: string[];
  timestamp: string;
  rows_scanned: number;
  duration_ms: number;
  table_function_filter?: string;
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
  jsonPlan?: any;
  /**
   * The snapshot ID extracted from the plan string, if present.
   */
  snapshotId?: string;
  /**
   * The Dremio version from the profile.
   */
  version?: string;
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
    version: undefined
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
    
    // Extract query
    const query = parsedJson.query || '';
    
    // Extract plan and clean it
    let plan = parsedJson.plan || '';
    
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
    
    // Extract dataset profiles
    const pdsDatasetPaths: string[] = [];
    const vdsDatasetPaths: string[] = [];
    const vdsDetails: { path: string; sql: string }[] = [];
    
    if (parsedJson.datasetProfile && Array.isArray(parsedJson.datasetProfile)) {
      try {
        // Process VDS paths exactly as the jq command would
        vdsDatasetPaths.push(...parsedJson.datasetProfile
          .filter((profile: DatasetProfile) => profile.type === 2)
          .map((profile: DatasetProfile) => profile.datasetPath)
          .sort());  // Add sorting to match jq output order
        
        // Process PDS paths
        parsedJson.datasetProfile
          .filter((profile: DatasetProfile) => profile.type === 1)
          .forEach((profile: DatasetProfile) => {
            pdsDatasetPaths.push(profile.datasetPath);
          });
        
        // Process VDS details for SQL info
        parsedJson.datasetProfile
          .filter((profile: DatasetProfile) => profile.type === 2)
          .forEach((profile: DatasetProfile) => {
            vdsDetails.push({
              path: profile.datasetPath,
              sql: profile.sql || ''
            });
          });
      } catch (error) {
        console.error('Error processing dataset profiles:', error);
      }
    }
    
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
          parsedJson.accelerationProfile.layoutProfiles.forEach((layout: any, index: number) => {
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
              if (layout.numSubstitutions && layout.numSubstitutions > 0) {
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
    
    // Extract data scans
    const dataScans: DataScan[] = [];
    
    // Try to extract from various possible locations in the JSON
    if (parsedJson.dataScans && Array.isArray(parsedJson.dataScans)) {
      dataScans.push(...parsedJson.dataScans);
    } else if (parsedJson.tableScanProfiles && Array.isArray(parsedJson.tableScanProfiles)) {
      // Alternative format
      parsedJson.tableScanProfiles.forEach((scan: any) => {
        dataScans.push({
          table_name: scan.tableName || scan.table_name || 'Unknown',
          scan_type: scan.scanType || scan.scan_type || 'Unknown',
          filters: scan.filters || [],
          timestamp: scan.timestamp || '',
          rows_scanned: scan.rowsScanned || scan.rows_scanned || 0,
          duration_ms: scan.durationMs || scan.duration_ms || 0
        });
      });
    }
    
    // Also look for scans in execution events, which might contain table scan info
    if (parsedJson.executionEvents && Array.isArray(parsedJson.executionEvents)) {
      parsedJson.executionEvents.forEach((event: any) => {
        if (event.type === 'TABLE_SCAN' || event.eventType === 'TABLE_SCAN' || 
            (event.type === 'TABLE_FUNCTION' || event.eventType === 'TABLE_FUNCTION')) {
          dataScans.push({
            table_name: event.tableName || event.table || 'Unknown',
            scan_type: event.scanType || event.scan_type || 
                      (event.attributes && event.attributes.includes('Type=[DATA_FILE_SCAN]') ? 'DATA_FILE_SCAN' : 
                       event.type === 'TABLE_FUNCTION' ? 'TABLE_FUNCTION' : 'Unknown'),
            filters: event.filters || [],
            timestamp: event.timestamp || '',
            rows_scanned: event.rowCount || event.rowsScanned || 0,
            duration_ms: event.durationMs || event.duration_ms || 0
          });
        }
      });
    }
    
    // Extract table functions and data file scans from the plan text
    if (plan) {
      // Look for data file scans
      const dataFileScanMatches = plan.match(/Table Function Type=\[DATA_FILE_SCAN\].*?table=(\S+)/g);
      if (dataFileScanMatches) {
        dataFileScanMatches.forEach((match: string) => {
          // Extract table name from the match
          const tableMatch = match.match(/table=(\S+)/);
          const tableName = tableMatch ? tableMatch[1] : 'Unknown';
          
          dataScans.push({
            table_name: tableName,
            scan_type: 'DATA_FILE_SCAN',
            filters: [],
            timestamp: '',
            rows_scanned: 0,
            duration_ms: 0
          });
        });
      }
      
      // Look for TableFunction with filters
      const tableFilterMatches = plan.match(/TableFunction\(filters=\[\[.*?\]\].*?table=(\S+)/g);
      if (tableFilterMatches) {
        tableFilterMatches.forEach((match: string) => {
          // Extract table name
          const tableMatch = match.match(/table=(\S+)/);
          const tableName = tableMatch ? tableMatch[1].replace(/,/g, '') : 'Unknown';
          
          // Extract filter expression
          const filterMatch = match.match(/filters=\[\[(.*?)\]\]/);
          const filterExpression = filterMatch ? filterMatch[1] : '';
          
          // Check if we already have this table in dataScans
          const existingScan = dataScans.find(scan => scan.table_name === tableName);
          
          if (existingScan) {
            // Update existing scan with table function filter
            existingScan.table_function_filter = filterExpression;
          } else {
            // Add new scan
            dataScans.push({
              table_name: tableName,
              scan_type: 'TABLE_FUNCTION',
              filters: [],
              timestamp: '',
              rows_scanned: 0,
              duration_ms: 0,
              table_function_filter: filterExpression
            });
          }
        });
      }
      
      // Also look for any other TableFunction patterns that might have different formats
      const moreFunctionMatches = plan.match(/TableFunction\(.*?columns=/g);
      if (moreFunctionMatches) {
        moreFunctionMatches.forEach((match: string) => {
          // Try to extract a table name if possible
          const tableMatch = match.match(/table=(\S+)/);
          if (!tableMatch) return; // Skip if no table name found
          
          const tableName = tableMatch[1].replace(/,/g, '');
          
          // Skip if we already processed this table function
          if (dataScans.some(scan => scan.table_name === tableName)) return;
          
          dataScans.push({
            table_name: tableName,
            scan_type: 'TABLE_FUNCTION',
            filters: [],
            timestamp: '',
            rows_scanned: 0,
            duration_ms: 0,
            table_function_filter: match
          });
        });
      }
    }
    
    // Extract jsonPlan if present
    const jsonPlan = parsedJson.jsonPlan ? parsedJson.jsonPlan : undefined;
    
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
      version
    };
  } catch (error) {
    console.error('Error extracting profile data:', error);
    console.log('Returning default empty data structure');
    return defaultData;
  }
}
