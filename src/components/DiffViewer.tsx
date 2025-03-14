import React, { ReactElement, useMemo } from 'react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import sql from 'react-syntax-highlighter/dist/esm/languages/hljs/sql';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { ProfileData } from '@/utils/jqUtils';

SyntaxHighlighter.registerLanguage('sql', sql);

interface DiffViewerProps {
  leftData: ProfileData | null;
  rightData: ProfileData | null;
  selectedSection: string;
}

interface PlanPhase {
  phaseNumber: string;
  leftContent: string;
  rightContent: string;
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

    // Regular expression to match phase headers (e.g., "00-00", "01-02", etc.)
    const phaseRegex = /^(\d{2}-\d{2})\s/;
    
    // Split plans into lines
    const leftLines = leftPlan.split('\n');
    const rightLines = rightPlan.split('\n');
    
    // Group lines by phase
    const leftPhases: Record<string, string[]> = {};
    const rightPhases: Record<string, string[]> = {};
    
    let currentLeftPhase = '';
    let currentRightPhase = '';
    
    // Process left plan
    leftLines.forEach(line => {
      const match = line.match(phaseRegex);
      if (match) {
        currentLeftPhase = match[1];
        if (!leftPhases[currentLeftPhase]) {
          leftPhases[currentLeftPhase] = [];
        }
      }
      
      if (currentLeftPhase) {
        leftPhases[currentLeftPhase].push(line);
      }
    });
    
    // Process right plan
    rightLines.forEach(line => {
      const match = line.match(phaseRegex);
      if (match) {
        currentRightPhase = match[1];
        if (!rightPhases[currentRightPhase]) {
          rightPhases[currentRightPhase] = [];
        }
      }
      
      if (currentRightPhase) {
        rightPhases[currentRightPhase].push(line);
      }
    });
    
    // Combine phases from both sides
    const allPhaseNumbers = new Set([
      ...Object.keys(leftPhases),
      ...Object.keys(rightPhases)
    ]);
    
    // Sort phase numbers
    const sortedPhaseNumbers = Array.from(allPhaseNumbers).sort();
    
    // Create combined phase objects
    const phases: PlanPhase[] = sortedPhaseNumbers.map(phaseNumber => ({
      phaseNumber,
      leftContent: leftPhases[phaseNumber]?.join('\n') || '',
      rightContent: rightPhases[phaseNumber]?.join('\n') || ''
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
      default:
        return '';
    }
  };

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
          disableWordDiff={false}
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
  return (
    <div className="space-y-6">
      {planPhases.map((phase) => (
        <div key={phase.phaseNumber} className="border rounded-lg overflow-hidden bg-white">
          <div className="bg-blue-100 p-3 font-medium text-blue-800">
            Phase {phase.phaseNumber}
          </div>
          <div className="p-4">
            <ReactDiffViewer
              oldValue={phase.leftContent}
              newValue={phase.rightContent}
              splitView={true}
              useDarkTheme={false}
              showDiffOnly={false}
              disableWordDiff={false}
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
