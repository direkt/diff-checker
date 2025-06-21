import React, { ReactElement } from 'react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { ViewMode } from './ViewModeToggle';
import { ProfileData } from '@/utils/jqUtils';

interface StandardDiffSectionProps {
  leftData: ProfileData;
  rightData: ProfileData;
  selectedSection: string;
  viewMode: ViewMode;
  showWordDiff: boolean;
  customStyles: Record<string, unknown>;
}

const StandardDiffSection: React.FC<StandardDiffSectionProps> = ({ 
  leftData, 
  rightData, 
  selectedSection,
  viewMode, 
  showWordDiff,
  customStyles 
}) => {
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
      default:
        return '';
    }
  };

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

  const leftContent = getContentForSection(leftData, selectedSection);
  const rightContent = getContentForSection(rightData, selectedSection);

  return (
    <div>
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
};

export default StandardDiffSection;