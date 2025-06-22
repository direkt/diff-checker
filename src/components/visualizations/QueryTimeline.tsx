"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import { Timeline, TimelineOptions, DataSet } from 'vis-timeline/standalone';
import 'vis-timeline/dist/vis-timeline-graph2d.min.css';
import { ProfileData } from '@/utils/jqUtils';

interface QueryTimelineProps {
  leftData: ProfileData | null;
  rightData: ProfileData | null;
  viewMode: 'split' | 'source' | 'target';
}

interface TimelinePhase {
  id: string;
  content: string;
  start: number;
  end: number;
  group: string;
  type: 'range';
  className: string;
  title: string;
  style?: string;
}

const QueryTimeline: React.FC<QueryTimelineProps> = ({
  leftData,
  rightData,
  viewMode
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineInstance = useRef<Timeline | null>(null);

  // Extract phase data from profile
  const extractPhaseData = (profileData: ProfileData | null, side: 'source' | 'target'): TimelinePhase[] => {
    console.log(`QueryTimeline: Extracting ${side} data:`, {
      hasQueryPhaseValidation: !!profileData?.queryPhaseValidation,
      phaseCount: profileData?.queryPhaseValidation?.phases?.length || 0,
      hasPerformanceMetrics: !!profileData?.performanceMetrics,
      totalQueryTime: profileData?.performanceMetrics?.totalQueryTimeMs,
      planningTime: profileData?.performanceMetrics?.planningTimeMs,
      executionTime: profileData?.performanceMetrics?.executionTimeMs
    });
    
    const phases: TimelinePhase[] = [];
    
    // Try multiple data sources for phase information
    let phaseSource = null;
    
    // First try queryPhaseValidation.phases
    if (profileData?.queryPhaseValidation?.phases?.length) {
      phaseSource = profileData.queryPhaseValidation.phases;
      console.log(`${side} phase sample:`, phaseSource[0]);
    }
    // Fallback to performance metrics if available
    else if (profileData?.performanceMetrics) {
      // Create synthetic phases from performance data
      const metrics = profileData.performanceMetrics;
      phaseSource = [
        {
          phaseName: 'Planning',
          startTime: new Date(Date.now() - metrics.totalQueryTimeMs).toISOString(),
          endTime: new Date(Date.now() - metrics.totalQueryTimeMs + metrics.planningTimeMs).toISOString(),
          isValid: true
        },
        {
          phaseName: 'Execution', 
          startTime: new Date(Date.now() - metrics.executionTimeMs).toISOString(),
          endTime: new Date().toISOString(),
          isValid: true
        }
      ];
    }
    
    if (!phaseSource || phaseSource.length === 0) return [];
    
    phaseSource.forEach((phase: any, index: number) => {
      if (phase.startTime && phase.endTime) {
        const startTime = new Date(phase.startTime).getTime();
        const endTime = new Date(phase.endTime).getTime();
        const duration = endTime - startTime;
        
        // Normalize to start from 0
        const normalizedStart = index === 0 ? 0 : phases[phases.length - 1]?.end || 0;
        const normalizedEnd = normalizedStart + duration;
        
        // Determine phase color based on type and performance
        let className = 'timeline-phase-normal';
        let style = '';
        
        if (duration > 30000) { // > 30 seconds
          className = 'timeline-phase-slow';
          style = 'background-color: #EF4444; color: white;'; // Red for slow phases
        } else if (duration > 10000) { // > 10 seconds
          className = 'timeline-phase-moderate';
          style = 'background-color: #F59E0B; color: white;'; // Orange for moderate phases
        } else {
          style = side === 'source' 
            ? 'background-color: #3B82F6; color: white;' // Blue for source
            : 'background-color: #10B981; color: white;'; // Green for target
        }
        
        phases.push({
          id: `${side}-phase-${index}`,
          content: `${phase.phaseName} (${(duration / 1000).toFixed(2)}s)`,
          start: normalizedStart,
          end: normalizedEnd,
          group: side,
          type: 'range',
          className,
          style,
          title: `
            Phase: ${phase.phaseName}
            Duration: ${(duration / 1000).toFixed(2)}s
            Start: ${new Date(phase.startTime).toLocaleTimeString()}
            End: ${new Date(phase.endTime).toLocaleTimeString()}
            ${phase.recordsProcessed ? `Records: ${phase.recordsProcessed.toLocaleString()}` : ''}
            Status: ${phase.isValid !== undefined ? (phase.isValid ? 'Valid' : 'Invalid') : 'N/A'}
          `.trim()
        });
      }
    });

    return phases;
  };

  // Extract operator timeline data
  const extractOperatorData = (profileData: ProfileData | null, side: 'source' | 'target'): TimelinePhase[] => {
    if (!profileData?.performanceMetrics?.topOperators) return [];

    const operators: TimelinePhase[] = [];
    let cumulativeTime = 0;

    // Sort operators by total time descending
    const sortedOperators = [...profileData.performanceMetrics.topOperators]
      .sort((a, b) => b.totalMs - a.totalMs)
      .slice(0, 10); // Show top 10 operators

    sortedOperators.forEach((operator, index) => {
      const start = cumulativeTime;
      const end = cumulativeTime + operator.totalMs;
      cumulativeTime = end;

      let style = '';
      if (operator.totalMs > 5000) { // > 5 seconds
        style = 'background-color: #DC2626; color: white;'; // Dark red for slow operators
      } else if (operator.totalMs > 1000) { // > 1 second
        style = 'background-color: #F59E0B; color: white;'; // Orange
      } else {
        style = side === 'source' 
          ? 'background-color: #1D4ED8; color: white;' // Darker blue for source
          : 'background-color: #059669; color: white;'; // Darker green for target
      }

      operators.push({
        id: `${side}-operator-${index}`,
        content: `${operator.operatorType}: ${operator.operatorName} (${operator.totalMs}ms)`,
        start,
        end,
        group: `${side}-operators`,
        type: 'range',
        className: 'timeline-operator',
        style,
        title: `
          Operator: ${operator.operatorType}
          Name: ${operator.operatorName}
          Total Time: ${operator.totalMs}ms
          Process Time: ${operator.processMs}ms
          Wait Time: ${operator.waitMs}ms
          Setup Time: ${operator.setupMs}ms
          Input Records: ${operator.inputRecords?.toLocaleString() || 'N/A'}
          Output Records: ${operator.outputRecords?.toLocaleString() || 'N/A'}
          Fragment: ${operator.fragmentId}
        `.trim()
      });
    });

    return operators;
  };

  // Prepare timeline data
  const timelineData = useMemo(() => {
    const items: TimelinePhase[] = [];
    const groups: { id: string; content: string; order?: number }[] = [];

    if (viewMode === 'split' || viewMode === 'source') {
      if (leftData) {
        // Add phase data
        items.push(...extractPhaseData(leftData, 'source'));
        groups.push({ id: 'source', content: 'Source Query Phases', order: 1 });
        
        // Add operator data
        items.push(...extractOperatorData(leftData, 'source'));
        groups.push({ id: 'source-operators', content: 'Source Top Operators', order: 2 });
      }
    }

    if (viewMode === 'split' || viewMode === 'target') {
      if (rightData) {
        // Add phase data
        items.push(...extractPhaseData(rightData, 'target'));
        groups.push({ id: 'target', content: 'Target Query Phases', order: 3 });
        
        // Add operator data
        items.push(...extractOperatorData(rightData, 'target'));
        groups.push({ id: 'target-operators', content: 'Target Top Operators', order: 4 });
      }
    }

    return { items, groups };
  }, [leftData, rightData, viewMode]);

  // Initialize timeline
  useEffect(() => {
    if (!timelineRef.current || timelineData.items.length === 0) return;

    // Destroy existing instance
    if (timelineInstance.current) {
      timelineInstance.current.destroy();
    }

    // Create datasets
    const items = new DataSet(timelineData.items);
    const groups = new DataSet(timelineData.groups);

    // Timeline options
    const options: TimelineOptions = {
      height: '400px',
      stack: true,
      showCurrentTime: false,
      zoomable: true,
      moveable: true,
      orientation: 'top',
      margin: {
        item: 10,
        axis: 5
      },
      format: {
        minorLabels: {
          millisecond: 'SSS',
          second: 's',
          minute: 'mm:ss',
          hour: 'HH:mm'
        }
      },
      tooltip: {
        followMouse: true,
        overflowMethod: 'cap'
      }
    };

    // Create timeline
    timelineInstance.current = new Timeline(timelineRef.current, items, groups, options);

    // Cleanup
    return () => {
      if (timelineInstance.current) {
        timelineInstance.current.destroy();
        timelineInstance.current = null;
      }
    };
  }, [timelineData]);

  // Simple HTML timeline fallback
  const renderSimpleTimeline = () => {
    return (
      <div className="space-y-4">
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Simple Timeline View</h3>
          
          {(viewMode === 'split' || viewMode === 'source') && leftData?.performanceMetrics && (
            <div className="mb-6">
              <h4 className="font-semibold text-blue-800 mb-3">Source Query Timeline</h4>
              <div className="relative bg-blue-50 rounded-lg p-4">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-500 text-white px-3 py-1 rounded text-sm">
                    Planning: {leftData.performanceMetrics.planningTimeMs}ms
                  </div>
                  <div className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
                    Execution: {leftData.performanceMetrics.executionTimeMs}ms
                  </div>
                  <div className="bg-blue-700 text-white px-3 py-1 rounded text-sm">
                    Total: {leftData.performanceMetrics.totalQueryTimeMs}ms
                  </div>
                </div>
                {leftData.queryPhaseValidation?.phases && (
                  <div className="mt-3 text-xs text-blue-700">
                    {leftData.queryPhaseValidation.phases.length} phases detected
                  </div>
                )}
              </div>
            </div>
          )}
          
          {(viewMode === 'split' || viewMode === 'target') && rightData?.performanceMetrics && (
            <div className="mb-6">
              <h4 className="font-semibold text-green-800 mb-3">Target Query Timeline</h4>
              <div className="relative bg-green-50 rounded-lg p-4">
                <div className="flex items-center space-x-4">
                  <div className="bg-green-500 text-white px-3 py-1 rounded text-sm">
                    Planning: {rightData.performanceMetrics.planningTimeMs}ms
                  </div>
                  <div className="bg-green-600 text-white px-3 py-1 rounded text-sm">
                    Execution: {rightData.performanceMetrics.executionTimeMs}ms
                  </div>
                  <div className="bg-green-700 text-white px-3 py-1 rounded text-sm">
                    Total: {rightData.performanceMetrics.totalQueryTimeMs}ms
                  </div>
                </div>
                {rightData.queryPhaseValidation?.phases && (
                  <div className="mt-3 text-xs text-green-700">
                    {rightData.queryPhaseValidation.phases.length} phases detected
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-800 mb-2">Timeline Debug Info:</h4>
            <div className="text-xs text-yellow-700 space-y-1">
              <div>Timeline items generated: {timelineData.items.length}</div>
              <div>Timeline groups: {timelineData.groups.length}</div>
              <div>Note: Advanced timeline visualization is being developed</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (timelineData.items.length === 0) {
    return renderSimpleTimeline();
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Query Execution Timeline</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>Source Query</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Target Query</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span>Moderate Performance (&gt;10s)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>Poor Performance (&gt;30s)</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Scroll to zoom • Drag to pan • Hover for details
        </p>
      </div>

      {/* Timeline Container */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div ref={timelineRef} className="timeline-container" />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(viewMode === 'split' || viewMode === 'source') && leftData?.performanceMetrics && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2">Source Query Summary</h4>
            <div className="space-y-1 text-sm text-blue-700">
              <div>Total Time: {(leftData.performanceMetrics.totalQueryTimeMs / 1000).toFixed(2)}s</div>
              <div>Planning: {(leftData.performanceMetrics.planningTimeMs / 1000).toFixed(2)}s</div>
              <div>Execution: {(leftData.performanceMetrics.executionTimeMs / 1000).toFixed(2)}s</div>
              <div>Phases: {leftData.queryPhaseValidation?.phases?.length || 0}</div>
            </div>
          </div>
        )}
        
        {(viewMode === 'split' || viewMode === 'target') && rightData?.performanceMetrics && (
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-800 mb-2">Target Query Summary</h4>
            <div className="space-y-1 text-sm text-green-700">
              <div>Total Time: {(rightData.performanceMetrics.totalQueryTimeMs / 1000).toFixed(2)}s</div>
              <div>Planning: {(rightData.performanceMetrics.planningTimeMs / 1000).toFixed(2)}s</div>
              <div>Execution: {(rightData.performanceMetrics.executionTimeMs / 1000).toFixed(2)}s</div>
              <div>Phases: {rightData.queryPhaseValidation?.phases?.length || 0}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QueryTimeline;