import React from 'react';
import QueryPerformanceAnalysis from '@/components/QueryPerformanceAnalysis';
import { ViewMode } from './ViewModeToggle';
import { ProfileData } from '@/utils/jqUtils';

interface PerformanceAnalysisSectionProps {
  leftData: ProfileData;
  rightData: ProfileData;
  viewMode: ViewMode;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
}

const PerformanceAnalysisSection: React.FC<PerformanceAnalysisSectionProps> = ({ 
  leftData, 
  rightData, 
  viewMode,
  isCollapsed,
  onToggleCollapsed
}) => {
  if (!leftData.performanceMetrics && !rightData.performanceMetrics) {
    return null;
  }

  return (
    <div className="space-y-4">
      {viewMode === 'split' && leftData.performanceMetrics && rightData.performanceMetrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <QueryPerformanceAnalysis 
            performanceMetrics={leftData.performanceMetrics} 
            title="Source Query Performance Analysis"
            isCollapsed={isCollapsed}
            onToggleCollapsed={onToggleCollapsed}
          />
          <QueryPerformanceAnalysis 
            performanceMetrics={rightData.performanceMetrics} 
            title="Target Query Performance Analysis"
            isCollapsed={isCollapsed}
            onToggleCollapsed={onToggleCollapsed}
          />
        </div>
      )}
      
      {viewMode === 'source-only' && leftData.performanceMetrics && (
        <QueryPerformanceAnalysis 
          performanceMetrics={leftData.performanceMetrics} 
          title="Source Query Performance Analysis"
          isCollapsed={isCollapsed}
          onToggleCollapsed={onToggleCollapsed}
        />
      )}
      
      {viewMode === 'target-only' && rightData.performanceMetrics && (
        <QueryPerformanceAnalysis 
          performanceMetrics={rightData.performanceMetrics} 
          title="Target Query Performance Analysis"
          isCollapsed={isCollapsed}
          onToggleCollapsed={onToggleCollapsed}
        />
      )}
      
      {viewMode === 'split' && leftData.performanceMetrics && !rightData.performanceMetrics && (
        <QueryPerformanceAnalysis 
          performanceMetrics={leftData.performanceMetrics} 
          title="Source Query Performance Analysis"
          isCollapsed={isCollapsed}
          onToggleCollapsed={onToggleCollapsed}
        />
      )}
      
      {viewMode === 'split' && !leftData.performanceMetrics && rightData.performanceMetrics && (
        <QueryPerformanceAnalysis 
          performanceMetrics={rightData.performanceMetrics} 
          title="Target Query Performance Analysis"
          isCollapsed={isCollapsed}
          onToggleCollapsed={onToggleCollapsed}
        />
      )}
    </div>
  );
};

export default PerformanceAnalysisSection;