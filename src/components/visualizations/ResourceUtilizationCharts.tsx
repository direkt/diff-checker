"use client";

import React, { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  AreaChart,
  BarChart,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { ProfileData } from '@/utils/jqUtils';

interface ResourceUtilizationChartsProps {
  leftData: ProfileData | null;
  rightData: ProfileData | null;
  viewMode: 'split' | 'source' | 'target';
}

interface ResourceDataPoint {
  time: string;
  sourceMemory?: number;
  targetMemory?: number;
  sourceCPU?: number;
  targetCPU?: number;
  sourceIO?: number;
  targetIO?: number;
  sourceRecords?: number;
  targetRecords?: number;
}

interface OperatorResourceData {
  operatorName: string;
  operatorType: string;
  memoryMB: number;
  cpuMs: number;
  ioBytes: number;
  records: number;
  efficiency: number;
}

const ResourceUtilizationCharts: React.FC<ResourceUtilizationChartsProps> = ({
  leftData,
  rightData,
  viewMode
}) => {
  
  // Generate time-series data from performance metrics
  const timeSeriesData = useMemo((): ResourceDataPoint[] => {
    const data: ResourceDataPoint[] = [];
    
    // Create time points based on query phases
    const timePoints = new Set<string>();
    
    if (leftData?.queryPhaseValidation?.phases) {
      leftData.queryPhaseValidation.phases.forEach(phase => {
        if (phase.startTime) timePoints.add(phase.startTime);
        if (phase.endTime) timePoints.add(phase.endTime);
      });
    }
    
    if (rightData?.queryPhaseValidation?.phases) {
      rightData.queryPhaseValidation.phases.forEach(phase => {
        if (phase.startTime) timePoints.add(phase.startTime);
        if (phase.endTime) timePoints.add(phase.endTime);
      });
    }
    
    // If no phase data, create synthetic time points based on operator timings
    if (timePoints.size === 0) {
      const intervals = 10;
      for (let i = 0; i <= intervals; i++) {
        const timestamp = new Date(Date.now() + i * 1000).toISOString();
        timePoints.add(timestamp);
      }
    }
    
    const sortedTimePoints = Array.from(timePoints).sort();
    
    sortedTimePoints.forEach((timePoint, index) => {
      const time = new Date(timePoint).toLocaleTimeString();
      const point: ResourceDataPoint = { time };
      
      // Calculate resource utilization based on active operators at this time
      if (leftData?.performanceMetrics) {
        const totalMemoryMB = leftData.performanceMetrics.topOperators.reduce((sum, op) => {
          // Estimate memory usage based on input/output bytes
          const memoryEstimate = (op.inputBytes + op.outputBytes) / (1024 * 1024); // Convert to MB
          return sum + Math.min(memoryEstimate, 1000); // Cap at 1GB per operator
        }, 0);
        
        const totalCPUMs = leftData.performanceMetrics.topOperators.reduce((sum, op) => 
          sum + op.processMs, 0);
        
        const totalIOBytes = leftData.performanceMetrics.topOperators.reduce((sum, op) => 
          sum + op.inputBytes + op.outputBytes, 0);
        
        const totalRecords = leftData.performanceMetrics.topOperators.reduce((sum, op) => 
          sum + op.outputRecords, 0);
        
        // Simulate time-based distribution
        const progressFactor = index / Math.max(sortedTimePoints.length - 1, 1);
        const peakFactor = Math.sin(progressFactor * Math.PI); // Bell curve distribution
        
        point.sourceMemory = Math.round(totalMemoryMB * peakFactor);
        point.sourceCPU = Math.round(totalCPUMs * peakFactor / 100); // Scale down for visualization
        point.sourceIO = Math.round(totalIOBytes * peakFactor / (1024 * 1024)); // Convert to MB
        point.sourceRecords = Math.round(totalRecords * progressFactor);
      }
      
      if (rightData?.performanceMetrics) {
        const totalMemoryMB = rightData.performanceMetrics.topOperators.reduce((sum, op) => {
          const memoryEstimate = (op.inputBytes + op.outputBytes) / (1024 * 1024);
          return sum + Math.min(memoryEstimate, 1000);
        }, 0);
        
        const totalCPUMs = rightData.performanceMetrics.topOperators.reduce((sum, op) => 
          sum + op.processMs, 0);
        
        const totalIOBytes = rightData.performanceMetrics.topOperators.reduce((sum, op) => 
          sum + op.inputBytes + op.outputBytes, 0);
        
        const totalRecords = rightData.performanceMetrics.topOperators.reduce((sum, op) => 
          sum + op.outputRecords, 0);
        
        const progressFactor = index / Math.max(sortedTimePoints.length - 1, 1);
        const peakFactor = Math.sin(progressFactor * Math.PI);
        
        point.targetMemory = Math.round(totalMemoryMB * peakFactor);
        point.targetCPU = Math.round(totalCPUMs * peakFactor / 100);
        point.targetIO = Math.round(totalIOBytes * peakFactor / (1024 * 1024));
        point.targetRecords = Math.round(totalRecords * progressFactor);
      }
      
      data.push(point);
    });
    
    return data;
  }, [leftData, rightData]);

  // Generate operator resource consumption data
  const operatorResourceData = useMemo((): { source: OperatorResourceData[], target: OperatorResourceData[] } => {
    const processOperators = (profileData: ProfileData | null): OperatorResourceData[] => {
      if (!profileData?.performanceMetrics?.topOperators) return [];
      
      return profileData.performanceMetrics.topOperators.slice(0, 8).map(op => {
        const memoryMB = (op.inputBytes + op.outputBytes) / (1024 * 1024);
        const cpuMs = op.processMs + op.setupMs;
        const ioBytes = op.inputBytes + op.outputBytes;
        const records = op.outputRecords;
        
        // Calculate efficiency score (records per second per MB memory)
        const timeSeconds = Math.max(op.totalMs / 1000, 0.001);
        const memoryMBSafe = Math.max(memoryMB, 0.1);
        const efficiency = (records / timeSeconds) / memoryMBSafe;
        
        return {
          operatorName: op.operatorName.length > 20 ? 
            op.operatorName.substring(0, 20) + '...' : op.operatorName,
          operatorType: op.operatorType,
          memoryMB: Math.round(memoryMB),
          cpuMs: cpuMs,
          ioBytes: ioBytes,
          records: records,
          efficiency: Math.round(efficiency * 100) / 100
        };
      });
    };
    
    return {
      source: processOperators(leftData),
      target: processOperators(rightData)
    };
  }, [leftData, rightData]);

  // Generate pie chart data for resource distribution
  const resourceDistributionData = useMemo(() => {
    const processDistribution = (profileData: ProfileData | null, type: 'source' | 'target') => {
      if (!profileData?.performanceMetrics?.topOperators) return [];
      
      const totalTime = profileData.performanceMetrics.topOperators.reduce((sum, op) => 
        sum + op.totalMs, 0);
      
      return profileData.performanceMetrics.topOperators.slice(0, 6).map((op, index) => ({
        name: op.operatorType,
        value: op.totalMs,
        percentage: Math.round((op.totalMs / totalTime) * 100),
        color: type === 'source' ? 
          ['#3B82F6', '#1D4ED8', '#1E40AF', '#1E3A8A', '#172554', '#0F172A'][index] :
          ['#10B981', '#059669', '#047857', '#065F46', '#064E3B', '#022C22'][index]
      }));
    };
    
    return {
      source: processDistribution(leftData, 'source'),
      target: processDistribution(rightData, 'target')
    };
  }, [leftData, rightData]);

  if (!leftData?.performanceMetrics && !rightData?.performanceMetrics) {
    return (
      <div className="h-[600px] flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <div className="text-gray-400 text-4xl mb-4">📈</div>
          <p className="text-gray-600 text-lg">No performance metrics available</p>
          <p className="text-gray-500 text-sm mt-2">Upload profile files with performance data to visualize resource utilization</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Memory and CPU Utilization Over Time */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Resource Utilization Over Time</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis yAxisId="memory" orientation="left" label={{ value: 'Memory (MB)', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="cpu" orientation="right" label={{ value: 'CPU (ms/100)', angle: 90, position: 'insideRight' }} />
              <Tooltip />
              <Legend />
              
              {/* Memory usage as area charts */}
              {(viewMode === 'split' || viewMode === 'source') && (
                <Area
                  yAxisId="memory"
                  type="monotone"
                  dataKey="sourceMemory"
                  stackId="1"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.3}
                  name="Source Memory (MB)"
                />
              )}
              {(viewMode === 'split' || viewMode === 'target') && (
                <Area
                  yAxisId="memory"
                  type="monotone"
                  dataKey="targetMemory"
                  stackId="2"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.3}
                  name="Target Memory (MB)"
                />
              )}
              
              {/* CPU usage as lines */}
              {(viewMode === 'split' || viewMode === 'source') && (
                <Line
                  yAxisId="cpu"
                  type="monotone"
                  dataKey="sourceCPU"
                  stroke="#1D4ED8"
                  strokeWidth={2}
                  name="Source CPU (ms/100)"
                />
              )}
              {(viewMode === 'split' || viewMode === 'target') && (
                <Line
                  yAxisId="cpu"
                  type="monotone"
                  dataKey="targetCPU"
                  stroke="#059669"
                  strokeWidth={2}
                  name="Target CPU (ms/100)"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* I/O and Record Processing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* I/O Throughput */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">I/O Throughput (MB)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                {(viewMode === 'split' || viewMode === 'source') && (
                  <Area
                    type="monotone"
                    dataKey="sourceIO"
                    stackId="1"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.6}
                    name="Source I/O"
                  />
                )}
                {(viewMode === 'split' || viewMode === 'target') && (
                  <Area
                    type="monotone"
                    dataKey="targetIO"
                    stackId="1"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.6}
                    name="Target I/O"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Record Processing Rate */}
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Record Processing Rate</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                {(viewMode === 'split' || viewMode === 'source') && (
                  <Line
                    type="monotone"
                    dataKey="sourceRecords"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    name="Source Records"
                  />
                )}
                {(viewMode === 'split' || viewMode === 'target') && (
                  <Line
                    type="monotone"
                    dataKey="targetRecords"
                    stroke="#10B981"
                    strokeWidth={3}
                    name="Target Records"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Operator Resource Consumption */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Operator Resource Consumption</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={operatorResourceData.source.map((sourceOp, index) => ({
              operator: sourceOp.operatorName,
              sourceMemory: sourceOp.memoryMB,
              targetMemory: operatorResourceData.target[index]?.memoryMB || 0,
              sourceCPU: sourceOp.cpuMs / 10, // Scale for visualization
              targetCPU: (operatorResourceData.target[index]?.cpuMs || 0) / 10,
            }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="operator" angle={-45} textAnchor="end" height={100} />
              <YAxis yAxisId="memory" orientation="left" label={{ value: 'Memory (MB)', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="cpu" orientation="right" label={{ value: 'CPU (ms/10)', angle: 90, position: 'insideRight' }} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="memory" dataKey="sourceMemory" fill="#3B82F6" name="Source Memory" />
              <Bar yAxisId="memory" dataKey="targetMemory" fill="#10B981" name="Target Memory" />
              <Bar yAxisId="cpu" dataKey="sourceCPU" fill="#1D4ED8" name="Source CPU" />
              <Bar yAxisId="cpu" dataKey="targetCPU" fill="#059669" name="Target CPU" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Resource Distribution Pie Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(viewMode === 'split' || viewMode === 'source') && resourceDistributionData.source.length > 0 && (
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Source Resource Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={resourceDistributionData.source}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                  >
                    {resourceDistributionData.source.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {(viewMode === 'split' || viewMode === 'target') && resourceDistributionData.target.length > 0 && (
          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Target Resource Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={resourceDistributionData.target}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                  >
                    {resourceDistributionData.target.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResourceUtilizationCharts;