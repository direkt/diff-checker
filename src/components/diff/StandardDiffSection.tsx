import React, { ReactElement } from 'react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import { ViewMode } from './ViewModeToggle';
import { ProfileData } from '@/utils/jqUtils';
import { sanitizeSqlContent, sanitizeString, sanitizeQueryPlan, isSuspiciousContent } from '@/utils/sanitization';
import SafeSyntaxHighlighter from '@/components/SafeSyntaxHighlighter';

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
    let content = '';
    
    switch (section) {
      case 'plan':
        content = data.plan || '';
        return sanitizeQueryPlan(content);
      case 'pdsDatasetPaths':
        content = data.pdsDatasetPaths.join('\n') || '';
        return sanitizeString(content);
      case 'vdsDatasetPaths':
        content = data.vdsDatasetPaths.join('\n') || '';
        return sanitizeString(content);
      case 'vdsDetails':
        content = data.vdsDetails.map(vds => `-- VDS path: ${sanitizeString(vds.path)}\n${sanitizeSqlContent(vds.sql)}`).join('\n\n') || '';
        return content;
      case 'planOperators':
        content = data.planOperators || '';
        // Plan operators are pre-processed and safe, only apply minimal sanitization
        return content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                     .replace(/javascript:/gi, '')
                     .replace(/vbscript:/gi, '');
      case 'reflections':
        const chosenReflections = data.reflections?.chosen?.map(r => `[Chosen] ${sanitizeString(r)}`) || [];
        const consideredReflections = data.reflections?.considered?.map(r => `[Considered] ${sanitizeString(r)}`) || [];
        
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
                // Additional security check before rendering
                if (isSuspiciousContent(str)) {
                  console.warn('Suspicious content detected, rendering as plain text');
                  return <span style={{color: 'red'}}>Content blocked for security reasons</span>;
                }
                
                return (
                  <SafeSyntaxHighlighter 
                    language="sql" 
                    customStyle={{fontSize: '1rem'}}
                  >
                    {str}
                  </SafeSyntaxHighlighter>
                );
              }
              // Sanitize all other content too
              const sanitizedStr = sanitizeString(str);
              return <span>{sanitizedStr}</span>;
            }}
          />
        </div>
      )}
    </div>
  );
};

export default StandardDiffSection;