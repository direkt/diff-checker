// Query Phase Validator for Dremio Profiles
// This utility validates that the query phases extracted from Dremio profiles are correct
// and provides comprehensive phase analysis

interface ProfileDataInput {
  planPhases?: Array<{
    phaseName?: string;
    durationMillis?: number;
    plan?: string;
    timeBreakdownPerRule?: Record<string, number>;
    rulesBreakdownStats?: Array<{
      rule: string;
      totalTimeMs: number;
      matchedCount: number;
      transformedCount: number;
      relnodesCount: number;
    }>;
    sizeStats?: {
      sizePerNode: number;
      fragments: Array<{
        majorId: number;
        majorPortionSize: number;
        minorPortionSize: number;
      }>;
      minorSpecificAttrs: Array<{
        name: string;
        size: number;
      }>;
      sharedAttrs: Array<{
        name: string;
        size: number;
      }>;
    };
  }>;
}

export interface QueryPhase {
  phaseName: string;
  durationMillis: number;
  plan?: string;
  timeBreakdownPerRule?: Record<string, number>;
  rulesBreakdownStats?: Array<{
    rule: string;
    totalTimeMs: number;
    matchedCount: number;
    transformedCount: number;
    relnodesCount: number;
  }>;
  sizeStats?: {
    sizePerNode: number;
    fragments: Array<{
      majorId: number;
      majorPortionSize: number;
      minorPortionSize: number;
    }>;
    minorSpecificAttrs: Array<{
      name: string;
      size: number;
    }>;
    sharedAttrs: Array<{
      name: string;
      size: number;
    }>;
  };
}

export interface QueryPhaseValidationResult {
  isValid: boolean;
  totalPhases: number;
  totalPlanningTime: number;
  phases: QueryPhase[];
  phaseBreakdown: {
    planningPhases: QueryPhase[];
    executionPhases: QueryPhase[];
    optimizationPhases: QueryPhase[];
    resourcePhases: QueryPhase[];
  };
  issues: string[];
  recommendations: string[];
}

// Known Dremio query phases based on actual profile analysis
export const KNOWN_DREMIO_PHASES = [
  // Resource and Setup Phases
  'Execution Resources Planned',
  'Execution Resources Allocated',
  'Execution Plan: Executor Selection',
  'Execution Plan: Fragment Assignment', 
  'Execution Plan: Plan Generation',
  'Fragment Start RPCs',
  'Fragment Activate RPCs',
  
  // Metadata and Validation Phases
  'Table Metadata Retrieval',
  'Validation',
  
  // Planning Phases
  'Convert To Rel',
  'Special Entity Expansion',
  'Special Pull Up',
  'Entity Expansion',
  'Default Raw Reflection',
  'Aggregate Rewrite',
  'Reduce Expressions',
  'Operator Expansion',
  'Project Pushdown',
  'Filter Constant Resolution Pushdown',
  'Pre-Logical Filter Pushdown',
  
  // Optimization Phases
  'Find Materializations',
  'Logical Planning',
  'Agg-Join Pushdown',
  'Multi-Join analysis',
  'LOPT Join Planning',
  'Post Join Optimization',
  'Physical Planning',
  'Physical Heuristic Planning',
  'Final Physical Transformation',
  
  // Iceberg and Storage Phases
  'Iceberg Snapshot Replacement',
  
  // Cache and Results Phases
  'Results Cache Not Used',
  
  // Catalog Access Phases (dynamic)
  // Pattern: 'Average Catalog Access for X Total Dataset(s): using Y resolved key(s)'
] as const;

export const PHASE_CATEGORIES = {
  PLANNING: [
    'Convert To Rel',
    'Special Entity Expansion', 
    'Special Pull Up',
    'Entity Expansion',
    'Default Raw Reflection',
    'Aggregate Rewrite',
    'Reduce Expressions',
    'Operator Expansion',
    'Project Pushdown',
    'Filter Constant Resolution Pushdown',
    'Pre-Logical Filter Pushdown',
    'Find Materializations',
    'Logical Planning',
    'Agg-Join Pushdown',
    'Multi-Join analysis',
    'LOPT Join Planning',
    'Post Join Optimization',
    'Physical Planning',
    'Physical Heuristic Planning',
    'Final Physical Transformation'
  ],
  EXECUTION: [
    'Execution Resources Planned',
    'Execution Resources Allocated',
    'Execution Plan: Executor Selection',
    'Execution Plan: Fragment Assignment',
    'Execution Plan: Plan Generation',
    'Fragment Start RPCs',
    'Fragment Activate RPCs'
  ],
  OPTIMIZATION: [
    'Aggregate Rewrite',
    'Reduce Expressions',
    'Operator Expansion',
    'Project Pushdown',
    'Filter Constant Resolution Pushdown',
    'Pre-Logical Filter Pushdown',
    'Agg-Join Pushdown',
    'Multi-Join analysis',
    'LOPT Join Planning',
    'Post Join Optimization',
    'Physical Heuristic Planning'
  ],
  RESOURCE: [
    'Execution Resources Planned',
    'Execution Resources Allocated',
    'Table Metadata Retrieval',
    'Iceberg Snapshot Replacement',
    'Results Cache Not Used'
  ]
} as const;

export function validateQueryPhases(profileData: ProfileDataInput): QueryPhaseValidationResult {
  const result: QueryPhaseValidationResult = {
    isValid: true,
    totalPhases: 0,
    totalPlanningTime: 0,
    phases: [],
    phaseBreakdown: {
      planningPhases: [],
      executionPhases: [],
      optimizationPhases: [],
      resourcePhases: []
    },
    issues: [],
    recommendations: []
  };

  try {
    // Extract planPhases from the profile
    const planPhases = profileData.planPhases || [];
    
    if (!Array.isArray(planPhases)) {
      result.isValid = false;
      result.issues.push('planPhases is not an array or is missing');
      return result;
    }

    result.totalPhases = planPhases.length;
    result.totalPlanningTime = planPhases.reduce((sum: number, phase) => 
      sum + (phase.durationMillis || 0), 0);

    // Process each phase
    for (const phase of planPhases) {
      const processedPhase: QueryPhase = {
        phaseName: phase.phaseName || 'Unknown Phase',
        durationMillis: phase.durationMillis || 0,
        plan: phase.plan,
        timeBreakdownPerRule: phase.timeBreakdownPerRule,
        rulesBreakdownStats: phase.rulesBreakdownStats,
        sizeStats: phase.sizeStats
      };

      result.phases.push(processedPhase);

      // Categorize phases
      if ((PHASE_CATEGORIES.PLANNING as readonly string[]).includes(processedPhase.phaseName)) {
        result.phaseBreakdown.planningPhases.push(processedPhase);
      }
      if ((PHASE_CATEGORIES.EXECUTION as readonly string[]).includes(processedPhase.phaseName)) {
        result.phaseBreakdown.executionPhases.push(processedPhase);
      }
      if ((PHASE_CATEGORIES.OPTIMIZATION as readonly string[]).includes(processedPhase.phaseName)) {
        result.phaseBreakdown.optimizationPhases.push(processedPhase);
      }
      if ((PHASE_CATEGORIES.RESOURCE as readonly string[]).includes(processedPhase.phaseName)) {
        result.phaseBreakdown.resourcePhases.push(processedPhase);
      }

      // Validate phase name
      const isKnownPhase = (KNOWN_DREMIO_PHASES as readonly string[]).includes(processedPhase.phaseName) ||
                          processedPhase.phaseName.startsWith('Average Catalog Access for') ||
                          processedPhase.phaseName.includes('CompositeFilterPushdown') ||
                          processedPhase.phaseName.includes('eliminate_empty_scans');

      if (!isKnownPhase) {
        result.issues.push(`Unknown phase detected: "${processedPhase.phaseName}"`);
      }

      // Validate phase duration
      if (processedPhase.durationMillis < 0) {
        result.issues.push(`Negative duration for phase: "${processedPhase.phaseName}"`);
      }

      // Check for unusually long phases
      if (processedPhase.durationMillis > 30000) { // 30 seconds
        result.recommendations.push(
          `Phase "${processedPhase.phaseName}" took ${processedPhase.durationMillis}ms - consider optimization`
        );
      }
    }

    // Validate phase sequence and completeness
    validatePhaseSequence(result);
    validatePhaseCompleteness(result);

    // Set overall validity
    result.isValid = result.issues.length === 0;

  } catch (error) {
    result.isValid = false;
    result.issues.push(`Error validating query phases: ${error}`);
  }

  return result;
}

function validatePhaseSequence(result: QueryPhaseValidationResult): void {
  const phases = result.phases;
  
  // Check for expected phase ordering
  const expectedEarlyPhases = ['Validation', 'Convert To Rel', 'Table Metadata Retrieval'];
  const expectedLatePhases = ['Fragment Start RPCs', 'Fragment Activate RPCs'];
  
  // Validate early phases appear early
  for (const expectedPhase of expectedEarlyPhases) {
    const phaseIndex = phases.findIndex(p => p.phaseName === expectedPhase);
    if (phaseIndex > 10) { // Should appear in first 10 phases
      result.recommendations.push(
        `Phase "${expectedPhase}" appears late in sequence (position ${phaseIndex + 1})`
      );
    }
  }

  // Validate late phases appear late
  for (const expectedPhase of expectedLatePhases) {
    const phaseIndex = phases.findIndex(p => p.phaseName === expectedPhase);
    if (phaseIndex !== -1 && phaseIndex < phases.length - 5) { // Should appear in last 5 phases
      result.recommendations.push(
        `Phase "${expectedPhase}" appears early in sequence (position ${phaseIndex + 1})`
      );
    }
  }
}

function validatePhaseCompleteness(result: QueryPhaseValidationResult): void {
  const phaseNames = result.phases.map(p => p.phaseName);
  
  // Check for essential phases
  const essentialPhases = [
    'Validation',
    'Convert To Rel', 
    'Logical Planning',
    'Physical Planning'
  ];

  for (const essential of essentialPhases) {
    if (!phaseNames.includes(essential)) {
      result.issues.push(`Missing essential phase: "${essential}"`);
    }
  }

  // Check for planning vs execution balance
  const planningTime = result.phaseBreakdown.planningPhases.reduce(
    (sum, p) => sum + p.durationMillis, 0
  );
  const executionTime = result.phaseBreakdown.executionPhases.reduce(
    (sum, p) => sum + p.durationMillis, 0
  );

  if (planningTime > executionTime * 2) {
    result.recommendations.push(
      `Planning time (${planningTime}ms) is significantly higher than execution time (${executionTime}ms)`
    );
  }
}

export function getPhaseAnalysis(phases: QueryPhase[]): {
  longestPhase: QueryPhase | null;
  shortestPhase: QueryPhase | null;
  averageDuration: number;
  totalDuration: number;
  phaseDistribution: Record<string, number>;
} {
  if (phases.length === 0) {
    return {
      longestPhase: null,
      shortestPhase: null,
      averageDuration: 0,
      totalDuration: 0,
      phaseDistribution: {}
    };
  }

  const totalDuration = phases.reduce((sum, p) => sum + p.durationMillis, 0);
  const averageDuration = totalDuration / phases.length;
  
  const longestPhase = phases.reduce((max, p) => 
    p.durationMillis > max.durationMillis ? p : max
  );
  
  const shortestPhase = phases.reduce((min, p) => 
    p.durationMillis < min.durationMillis ? p : min
  );

  // Calculate phase distribution by category
  const phaseDistribution: Record<string, number> = {};
  
  for (const [category, categoryPhases] of Object.entries(PHASE_CATEGORIES)) {
    const categoryTime = phases
      .filter(p => (categoryPhases as readonly string[]).includes(p.phaseName))
      .reduce((sum, p) => sum + p.durationMillis, 0);
    
    if (categoryTime > 0) {
      phaseDistribution[category] = Math.round((categoryTime / totalDuration) * 100);
    }
  }

  return {
    longestPhase,
    shortestPhase,
    averageDuration: Math.round(averageDuration),
    totalDuration,
    phaseDistribution
  };
}

export function formatPhaseReport(validation: QueryPhaseValidationResult): string {
  const analysis = getPhaseAnalysis(validation.phases);
  
  let report = `# Dremio Query Phase Validation Report\n\n`;
  
  report += `## Summary\n`;
  report += `- **Status**: ${validation.isValid ? '✅ Valid' : '❌ Invalid'}\n`;
  report += `- **Total Phases**: ${validation.totalPhases}\n`;
  report += `- **Total Planning Time**: ${validation.totalPlanningTime}ms\n`;
  report += `- **Average Phase Duration**: ${analysis.averageDuration}ms\n\n`;

  if (analysis.longestPhase) {
    report += `## Phase Analysis\n`;
    report += `- **Longest Phase**: ${analysis.longestPhase.phaseName} (${analysis.longestPhase.durationMillis}ms)\n`;
    report += `- **Shortest Phase**: ${analysis.shortestPhase?.phaseName} (${analysis.shortestPhase?.durationMillis}ms)\n\n`;
  }

  if (Object.keys(analysis.phaseDistribution).length > 0) {
    report += `## Phase Distribution\n`;
    for (const [category, percentage] of Object.entries(analysis.phaseDistribution)) {
      report += `- **${category}**: ${percentage}%\n`;
    }
    report += `\n`;
  }

  if (validation.issues.length > 0) {
    report += `## Issues Found\n`;
    validation.issues.forEach(issue => {
      report += `- ❌ ${issue}\n`;
    });
    report += `\n`;
  }

  if (validation.recommendations.length > 0) {
    report += `## Recommendations\n`;
    validation.recommendations.forEach(rec => {
      report += `- 💡 ${rec}\n`;
    });
    report += `\n`;
  }

  report += `## Phase Details\n`;
  validation.phases.forEach((phase, index) => {
    report += `${index + 1}. **${phase.phaseName}** - ${phase.durationMillis}ms\n`;
  });

  return report;
} 