import React, { useState, useCallback } from 'react';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import sql from 'react-syntax-highlighter/dist/esm/languages/hljs/sql';
import { ProfileData } from '@/utils/jqUtils';
import DataScanComparison from './DataScanComparison';
import ViewModeToggle, { ViewMode } from './diff/ViewModeToggle';
import SnapshotIdSection from './diff/SnapshotIdSection';
import DatasetPathsSection from './diff/DatasetPathsSection';
import PlanOperatorSection from './diff/PlanOperatorSection';
import PerformanceAnalysisSection from './diff/PerformanceAnalysisSection';
import StandardDiffSection from './diff/StandardDiffSection';

SyntaxHighlighter.registerLanguage('sql', sql);

interface DiffViewerProps {
  leftData: ProfileData | null;
  rightData: ProfileData | null;
  selectedSection: string;
  showWordDiff?: boolean;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ 
  leftData, 
  rightData, 
  selectedSection, 
  showWordDiff = true 
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [performanceAnalysisCollapsed, setPerformanceAnalysisCollapsed] = useState(true);

  // Shared toggle function for both performance analysis sections
  const togglePerformanceAnalysis = useCallback(() => {
    setPerformanceAnalysisCollapsed(prev => !prev);
  }, []);

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

  if (!leftData || !rightData) {
    return (
      <div className="p-4 text-center text-gray-500 text-base">
        Please upload files on both sides to view differences
      </div>
    );
  }

  // Special case for data scans
  if (selectedSection === 'dataScans') {
    return (
      <div className="text-base">
        <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        <DataScanComparison leftData={leftData} rightData={rightData} viewMode={viewMode} />
      </div>
    );
  }

  // Special case for performance analysis
  if (selectedSection === 'performanceAnalysis') {
    return (
      <div className="text-base">
        <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        {(leftData.performanceMetrics || rightData.performanceMetrics) ? (
          <PerformanceAnalysisSection
            leftData={leftData}
            rightData={rightData}
            viewMode={viewMode}
            isCollapsed={performanceAnalysisCollapsed}
            onToggleCollapsed={togglePerformanceAnalysis}
          />
        ) : (
          <div className="p-4 text-center text-gray-500">
            No performance analysis data available. Performance metrics are extracted from the query profile data.
          </div>
        )}
      </div>
    );
  }

  // Special case for plan section with JSON plan data
  if (selectedSection === 'plan' && leftData?.jsonPlan && rightData?.jsonPlan) {
    return (
      <div className="flex flex-col gap-8 text-base">
        <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        
        <SnapshotIdSection 
          leftData={leftData} 
          rightData={rightData} 
          viewMode={viewMode} 
        />

        <DatasetPathsSection
          leftData={leftData}
          rightData={rightData}
          viewMode={viewMode}
          showWordDiff={showWordDiff}
          customStyles={customStyles}
        />

        <PerformanceAnalysisSection
          leftData={leftData}
          rightData={rightData}
          viewMode={viewMode}
          isCollapsed={performanceAnalysisCollapsed}
          onToggleCollapsed={togglePerformanceAnalysis}
        />

        <div>
          <PlanOperatorSection
            leftData={leftData}
            rightData={rightData}
            viewMode={viewMode}
            showWordDiff={showWordDiff}
            customStyles={customStyles}
          />
        </div>
      </div>
    );
  }

  // For all other sections, use the standard diff viewer
  return (
    <div>
      <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      <StandardDiffSection
        leftData={leftData}
        rightData={rightData}
        selectedSection={selectedSection}
        viewMode={viewMode}
        showWordDiff={showWordDiff}
        customStyles={customStyles}
      />
    </div>
  );
};

export default DiffViewer;