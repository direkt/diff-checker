import React from 'react';
import { QueryPhaseValidationResult, getPhaseAnalysis, formatPhaseReport } from '@/utils/queryPhaseValidator';

interface QueryPhaseValidationProps {
  validation: QueryPhaseValidationResult;
  title: string;
}

export default function QueryPhaseValidation({ validation, title }: QueryPhaseValidationProps) {
  const analysis = getPhaseAnalysis(validation.phases);

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <h3 className="text-lg font-medium text-blue-800 mb-3">{title} Query Phase Validation</h3>
      
      {/* Status Overview */}
      <div className="mb-4 p-3 rounded-md bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">Status:</span>
          <span className={`px-2 py-1 rounded text-sm font-medium ${
            validation.isValid 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {validation.isValid ? '✅ Valid' : '❌ Invalid'}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Total Phases:</span>
            <span className="ml-2 font-medium">{validation.totalPhases}</span>
          </div>
          <div>
            <span className="text-gray-600">Total Planning Time:</span>
            <span className="ml-2 font-medium">{validation.totalPlanningTime}ms</span>
          </div>
          <div>
            <span className="text-gray-600">Average Duration:</span>
            <span className="ml-2 font-medium">{analysis.averageDuration}ms</span>
          </div>
          <div>
            <span className="text-gray-600">Total Duration:</span>
            <span className="ml-2 font-medium">{analysis.totalDuration}ms</span>
          </div>
        </div>
      </div>

      {/* Phase Analysis */}
      {analysis.longestPhase && (
        <div className="mb-4 p-3 rounded-md bg-blue-50">
          <h4 className="font-medium text-blue-800 mb-2">Phase Analysis</h4>
          <div className="text-sm space-y-1">
            <div>
              <span className="text-gray-600">Longest Phase:</span>
              <span className="ml-2 font-medium">{analysis.longestPhase.phaseName}</span>
              <span className="ml-1 text-gray-500">({analysis.longestPhase.durationMillis}ms)</span>
            </div>
            {analysis.shortestPhase && (
              <div>
                <span className="text-gray-600">Shortest Phase:</span>
                <span className="ml-2 font-medium">{analysis.shortestPhase.phaseName}</span>
                <span className="ml-1 text-gray-500">({analysis.shortestPhase.durationMillis}ms)</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Phase Distribution */}
      {Object.keys(analysis.phaseDistribution).length > 0 && (
        <div className="mb-4 p-3 rounded-md bg-green-50">
          <h4 className="font-medium text-green-800 mb-2">Phase Distribution</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(analysis.phaseDistribution).map(([category, percentage]) => (
              <div key={category} className="flex justify-between">
                <span className="text-gray-600">{category}:</span>
                <span className="font-medium">{percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Issues */}
      {validation.issues.length > 0 && (
        <div className="mb-4 p-3 rounded-md bg-red-50">
          <h4 className="font-medium text-red-800 mb-2">Issues Found</h4>
          <ul className="text-sm space-y-1">
            {validation.issues.map((issue, index) => (
              <li key={index} className="flex items-start">
                <span className="text-red-600 mr-2">❌</span>
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {validation.recommendations.length > 0 && (
        <div className="mb-4 p-3 rounded-md bg-yellow-50">
          <h4 className="font-medium text-yellow-800 mb-2">Recommendations</h4>
          <ul className="text-sm space-y-1">
            {validation.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start">
                <span className="text-yellow-600 mr-2">💡</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Phase Breakdown */}
      <div className="mb-4">
        <h4 className="font-medium text-gray-800 mb-2">Phase Breakdown</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Planning Phases:</span>
            <span className="ml-2 font-medium">{validation.phaseBreakdown.planningPhases.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Execution Phases:</span>
            <span className="ml-2 font-medium">{validation.phaseBreakdown.executionPhases.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Optimization Phases:</span>
            <span className="ml-2 font-medium">{validation.phaseBreakdown.optimizationPhases.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Resource Phases:</span>
            <span className="ml-2 font-medium">{validation.phaseBreakdown.resourcePhases.length}</span>
          </div>
        </div>
      </div>

      {/* Detailed Phase List */}
      <details className="mt-4">
        <summary className="cursor-pointer font-medium text-gray-800 hover:text-blue-600">
          View All Phases ({validation.phases.length})
        </summary>
        <div className="mt-2 max-h-60 overflow-y-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1 pr-4">#</th>
                <th className="text-left py-1 pr-4">Phase Name</th>
                <th className="text-left py-1">Duration (ms)</th>
              </tr>
            </thead>
            <tbody>
              {validation.phases.map((phase, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-1 pr-4 text-gray-500">{index + 1}</td>
                  <td className="py-1 pr-4 font-medium">{phase.phaseName}</td>
                  <td className="py-1">{phase.durationMillis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {/* Export Report Button */}
      <div className="mt-4 pt-3 border-t">
        <button
          onClick={() => {
            const report = formatPhaseReport(validation);
            const blob = new Blob([report], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `query-phase-validation-${title.toLowerCase()}.md`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Export Report
        </button>
      </div>
    </div>
  );
} 