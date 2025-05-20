import React, { ReactElement, useMemo } from 'react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import sql from 'react-syntax-highlighter/dist/esm/languages/hljs/sql';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { ProfileData } from '@/utils/jqUtils';
import DataScanComparison from './DataScanComparison';
import { OperatorGraph } from './OperatorGraph';

SyntaxHighlighter.registerLanguage('sql', sql);

interface DiffViewerProps {
  leftData: ProfileData | null;
  rightData: ProfileData | null;
  selectedSection: string;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ leftData, rightData, selectedSection }) => {
  // Custom styles to improve word-level diffing
  const customStyles = {
    variables: {
      light: {
        diffViewerBackground: '#fff',
        diffViewerColor: '#212529',
        addedBackground: '#e6ffed',
        addedColor: '#24292e',
        removedBackground: '#1e40af',
        removedColor: '#ffffff',
        wordAddedBackground: '#acf2bd',
        wordRemovedBackground: '#2563eb',
        addedGutterBackground: '#cdffd8',
        removedGutterBackground: '#1e3a8a',
        gutterBackground: '#f7f7f7',
        gutterBackgroundDark: '#f3f1f1',
        highlightBackground: '#fffbdd',
        highlightGutterBackground: '#fff5b1',
      },
    },
    wordDiff: {
      padding: '3px',
      borderRadius: '3px',
      display: 'inline-block',
    },
  };

  // Parse plan into operators - moved before any conditional returns
  const planOperators = useMemo(() => {
    if (!leftData?.plan || !rightData?.plan || selectedSection !== 'plan') {
      return null;
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
    const operators = typeWithNumbers.map(({ type }) => ({
      operatorType: type,
      leftOperatorNumber: leftOperators[type]?.operatorNumber || '',
      rightOperatorNumber: rightOperators[type]?.operatorNumber || '',
      leftContent: leftOperators[type]?.content.join('\n') || '',
      rightContent: rightOperators[type]?.content.join('\n') || ''
    }));

    return operators;
  }, [leftData, rightData, selectedSection]);

  if (!leftData || !rightData) {
    return (
      <div className="p-4 text-center text-gray-500">
        Please upload files on both sides to view differences
      </div>
    );
  }

  const getContentForSection = (data: ProfileData, section: string): string => {
    switch (section) {
      case 'plan':
        return data.plan || '';
      case 'pdsDatasetPaths':
        return data.pdsDatasetPaths.join('\n') || '';
      case 'vdsDatasetPaths':
        return data.vdsDatasetPaths.join('\n') || '';
      case 'vdsDetails':
        return data.vdsDetails.map(vds => `-- VDS path: ${vds.path}\n${vds.sql}`).join('\n\n') || '';
      case 'planOperators':
        return data.planOperators || '';
      case 'reflections':
        const chosenReflections = data.reflections?.chosen?.map(r => `[Chosen] ${r}`) || [];
        const consideredReflections = data.reflections?.considered?.map(r => `[Considered] ${r}`) || [];
        
        if (chosenReflections.length === 0 && consideredReflections.length === 0) {
          return 'No reflection data available';
        }
        
        return [...chosenReflections, ...consideredReflections].join('\n') || '';
      case 'dataScans':
        return '';
      default:
        return '';
    }
  };

  // Special case for data scans
  if (selectedSection === 'dataScans') {
    return <DataScanComparison leftData={leftData} rightData={rightData} />;
  }

  // For non-plan sections, use the standard diff viewer
  if (selectedSection !== 'plan' || !planOperators) {
    const leftContent = getContentForSection(leftData, selectedSection);
    const rightContent = getContentForSection(rightData, selectedSection);

    return (
      <div className="border rounded-lg overflow-hidden">
        <ReactDiffViewer
          oldValue={leftContent}
          newValue={rightContent}
          splitView={true}
          useDarkTheme={false}
          showDiffOnly={false}
          disableWordDiff={true}
          leftTitle="Source"
          rightTitle="Target"
          styles={customStyles}
          compareMethod={DiffMethod.WORDS}
          renderContent={(str: string): ReactElement => {
            if (selectedSection === 'vdsDetails') {
              return (
                <SyntaxHighlighter language="sql" style={docco}>
                  {str}
                </SyntaxHighlighter>
              );
            }
            return <span>{str}</span>;
          }}
        />
      </div>
    );
  }

  // For plan section, render each operator in its own box
  if (selectedSection === 'plan' && leftData?.jsonPlan && rightData?.jsonPlan) {
    return (
      <div className="flex flex-col gap-8">
        {/* Snapshot ID Section */}
        <div className="flex flex-row gap-8 items-center">
          <div className="flex-1">
            <div className="border rounded-lg bg-white p-3">
              <span className="font-medium text-blue-800">Source Snapshot ID: </span>
              {leftData.snapshotId ? (
                <span className="text-gray-800">{leftData.snapshotId}</span>
              ) : (
                <span className="text-gray-400 italic">Not found</span>
              )}
            </div>
          </div>
          <div className="flex-1">
            <div className="border rounded-lg bg-white p-3">
              <span className="font-medium text-blue-800">Target Snapshot ID: </span>
              {rightData.snapshotId ? (
                <span className="text-gray-800">{rightData.snapshotId}</span>
              ) : (
                <span className="text-gray-400 italic">Not found</span>
              )}
            </div>
          </div>
          {leftData.snapshotId && rightData.snapshotId && leftData.snapshotId !== rightData.snapshotId && (
            <div className="flex-1">
              <div className="border rounded-lg bg-yellow-100 p-3 text-yellow-800 font-semibold">
                Snapshot IDs differ!
              </div>
            </div>
          )}
        </div>
        {/* Dataset Information Section */}
        <div className="space-y-4">
          {/* PDS Dataset Paths */}
          {leftData.pdsDatasetPaths.join('\n') !== rightData.pdsDatasetPaths.join('\n') && (
            <div className="border rounded-lg bg-yellow-100 p-3 text-yellow-800 font-semibold mb-2">
              PDS Dataset Paths differ!
            </div>
          )}
          <div className="border rounded-lg overflow-hidden bg-white">
            <div className="bg-blue-100 p-3 font-medium text-blue-800">
              PDS Dataset Paths
            </div>
            <div className="p-4">
              <ReactDiffViewer
                oldValue={leftData.pdsDatasetPaths.join('\n')}
                newValue={rightData.pdsDatasetPaths.join('\n')}
                splitView={true}
                useDarkTheme={false}
                showDiffOnly={false}
                disableWordDiff={true}
                leftTitle="Source"
                rightTitle="Target"
                styles={customStyles}
              />
            </div>
          </div>

          {/* VDS Dataset Paths */}
          {leftData.vdsDatasetPaths.join('\n') !== rightData.vdsDatasetPaths.join('\n') && (
            <div className="border rounded-lg bg-yellow-100 p-3 text-yellow-800 font-semibold mb-2">
              VDS Dataset Paths differ!
            </div>
          )}
          <div className="border rounded-lg overflow-hidden bg-white">
            <div className="bg-blue-100 p-3 font-medium text-blue-800">
              VDS Dataset Paths
            </div>
            <div className="p-4">
              <ReactDiffViewer
                oldValue={leftData.vdsDatasetPaths.join('\n')}
                newValue={rightData.vdsDatasetPaths.join('\n')}
                splitView={true}
                useDarkTheme={false}
                showDiffOnly={false}
                disableWordDiff={true}
                leftTitle="Source"
                rightTitle="Target"
                styles={customStyles}
              />
            </div>
          </div>
        </div>

        {/* Plan Graph Section */}
        <div className="flex flex-row gap-8">
          <div className="flex-1">
            <OperatorGraph planJson={leftData.jsonPlan} title="Source Plan Graph" />
          </div>
          <div className="flex-1">
            <OperatorGraph planJson={rightData.jsonPlan} title="Target Plan Graph" />
          </div>
        </div>

        {/* Plan Operators Section */}
        <div>
          <div className="space-y-6">
            <div className="px-4 py-2 text-sm text-gray-700 font-medium">
              {planOperators.length} operator type{planOperators.length !== 1 ? 's' : ''} found
            </div>
            {planOperators.map((operator) => (
              <div key={operator.operatorType} className="border rounded-lg overflow-hidden bg-white">
                <div className="bg-blue-100 p-3 font-medium text-blue-800">
                  Operator Type: {operator.operatorType}
                  {operator.leftOperatorNumber && (
                    <span className="ml-4 text-xs text-gray-500">Source operator: {operator.leftOperatorNumber}</span>
                  )}
                  {operator.rightOperatorNumber && (
                    <span className="ml-4 text-xs text-gray-500">Target operator: {operator.rightOperatorNumber}</span>
                  )}
                </div>
                <div className="p-4">
                  <ReactDiffViewer
                    oldValue={operator.leftContent}
                    newValue={operator.rightContent}
                    splitView={true}
                    useDarkTheme={false}
                    showDiffOnly={false}
                    disableWordDiff={true}
                    leftTitle="Source"
                    rightTitle="Target"
                    compareMethod={DiffMethod.WORDS}
                    styles={customStyles}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="px-4 py-2 text-sm text-gray-700 font-medium">
        {planOperators.length} operator type{planOperators.length !== 1 ? 's' : ''} found
      </div>
      {planOperators.map((operator) => (
        <div key={operator.operatorType} className="border rounded-lg overflow-hidden bg-white">
          <div className="bg-blue-100 p-3 font-medium text-blue-800">
            Operator Type: {operator.operatorType}
            {operator.leftOperatorNumber && (
              <span className="ml-4 text-xs text-gray-500">Source operator: {operator.leftOperatorNumber}</span>
            )}
            {operator.rightOperatorNumber && (
              <span className="ml-4 text-xs text-gray-500">Target operator: {operator.rightOperatorNumber}</span>
            )}
          </div>
          <div className="p-4">
            <ReactDiffViewer
              oldValue={operator.leftContent}
              newValue={operator.rightContent}
              splitView={true}
              useDarkTheme={false}
              showDiffOnly={false}
              disableWordDiff={true}
              leftTitle="Source"
              rightTitle="Target"
              compareMethod={DiffMethod.WORDS}
              styles={customStyles}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default DiffViewer;
