"use client";

import React, { useState } from 'react';
import QueryPlanGraph from './QueryPlanGraph';
import QueryTimeline from './QueryTimeline';
import ResourceUtilizationCharts from './ResourceUtilizationCharts';
import FlameGraph from './FlameGraph';
import { ProfileData } from '@/utils/jqUtils';
import { ViewMode } from '../diff/ViewModeToggle';

interface VisualizationContainerProps {
  leftData: ProfileData | null;
  rightData: ProfileData | null;
  viewMode: ViewMode;
}

type VisualizationType = 'queryPlan' | 'timeline' | 'resources' | 'flameGraph';

const VisualizationContainer: React.FC<VisualizationContainerProps> = ({
  leftData,
  rightData,
  viewMode
}) => {
  const [selectedVisualization, setSelectedVisualization] = useState<VisualizationType>('queryPlan');
  const [flameGraphSide, setFlameGraphSide] = useState<'source' | 'target'>('source');

  const visualizations = [
    {
      id: 'queryPlan' as VisualizationType,
      name: 'Query Plan Graph',
      icon: '🌳',
      description: 'Interactive visualization of query execution plan with collapsible nodes'
    },
    {
      id: 'timeline' as VisualizationType,
      name: 'Execution Timeline',
      icon: '⏱️',
      description: 'Timeline showing query phase overlaps and execution sequence'
    },
    {
      id: 'resources' as VisualizationType,
      name: 'Resource Utilization',
      icon: '📈',
      description: 'Charts showing CPU, memory, and I/O utilization over time'
    },
    {
      id: 'flameGraph' as VisualizationType,
      name: 'Performance Flame Graph',
      icon: '🔥',
      description: 'Flame graph for identifying performance bottlenecks'
    }
  ];

  const renderVisualization = () => {
    // Fallback data display for debugging
    const renderDataDebug = () => (
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-bold mb-2">Available Data Structure:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {leftData && (
            <div className="bg-blue-50 p-3 rounded">
              <h4 className="font-semibold text-blue-800">Left Data:</h4>
              <ul className="text-blue-700 mt-2 space-y-1">
                <li>• Query: {leftData.query ? '✅' : '❌'}</li>
                <li>• Plan: {leftData.plan ? '✅' : '❌'}</li>
                <li>• Performance Metrics: {leftData.performanceMetrics ? '✅' : '❌'}</li>
                <li>• Query Phases: {leftData.queryPhaseValidation?.phases?.length || 0} phases</li>
                <li>• Top Operators: {leftData.performanceMetrics?.topOperators?.length || 0} operators</li>
              </ul>
            </div>
          )}
          {rightData && (
            <div className="bg-green-50 p-3 rounded">
              <h4 className="font-semibold text-green-800">Right Data:</h4>
              <ul className="text-green-700 mt-2 space-y-1">
                <li>• Query: {rightData.query ? '✅' : '❌'}</li>
                <li>• Plan: {rightData.plan ? '✅' : '❌'}</li>
                <li>• Performance Metrics: {rightData.performanceMetrics ? '✅' : '❌'}</li>
                <li>• Query Phases: {rightData.queryPhaseValidation?.phases?.length || 0} phases</li>
                <li>• Top Operators: {rightData.performanceMetrics?.topOperators?.length || 0} operators</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    );

    switch (selectedVisualization) {
      case 'queryPlan':
        try {
          return (
            <div>
              {renderDataDebug()}
              <QueryPlanGraph
                leftData={leftData}
                rightData={rightData}
                viewMode={viewMode}
              />
            </div>
          );
        } catch (error) {
          return (
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h3 className="text-red-800 font-bold">Query Plan Graph Error:</h3>
              <p className="text-red-700">{error instanceof Error ? error.message : 'Unknown error'}</p>
              {renderDataDebug()}
            </div>
          );
        }
      case 'timeline':
        try {
          return (
            <div>
              {renderDataDebug()}
              <QueryTimeline
                leftData={leftData}
                rightData={rightData}
                viewMode={viewMode}
              />
            </div>
          );
        } catch (error) {
          return (
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h3 className="text-red-800 font-bold">Timeline Error:</h3>
              <p className="text-red-700">{error instanceof Error ? error.message : 'Unknown error'}</p>
              {renderDataDebug()}
            </div>
          );
        }
      case 'resources':
        try {
          return (
            <div>
              {renderDataDebug()}
              <ResourceUtilizationCharts
                leftData={leftData}
                rightData={rightData}
                viewMode={viewMode}
              />
            </div>
          );
        } catch (error) {
          return (
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h3 className="text-red-800 font-bold">Resource Charts Error:</h3>
              <p className="text-red-700">{error instanceof Error ? error.message : 'Unknown error'}</p>
              {renderDataDebug()}
            </div>
          );
        }
      case 'flameGraph':
        try {
          return (
            <div>
              {renderDataDebug()}
              <FlameGraph
                leftData={leftData}
                rightData={rightData}
                viewMode={viewMode}
                selectedSide={flameGraphSide}
              />
            </div>
          );
        } catch (error) {
          return (
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h3 className="text-red-800 font-bold">Flame Graph Error:</h3>
              <p className="text-red-700">{error instanceof Error ? error.message : 'Unknown error'}</p>
              {renderDataDebug()}
            </div>
          );
        }
      default:
        return renderDataDebug();
    }
  };

  // Debug logging
  console.log('VisualizationContainer rendered with:', { 
    hasLeftData: !!leftData, 
    hasRightData: !!rightData, 
    viewMode,
    selectedVisualization 
  });

  return (
    <div className="space-y-6">
      {/* Debug Info */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-bold text-yellow-800">Debug Info:</h3>
        <p className="text-yellow-700">Left Data: {leftData ? '✅ Available' : '❌ Missing'}</p>
        <p className="text-yellow-700">Right Data: {rightData ? '✅ Available' : '❌ Missing'}</p>
        <p className="text-yellow-700">View Mode: {viewMode}</p>
        <p className="text-yellow-700">Selected: {selectedVisualization}</p>
      </div>

      {/* Visualization Selector */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Advanced Visualizations</h2>
          {selectedVisualization === 'flameGraph' && viewMode === 'split' && (
            <div className="flex gap-2">
              <button
                onClick={() => setFlameGraphSide('source')}
                className={`px-3 py-1 rounded text-sm ${
                  flameGraphSide === 'source' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Source
              </button>
              <button
                onClick={() => setFlameGraphSide('target')}
                className={`px-3 py-1 rounded text-sm ${
                  flameGraphSide === 'target' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Target
              </button>
            </div>
          )}
        </div>
        
        {/* Visualization Tabs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {visualizations.map((viz) => (
            <button
              key={viz.id}
              onClick={() => setSelectedVisualization(viz.id)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                selectedVisualization === viz.id
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{viz.icon}</span>
                <span className={`font-semibold ${
                  selectedVisualization === viz.id ? 'text-blue-800' : 'text-gray-800'
                }`}>
                  {viz.name}
                </span>
              </div>
              <p className={`text-sm ${
                selectedVisualization === viz.id ? 'text-blue-600' : 'text-gray-600'
              }`}>
                {viz.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Visualization Content */}
      <div className="min-h-[400px]">
        {renderVisualization()}
      </div>

      {/* Tips and Information */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
          💡 Visualization Tips
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
          <div>
            <div className="font-medium mb-1">Query Plan Graph:</div>
            <ul className="space-y-1 text-blue-600">
              <li>• Click + to expand/collapse operator details</li>
              <li>• Drag to explore the graph structure</li>
              <li>• Colors indicate different operator types</li>
            </ul>
          </div>
          <div>
            <div className="font-medium mb-1">Timeline & Resources:</div>
            <ul className="space-y-1 text-blue-600">
              <li>• Scroll to zoom in/out on timeline</li>
              <li>• Hover for detailed metrics</li>
              <li>• Red areas indicate performance bottlenecks</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualizationContainer;