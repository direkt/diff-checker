import React, { ReactElement, useMemo } from 'react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import sql from 'react-syntax-highlighter/dist/esm/languages/hljs/sql';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { ProfileData } from '@/utils/jqUtils';
import DataScanComparison from './DataScanComparison';
import { PhaseGraph } from './PhaseGraph';

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

  // Parse plan into phases - moved before any conditional returns
  const planPhases = useMemo(() => {
    if (!leftData?.plan || !rightData?.plan || selectedSection !== 'plan') {
      return null;
    }

    const leftPlan = leftData.plan;
    const rightPlan = rightData.plan;

    // Regex to match phase header and type, e.g. "00-05 Filter(...)"
    const phaseHeaderRegex = /^(\d{2}-\d{2})\s+(\w+)/;

    // Helper to parse phases into a map of type -> { phaseNumber, content }
    function parsePhases(plan: string) {
      const lines = plan.split('\n');
      const phases: Record<string, { phaseNumber: string; content: string[] }> = {};
      let currentType = '';
      let currentNumber = '';
      lines.forEach(line => {
        const match = line.match(phaseHeaderRegex);
        if (match) {
          currentNumber = match[1];
          currentType = match[2];
          if (!phases[currentType]) {
            phases[currentType] = { phaseNumber: currentNumber, content: [] };
          }
        }
        if (currentType) {
          phases[currentType].content.push(line);
        }
      });
      return phases;
    }

    const leftPhases = parsePhases(leftPlan);
    const rightPhases = parsePhases(rightPlan);

    // Get all unique phase types
    const allTypes = Array.from(new Set([
      ...Object.keys(leftPhases),
      ...Object.keys(rightPhases)
    ]));

    // Helper to extract a sortable number from phase number string (e.g., '00-05' -> 5)
    function extractPhaseNumber(phaseNumber: string): number {
      if (!phaseNumber) return Number.POSITIVE_INFINITY;
      const parts = phaseNumber.split('-');
      // Use the second part if available, otherwise the first
      return parts.length === 2 ? parseInt(parts[1], 10) : parseInt(parts[0], 10);
    }

    // Build array of { type, phaseNumber } for sorting
    const typeWithNumbers = allTypes.map(type => {
      const leftNum = leftPhases[type]?.phaseNumber;
      const rightNum = rightPhases[type]?.phaseNumber;
      // Prefer left, fallback to right
      const phaseNumber = leftNum || rightNum || '';
      return { type, phaseNumber };
    });

    // Sort by extracted phase number (smallest to largest)
    typeWithNumbers.sort((a, b) => extractPhaseNumber(a.phaseNumber) - extractPhaseNumber(b.phaseNumber));

    // Build aligned phases by sorted type
    const phases = typeWithNumbers.map(({ type }) => ({
      phaseType: type,
      leftPhaseNumber: leftPhases[type]?.phaseNumber || '',
      rightPhaseNumber: rightPhases[type]?.phaseNumber || '',
      leftContent: leftPhases[type]?.content.join('\n') || '',
      rightContent: rightPhases[type]?.content.join('\n') || ''
    }));

    return phases;
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
      case 'planPhases':
        return data.planPhases || '';
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
  if (selectedSection !== 'plan' || !planPhases) {
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

  // For plan section, render each phase in its own box
  if (selectedSection === 'plan' && leftData?.jsonPlan && rightData?.jsonPlan) {
    return (
      <div className="flex flex-col gap-8">
        <div className="flex flex-row gap-8">
          <div className="flex-1">
            <PhaseGraph planJson={leftData.jsonPlan} title="Source Plan Graph" />
          </div>
          <div className="flex-1">
            <PhaseGraph planJson={rightData.jsonPlan} title="Target Plan Graph" />
          </div>
        </div>
        <div>
          <div className="space-y-6">
            <div className="px-4 py-2 text-sm text-gray-700 font-medium">
              {planPhases.length} phase type{planPhases.length !== 1 ? 's' : ''} found
            </div>
            {planPhases.map((phase) => (
              <div key={phase.phaseType} className="border rounded-lg overflow-hidden bg-white">
                <div className="bg-blue-100 p-3 font-medium text-blue-800">
                  Phase Type: {phase.phaseType}
                  {phase.leftPhaseNumber && (
                    <span className="ml-4 text-xs text-gray-500">Source phase: {phase.leftPhaseNumber}</span>
                  )}
                  {phase.rightPhaseNumber && (
                    <span className="ml-4 text-xs text-gray-500">Target phase: {phase.rightPhaseNumber}</span>
                  )}
                </div>
                <div className="p-4">
                  <ReactDiffViewer
                    oldValue={phase.leftContent}
                    newValue={phase.rightContent}
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
        {planPhases.length} phase type{planPhases.length !== 1 ? 's' : ''} found
      </div>
      {planPhases.map((phase) => (
        <div key={phase.phaseType} className="border rounded-lg overflow-hidden bg-white">
          <div className="bg-blue-100 p-3 font-medium text-blue-800">
            Phase Type: {phase.phaseType}
            {phase.leftPhaseNumber && (
              <span className="ml-4 text-xs text-gray-500">Source phase: {phase.leftPhaseNumber}</span>
            )}
            {phase.rightPhaseNumber && (
              <span className="ml-4 text-xs text-gray-500">Target phase: {phase.rightPhaseNumber}</span>
            )}
          </div>
          <div className="p-4">
            <ReactDiffViewer
              oldValue={phase.leftContent}
              newValue={phase.rightContent}
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
