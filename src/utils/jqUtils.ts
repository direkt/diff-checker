export interface ProfileData {
  query: string;
  plan: string;
  pdsDatasetPaths: string[];
  vdsDatasetPaths: string[];
  vdsDetails: { path: string; sql: string }[];
  planPhases: string;
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
}

interface DatasetProfile {
  type: number;
  datasetPath: string;
  sql?: string;
}

interface PlanPhase {
  phaseName: string;
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
    planPhases: '',
    reflections: {
      chosen: [],
      considered: []
    }
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
    
    // Extract plan phases
    let planPhases = '';
    if (parsedJson.planPhases && Array.isArray(parsedJson.planPhases)) {
      try {
        const convertToRelPhase = parsedJson.planPhases.find(
          (phase: PlanPhase) => phase.phaseName === "Convert To Rel"
        );
        
        if (convertToRelPhase && convertToRelPhase.plan) {
          // Process the plan phases to exactly match the jq/sed command sequence
          planPhases = convertToRelPhase.plan
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
        console.error('Error processing plan phases:', error);
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
    
    return {
      query,
      plan,
      pdsDatasetPaths,
      vdsDatasetPaths,
      vdsDetails,
      planPhases,
      reflections
    };
  } catch (error) {
    console.error('Error extracting profile data:', error);
    console.log('Returning default empty data structure');
    return defaultData;
  }
}
