export interface ProfileData {
  query: string;
  plan: string;
  pdsDatasetPaths: string[];
  vdsDatasetPaths: string[];
  vdsDetails: { path: string; sql: string }[];
  planPhases: string;
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
  try {
    const parsedJson = JSON.parse(jsonContent);
    
    // Extract query
    const query = parsedJson.query || '';
    
    // Extract plan and clean it
    let plan = parsedJson.plan || '';
    
    // Keep the plan as is without removing any information
    if (plan) {
      plan = plan.split('\n').map((line: string) => {
        return line.replace(/\s+$/, ''); // Only trim trailing whitespace
      }).join('\n');
    }
    
    // Extract dataset profiles
    const pdsDatasetPaths: string[] = [];
    const vdsDatasetPaths: string[] = [];
    const vdsDetails: { path: string; sql: string }[] = [];
    
    if (parsedJson.datasetProfile && Array.isArray(parsedJson.datasetProfile)) {
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
    }
    
    // Extract plan phases
    let planPhases = '';
    if (parsedJson.planPhases && Array.isArray(parsedJson.planPhases)) {
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
    }
    
    return {
      query,
      plan,
      pdsDatasetPaths,
      vdsDatasetPaths,
      vdsDetails,
      planPhases
    };
  } catch (error) {
    console.error('Error extracting profile data:', error);
    throw new Error('Failed to extract profile data');
  }
}
