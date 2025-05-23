// Test script for query phase validation using actual Dremio profile data
import { validateQueryPhases, formatPhaseReport } from './queryPhaseValidator';

// Sample Dremio profile data extracted from the actual profile
const sampleDremioProfile = {
  "planPhases": [
    {
      "phaseName": "Execution Resources Planned",
      "durationMillis": 0,
      "plan": "\ngroupResourceInformation {\n  executorCount : 10,\n  averageExecutorCores : 9,\n  averageExecutorMemory : 117440512000\n}",
      "timeBreakdownPerRule": {},
      "rulesBreakdownStats": []
    },
    {
      "phaseName": "Table Metadata Retrieval",
      "durationMillis": 18,
      "timeBreakdownPerRule": {},
      "rulesBreakdownStats": []
    },
    {
      "phaseName": "Validation",
      "durationMillis": 20,
      "plan": "",
      "timeBreakdownPerRule": {},
      "rulesBreakdownStats": []
    },
    {
      "phaseName": "Convert To Rel",
      "durationMillis": 1,
      "plan": "LogicalAggregate(group=[{0, 1, 2, 3}], info_value=[SUM($4)])\n  LogicalProject(MeasureCode=[$9], infotype=[$14], Tenor=[$13], LegalEntity=[$1], infovalue=[$15])\n    LogicalFilter(condition=[AND(=($16, CAST('2024-04-18':VARCHAR(10)):DATE NOT NULL), =($7, CAST('1221133':VARCHAR(7)):BIGINT NOT NULL), =($9, 'EPE_Coll_pv_profile':VARCHAR(19)), =($71, 'Obligor':VARCHAR(7)), NOT(LIKE(CASE(IS NOT NULL($10), $10, 'N/A':VARCHAR(65536)), '%ALD%':VARCHAR(5))))])\n      ExpansionNode(path=[RDE_BANSHEE.banshee_std_base])\n        LogicalProject(...)",
      "timeBreakdownPerRule": {},
      "rulesBreakdownStats": []
    },
    {
      "phaseName": "Special Entity Expansion",
      "durationMillis": 0,
      "plan": "",
      "timeBreakdownPerRule": {},
      "rulesBreakdownStats": [
        {
          "rule": "FunctionConvertionRule",
          "totalTimeMs": 0,
          "matchedCount": 5,
          "transformedCount": 0,
          "relnodesCount": 6
        }
      ]
    },
    {
      "phaseName": "Special Pull Up",
      "durationMillis": 0,
      "plan": "",
      "timeBreakdownPerRule": {},
      "rulesBreakdownStats": []
    },
    {
      "phaseName": "Entity Expansion",
      "durationMillis": 0,
      "plan": "",
      "timeBreakdownPerRule": {},
      "rulesBreakdownStats": [
        {
          "rule": "FunctionConvertionRule",
          "totalTimeMs": 0,
          "matchedCount": 5,
          "transformedCount": 0,
          "relnodesCount": 6
        }
      ]
    },
    {
      "phaseName": "Default Raw Reflection",
      "durationMillis": 0,
      "plan": "LogicalAggregate(group=[{0, 1, 2, 3}], info_value=[SUM($4)])...",
      "timeBreakdownPerRule": {},
      "rulesBreakdownStats": []
    },
    {
      "phaseName": "Aggregate Rewrite",
      "durationMillis": 0,
      "plan": "",
      "timeBreakdownPerRule": {},
      "rulesBreakdownStats": [
        {
          "rule": "AggregateCallRewriteRule",
          "totalTimeMs": 0,
          "matchedCount": 1,
          "transformedCount": 1,
          "relnodesCount": 6
        },
        {
          "rule": "ArrayAggExpandDistinctAggregateRule",
          "totalTimeMs": 0,
          "matchedCount": 1,
          "transformedCount": 0,
          "relnodesCount": 6
        }
      ]
    },
    {
      "phaseName": "Reduce Expressions",
      "durationMillis": 1,
      "plan": "",
      "timeBreakdownPerRule": {},
      "rulesBreakdownStats": [
        {
          "rule": "FunctionEvaluatorRule",
          "totalTimeMs": 0,
          "matchedCount": 14,
          "transformedCount": 0,
          "relnodesCount": 6
        },
        {
          "rule": "ProjectReduceConstTypeCastRule",
          "totalTimeMs": 0,
          "matchedCount": 5,
          "transformedCount": 0,
          "relnodesCount": 6
        },
        {
          "rule": "ReduceExpressionsRule(Filter)",
          "totalTimeMs": 0,
          "matchedCount": 3,
          "transformedCount": 1,
          "relnodesCount": 6
        }
      ]
    },
    {
      "phaseName": "Logical Planning",
      "durationMillis": 4,
      "plan": "ProjectRel(MeasureCode=[CAST('EPE_Coll_pv_profile':VARCHAR(65536)):VARCHAR(65536)], infotype=[$0], Tenor=[$1], LegalEntity=[$2], info_value=[$3])\n  AggregateRel(group=[{0, 1, 2}], info_value=[SUM($4)])\n    ProjectRel(infotype=[$5], Tenor=[CASE(IS NULL($4), '':VARCHAR(65536), $4)], LegalEntity=[$0], MeasureCode=[CAST('EPE_Coll_pv_profile':VARCHAR(65536)):VARCHAR(65536)], infovalue=[$6])\n      FilterRel(condition=[AND(=($7, 2024-04-18), =($1, 1221133), =($2, 'EPE_Coll_pv_profile':VARCHAR(19)), =($8, 'Obligor':VARCHAR(7)), OR(NOT(LIKE($3, '%ALD%':VARCHAR(5))), IS NULL($3)))])\n        HiveScanDrel(table=[ICEBERG_CATALOG.rde_banshee.COS], snapshot=[5576143933429163627], columns=[`LegalEntity`, `ObligorId`, `MeasureCode`, `ReportAspect`, `Tenor`, `infotype`, `infovalue`, `cob_date`, `AggType`], splits=[1])",
      "timeBreakdownPerRule": {},
      "rulesBreakdownStats": [
        {
          "rule": "ProjectRule",
          "totalTimeMs": 2,
          "matchedCount": 3,
          "transformedCount": 3,
          "relnodesCount": 0
        },
        {
          "rule": "DremioAggregateReduceFunctionsRule",
          "totalTimeMs": 0,
          "matchedCount": 1,
          "transformedCount": 1,
          "relnodesCount": 0
        }
      ]
    },
    {
      "phaseName": "Physical Planning",
      "durationMillis": 5,
      "plan": "",
      "timeBreakdownPerRule": {},
      "rulesBreakdownStats": [
        {
          "rule": "ProjectPrule",
          "totalTimeMs": 0,
          "matchedCount": 6,
          "transformedCount": 26,
          "relnodesCount": 0
        },
        {
          "rule": "HashAggPrule",
          "totalTimeMs": 0,
          "matchedCount": 4,
          "transformedCount": 8,
          "relnodesCount": 0
        }
      ]
    },
    {
      "phaseName": "Final Physical Transformation",
      "durationMillis": 1,
      "plan": "00-00    Screen : rowType = RecordType(VARCHAR(65536) MeasureCode, VARCHAR(65536) infotype, VARCHAR(65536) Tenor, VARCHAR(65536) LegalEntity, DOUBLE info_value): rowcount = 1.0, cumulative cost = {8.1 rows, 61.808024999999994 cpu, 0.0 io, 0.0 network, 35.2 memory}, id = 246418795\n00-01      Project(MeasureCode=[CAST('EPE_Coll_pv_profile':VARCHAR(65536)):VARCHAR(65536)], infotype=[$0], Tenor=[$1], LegalEntity=[$2], info_value=[$3]) : rowType = RecordType(VARCHAR(65536) MeasureCode, VARCHAR(65536) infotype, VARCHAR(65536) Tenor, VARCHAR(65536) LegalEntity, DOUBLE info_value): rowcount = 1.0, cumulative cost = {8.0 rows, 61.70802499999999 cpu, 0.0 io, 0.0 network, 35.2 memory}, id = 246418794\n00-02        HashAgg(group=[{0, 1, 2}], info_value=[SUM($3)]) : rowType = RecordType(VARCHAR(65536) infotype, VARCHAR(65536) Tenor, VARCHAR(65536) LegalEntity, DOUBLE info_value): rowcount = 1.0, cumulative cost = {7.0 rows, 57.707984999999994 cpu, 0.0 io, 0.0 network, 35.2 memory}, id = 246418793",
      "timeBreakdownPerRule": {},
      "rulesBreakdownStats": []
    },
    {
      "phaseName": "Execution Resources Allocated",
      "durationMillis": 13,
      "plan": "",
      "timeBreakdownPerRule": {},
      "rulesBreakdownStats": []
    },
    {
      "phaseName": "Execution Plan: Executor Selection",
      "durationMillis": 0,
      "plan": "idealNumFragments: 1\nidealNumNodes    : 1\nnumExecutors     : 6\ndetails          : default:6,adj:2,metadatarefresh:2,blacklist(0): selectedEndpoints: dremio-executor-0.dremio-cluster-pod.dremio.svc.cluster.local:45678,dremio-executor-3.dremio-cluster-pod.dremio.svc.cluster.local:45678,dremio-executor-5.dremio-cluster-pod.dremio.svc.cluster.local:45678,dremio-executor-1.dremio-cluster-pod.dremio.svc.cluster.local:45678,dremio-executor-4.dremio-cluster-pod.dremio.svc.cluster.local:45678,dremio-executor-2.dremio-cluster-pod.dremio.svc.cluster.local:45678 hardAffinity: false",
      "timeBreakdownPerRule": {},
      "rulesBreakdownStats": []
    },
    {
      "phaseName": "Fragment Start RPCs",
      "durationMillis": 1,
      "sizeStats": {
        "sizePerNode": 25699,
        "fragments": [
          {
            "majorId": 0,
            "majorPortionSize": 23686,
            "minorPortionSize": 241
          }
        ],
        "minorSpecificAttrs": [
          {
            "name": "scan-splits-normalized",
            "size": 158
          }
        ],
        "sharedAttrs": [
          {
            "name": "scan-partitions-normalized::1",
            "size": 38
          }
        ]
      },
      "timeBreakdownPerRule": {},
      "rulesBreakdownStats": []
    },
    {
      "phaseName": "Fragment Activate RPCs",
      "durationMillis": 0,
      "timeBreakdownPerRule": {},
      "rulesBreakdownStats": []
    },
    {
      "phaseName": "Average Catalog Access for 0 Total Dataset(s): using 0 resolved key(s)",
      "durationMillis": 0,
      "timeBreakdownPerRule": {},
      "rulesBreakdownStats": []
    }
  ]
};

export function testQueryPhaseValidation(): void {
  console.log('🧪 Testing Query Phase Validation with actual Dremio profile data...\n');
  
  // Test the validation function
  const validation = validateQueryPhases(sampleDremioProfile);
  
  // Display results
  console.log('📊 Validation Results:');
  console.log(`✅ Valid: ${validation.isValid}`);
  console.log(`📈 Total Phases: ${validation.totalPhases}`);
  console.log(`⏱️  Total Planning Time: ${validation.totalPlanningTime}ms`);
  console.log(`📋 Issues: ${validation.issues.length}`);
  console.log(`💡 Recommendations: ${validation.recommendations.length}\n`);
  
  if (validation.issues.length > 0) {
    console.log('❌ Issues Found:');
    validation.issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
    console.log('');
  }
  
  if (validation.recommendations.length > 0) {
    console.log('💡 Recommendations:');
    validation.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
    console.log('');
  }
  
  // Test phase breakdown
  console.log('📊 Phase Breakdown:');
  console.log(`   Planning: ${validation.phaseBreakdown.planningPhases.length} phases`);
  console.log(`   Execution: ${validation.phaseBreakdown.executionPhases.length} phases`);
  console.log(`   Optimization: ${validation.phaseBreakdown.optimizationPhases.length} phases`);
  console.log(`   Resource: ${validation.phaseBreakdown.resourcePhases.length} phases\n`);
  
  // Test longest/shortest phases
  const longestPhase = validation.phases.reduce((max, phase) => 
    phase.durationMillis > max.durationMillis ? phase : max
  );
  const shortestPhase = validation.phases.reduce((min, phase) => 
    phase.durationMillis < min.durationMillis ? phase : min
  );
  
  console.log('⏱️  Phase Timing Analysis:');
  console.log(`   Longest: ${longestPhase.phaseName} (${longestPhase.durationMillis}ms)`);
  console.log(`   Shortest: ${shortestPhase.phaseName} (${shortestPhase.durationMillis}ms)\n`);
  
  // Test report generation
  console.log('📄 Generating validation report...');
  const report = formatPhaseReport(validation);
  console.log('Report generated successfully!\n');
  
  // Display first few lines of the report
  const reportLines = report.split('\n');
  console.log('📄 Report Preview (first 10 lines):');
  reportLines.slice(0, 10).forEach(line => {
    console.log(`   ${line}`);
  });
  
  console.log('\n✅ Query Phase Validation test completed successfully!');
}

// Test with invalid data
export function testQueryPhaseValidationWithInvalidData(): void {
  console.log('\n🧪 Testing Query Phase Validation with invalid data...\n');
  
  const invalidProfile = {
    planPhases: [
      {
        phaseName: "Unknown Phase",
        durationMillis: -5  // Invalid negative duration
      },
      {
        phaseName: "Another Unknown Phase",
        durationMillis: 50000  // Very long duration
      }
    ]
  };
  
  const validation = validateQueryPhases(invalidProfile);
  
  console.log('📊 Validation Results for Invalid Data:');
  console.log(`✅ Valid: ${validation.isValid}`);
  console.log(`❌ Issues: ${validation.issues.length}`);
  console.log(`💡 Recommendations: ${validation.recommendations.length}\n`);
  
  if (validation.issues.length > 0) {
    console.log('❌ Issues Found:');
    validation.issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
  }
  
  if (validation.recommendations.length > 0) {
    console.log('💡 Recommendations:');
    validation.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
  }
  
  console.log('\n✅ Invalid data test completed!');
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  testQueryPhaseValidation();
  testQueryPhaseValidationWithInvalidData();
} 