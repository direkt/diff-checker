import React, { useMemo } from 'react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import { ViewMode } from './ViewModeToggle';
import { ProfileData } from '@/utils/jqUtils';

interface PlanOperatorSectionProps {
  leftData: ProfileData;
  rightData: ProfileData;
  viewMode: ViewMode;
  showWordDiff: boolean;
  customStyles: Record<string, unknown>;
}

interface ParsedOperator {
  operatorType: string;
  leftOperatorNumber: string;
  rightOperatorNumber: string;
  leftContent: string;
  rightContent: string;
}

const PlanOperatorSection: React.FC<PlanOperatorSectionProps> = ({ 
  leftData, 
  rightData, 
  viewMode, 
  showWordDiff,
  customStyles 
}) => {
  // Parse plan into operators
  const planOperators = useMemo((): ParsedOperator[] => {
    if (!leftData?.plan || !rightData?.plan) {
      return [];
    }

    const leftPlan = leftData.plan;
    const rightPlan = rightData.plan;

    // Regex to match operator header and type, e.g. "00-05 Filter(...)"
    const operatorHeaderRegex = /^(\d{2}-\d{2})\s+(\w+)/;

    // Helper to parse operators into a map of type -> { operatorNumber, content }
    function parseOperators(plan: string) {
      const lines = plan.split('\n');
      const operators: Record<string, { operatorNumber: string; content: string[] }> = {};
      let currentType = '';
      let currentNumber = '';
      
      lines.forEach(line => {
        const match = line.match(operatorHeaderRegex);
        if (match) {
          currentNumber = match[1];
          currentType = match[2];
          if (!operators[currentType]) {
            operators[currentType] = { operatorNumber: currentNumber, content: [] };
          }
        }
        if (currentType) {
          operators[currentType].content.push(line);
        }
      });
      return operators;
    }

    const leftOperators = parseOperators(leftPlan);
    const rightOperators = parseOperators(rightPlan);

    // Get all unique operator types
    const allTypes = Array.from(new Set([
      ...Object.keys(leftOperators),
      ...Object.keys(rightOperators)
    ]));

    // Helper to extract a sortable number from operator number string (e.g., '00-05' -> 5)
    function extractOperatorNumber(operatorNumber: string): number {
      if (!operatorNumber) return Number.POSITIVE_INFINITY;
      const parts = operatorNumber.split('-');
      // Use the second part if available, otherwise the first
      return parts.length === 2 ? parseInt(parts[1], 10) : parseInt(parts[0], 10);
    }

    // Build array of { type, operatorNumber } for sorting
    const typeWithNumbers = allTypes.map(type => {
      const leftNum = leftOperators[type]?.operatorNumber;
      const rightNum = rightOperators[type]?.operatorNumber;
      // Prefer left, fallback to right
      const operatorNumber = leftNum || rightNum || '';
      return { type, operatorNumber };
    });

    // Sort by extracted operator number (smallest to largest)
    typeWithNumbers.sort((a, b) => extractOperatorNumber(a.operatorNumber) - extractOperatorNumber(b.operatorNumber));

    // Build aligned operators by sorted type
    return typeWithNumbers.map(({ type }) => ({
      operatorType: type,
      leftOperatorNumber: leftOperators[type]?.operatorNumber || '',
      rightOperatorNumber: rightOperators[type]?.operatorNumber || '',
      leftContent: leftOperators[type]?.content.join('\n') || '',
      rightContent: rightOperators[type]?.content.join('\n') || ''
    }));
  }, [leftData?.plan, rightData?.plan]);

  if (planOperators.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        No plan operators found to compare
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="px-4 py-2 text-sm text-gray-700 font-medium">
        {planOperators.length} operator type{planOperators.length !== 1 ? 's' : ''} found
      </div>
      {planOperators.map((operator) => (
        <div key={operator.operatorType} className="border rounded-lg overflow-hidden bg-white text-base">
          <div className="bg-blue-100 p-3 font-medium text-blue-800">
            Operator Type: {operator.operatorType}
            {viewMode !== 'target-only' && operator.leftOperatorNumber && (
              <span className="ml-4 text-xs text-gray-500">Source operator: {operator.leftOperatorNumber}</span>
            )}
            {viewMode !== 'source-only' && operator.rightOperatorNumber && (
              <span className="ml-4 text-xs text-gray-500">Target operator: {operator.rightOperatorNumber}</span>
            )}
          </div>
          <div className="p-4 text-base">
            {viewMode === 'source-only' && (
              <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-md overflow-auto text-gray-800 font-mono">
                {operator.leftContent}
              </pre>
            )}
            
            {viewMode === 'target-only' && (
              <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-md overflow-auto text-gray-800 font-mono">
                {operator.rightContent}
              </pre>
            )}
            
            {viewMode === 'split' && (
              <ReactDiffViewer
                oldValue={operator.leftContent}
                newValue={operator.rightContent}
                splitView={true}
                useDarkTheme={false}
                showDiffOnly={false}
                disableWordDiff={!showWordDiff}
                leftTitle="Source"
                rightTitle="Target"
                compareMethod={DiffMethod.WORDS}
                styles={{...customStyles, contentText: {fontSize: '1rem'}}}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PlanOperatorSection;