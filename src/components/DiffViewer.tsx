import React, { ReactElement, useMemo, useState } from 'react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import sql from 'react-syntax-highlighter/dist/esm/languages/hljs/sql';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { ProfileData } from '@/utils/jqUtils';
import DataScanComparison from './DataScanComparison';

SyntaxHighlighter.registerLanguage('sql', sql);

interface DiffViewerProps {
  leftData: ProfileData | null;
  rightData: ProfileData | null;
  selectedSection: string;
  showWordDiff?: boolean;
}

type ViewMode = 'split' | 'source-only' | 'target-only';

const DiffViewer: React.FC<DiffViewerProps> = ({ leftData, rightData, selectedSection, showWordDiff = true }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('split');

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

  // Render view mode toggle buttons
  const renderViewModeToggle = () => (
    <div className="flex justify-center mb-6 bg-white p-4 rounded-lg shadow-sm">
      <div className="flex space-x-2">
        <button
          onClick={() => setViewMode('source-only')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            viewMode === 'source-only'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          📄 Source Only
        </button>
        <button
          onClick={() => setViewMode('split')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            viewMode === 'split'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          ⚖️ Split View
        </button>
        <button
          onClick={() => setViewMode('target-only')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            viewMode === 'target-only'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          📄 Target Only
        </button>
      </div>
    </div>
  );

  // Render single column content
  const renderSingleColumn = (data: ProfileData, title: string, content: string) => (
    <div className="border rounded-lg overflow-hidden bg-white">
      <div className="bg-blue-100 p-4 font-medium text-blue-800 text-lg">
        {title}
      </div>
      <div className="p-6">
        <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-md overflow-auto text-gray-800 font-mono">
          {content}
        </pre>
      </div>
    </div>
  );

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
      <div className="p-4 text-center text-gray-500 text-base">
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
    return (
      <div className="text-base">
        {renderViewModeToggle()}
        <DataScanComparison leftData={leftData} rightData={rightData} viewMode={viewMode} />
      </div>
    );
  }

  // For non-plan sections, use the standard diff viewer or single column view
  if (selectedSection !== 'plan' || !planOperators) {
    const leftContent = getContentForSection(leftData, selectedSection);
    const rightContent = getContentForSection(rightData, selectedSection);

    return (
      <div>
        {renderViewModeToggle()}
        
        {viewMode === 'source-only' && (
          renderSingleColumn(leftData, "Source", leftContent)
        )}
        
        {viewMode === 'target-only' && (
          renderSingleColumn(rightData, "Target", rightContent)
        )}
        
        {viewMode === 'split' && (
          <div className="border rounded-lg overflow-hidden text-base">
            <ReactDiffViewer
              oldValue={leftContent}
              newValue={rightContent}
              splitView={true}
              useDarkTheme={false}
              showDiffOnly={false}
              disableWordDiff={!showWordDiff}
              leftTitle="Source"
              rightTitle="Target"
              styles={{...customStyles, contentText: {fontSize: '1rem'}}}
              compareMethod={DiffMethod.WORDS}
              renderContent={(str: string): ReactElement => {
                if (selectedSection === 'vdsDetails') {
                  return (
                    <SyntaxHighlighter language="sql" style={docco} customStyle={{fontSize: '1rem'}}>
                      {str}
                    </SyntaxHighlighter>
                  );
                }
                return <span>{str}</span>;
              }}
            />
          </div>
        )}
      </div>
    );
  }

  // For plan section, render each operator in its own box
  if (selectedSection === 'plan' && leftData?.jsonPlan && rightData?.jsonPlan) {
    return (
      <div className="flex flex-col gap-8 text-base">
        {renderViewModeToggle()}
        
        {/* Snapshot IDs differ warning - now above the snapshot IDs */}
        {leftData.snapshotId && rightData.snapshotId && leftData.snapshotId !== rightData.snapshotId && (
          <div className="w-full max-w-xl mx-auto mb-4 bg-yellow-100 p-3 text-yellow-800 font-semibold rounded-lg text-center">
            Snapshot IDs differ!
          </div>
        )}
        
        {/* Snapshot ID Section */}
        {viewMode === 'split' && (
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
          </div>
        )}
        
        {viewMode === 'source-only' && (
          <div className="border rounded-lg bg-white p-3">
            <span className="font-medium text-blue-800">Source Snapshot ID: </span>
            {leftData.snapshotId ? (
              <span className="text-gray-800">{leftData.snapshotId}</span>
            ) : (
              <span className="text-gray-400 italic">Not found</span>
            )}
          </div>
        )}
        
        {viewMode === 'target-only' && (
          <div className="border rounded-lg bg-white p-3">
            <span className="font-medium text-blue-800">Target Snapshot ID: </span>
            {rightData.snapshotId ? (
              <span className="text-gray-800">{rightData.snapshotId}</span>
            ) : (
              <span className="text-gray-400 italic">Not found</span>
            )}
          </div>
        )}

        {/* Dataset Information Section */}
        <div className="space-y-4">
          {/* PDS Dataset Paths */}
          <div className="border rounded-lg overflow-hidden bg-white">
            <div className="bg-blue-100 p-3 font-medium text-blue-800">
              PDS Dataset Paths
            </div>
            <div className="p-4">
              {viewMode === 'split' && leftData.pdsDatasetPaths.join('\n') !== rightData.pdsDatasetPaths.join('\n') && (
                <div className="w-full max-w-xl mx-auto mb-4 bg-yellow-100 p-3 text-yellow-800 font-semibold rounded-lg text-center">
                  PDS Dataset Paths differ!
                </div>
              )}
              
              {viewMode === 'source-only' && (
                <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-md overflow-auto text-gray-800 font-mono">
                  {leftData.pdsDatasetPaths.join('\n')}
                </pre>
              )}
              
              {viewMode === 'target-only' && (
                <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-md overflow-auto text-gray-800 font-mono">
                  {rightData.pdsDatasetPaths.join('\n')}
                </pre>
              )}
              
              {viewMode === 'split' && (
                <ReactDiffViewer
                  oldValue={leftData.pdsDatasetPaths.join('\n')}
                  newValue={rightData.pdsDatasetPaths.join('\n')}
                  splitView={true}
                  useDarkTheme={false}
                  showDiffOnly={false}
                  disableWordDiff={!showWordDiff}
                  leftTitle="Source"
                  rightTitle="Target"
                  styles={customStyles}
                />
              )}
            </div>
          </div>

          {/* VDS Dataset Paths */}
          <div className="border rounded-lg overflow-hidden bg-white">
            <div className="bg-blue-100 p-3 font-medium text-blue-800">
              VDS Dataset Paths
            </div>
            <div className="p-4">
              {viewMode === 'split' && leftData.vdsDatasetPaths.join('\n') !== rightData.vdsDatasetPaths.join('\n') && (
                <div className="w-full max-w-xl mx-auto mb-4 bg-yellow-100 p-3 text-yellow-800 font-semibold rounded-lg text-center">
                  VDS Dataset Paths differ!
                </div>
              )}
              
              {viewMode === 'source-only' && (
                <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-md overflow-auto text-gray-800 font-mono">
                  {leftData.vdsDatasetPaths.join('\n')}
                </pre>
              )}
              
              {viewMode === 'target-only' && (
                <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-md overflow-auto text-gray-800 font-mono">
                  {rightData.vdsDatasetPaths.join('\n')}
                </pre>
              )}
              
              {viewMode === 'split' && (
                <ReactDiffViewer
                  oldValue={leftData.vdsDatasetPaths.join('\n')}
                  newValue={rightData.vdsDatasetPaths.join('\n')}
                  splitView={true}
                  useDarkTheme={false}
                  showDiffOnly={false}
                  disableWordDiff={!showWordDiff}
                  leftTitle="Source"
                  rightTitle="Target"
                  styles={customStyles}
                />
              )}
            </div>
          </div>
        </div>

        {/* Plan Operators Section */}
        <div>
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
        </div>
      </div>
    );
  }

  return (
    <div>
      {renderViewModeToggle()}
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
    </div>
  );
};

export default DiffViewer;
