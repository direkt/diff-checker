import React, { useState } from 'react';
import { PerformanceMetrics } from '@/utils/jqUtils';

interface QueryPerformanceAnalysisProps {
  performanceMetrics: PerformanceMetrics;
  title?: string;
  isCollapsed?: boolean;
  onToggleCollapsed?: () => void;
}

const QueryPerformanceAnalysis: React.FC<QueryPerformanceAnalysisProps> = ({ 
  performanceMetrics, 
  title = "Query Performance Analysis",
  isCollapsed: externalIsCollapsed,
  onToggleCollapsed
}) => {
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(true);
  
  // Use external state if provided, otherwise use internal state
  const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalIsCollapsed;
  
  const handleToggle = () => {
    if (onToggleCollapsed) {
      onToggleCollapsed();
    } else {
      setInternalIsCollapsed(!internalIsCollapsed);
    }
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}m`;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024**2) return `${(bytes/1024).toFixed(2)}KB`;
    if (bytes < 1024**3) return `${(bytes/(1024**2)).toFixed(2)}MB`;
    return `${(bytes/(1024**3)).toFixed(2)}GB`;
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  const formatRecords = (records: number): string => {
    if (records < 1000) return records.toString();
    if (records < 1_000_000) return `${(records / 1000).toFixed(1)}K`;
    if (records < 1_000_000_000) return `${(records / 1_000_000).toFixed(1)}M`;
    return `${(records / 1_000_000_000).toFixed(1)}B`;
  };

  const getSeverityColor = (severity: 'High' | 'Medium' | 'Low'): string => {
    switch (severity) {
      case 'High': return 'text-red-600 bg-red-50 border-red-200';
      case 'Medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Low': return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getBottleneckIcon = (type: string): string => {
    switch (type) {
      case 'I/O': return '💾';
      case 'CPU': return '⚡';
      case 'Memory': return '🧠';
      case 'Selectivity': return '🎯';
      default: return '⚠️';
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      <div 
        className="bg-blue-100 p-3 font-medium text-blue-800 cursor-pointer hover:bg-blue-200 transition-colors flex items-center justify-between"
        onClick={handleToggle}
      >
        <span>{title}</span>
        <span className="text-lg">
          {isCollapsed ? '▼' : '▲'}
        </span>
      </div>
      {!isCollapsed && (
        <div className="p-4 space-y-6">
          
          {/* Query Information */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-3">🔍 Query Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Query ID</div>
                <div className="text-sm font-semibold text-gray-900 break-all">
                  {performanceMetrics.queryInfo.queryId}
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">User</div>
                <div className="text-sm font-semibold text-gray-900">
                  {performanceMetrics.queryInfo.user}
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Dremio Version</div>
                <div className="text-sm font-semibold text-gray-900">
                  {performanceMetrics.queryInfo.dremioVersion || 'Unknown'}
                </div>
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-3">📊 Execution Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Total Query Time</div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatTime(performanceMetrics.totalQueryTimeMs)}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Planning Time</div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatTime(performanceMetrics.planningTimeMs)}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Execution Time</div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatTime(performanceMetrics.executionTimeMs)}
                </div>
              </div>
            </div>
          </div>

          {/* Operator Statistics */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-3">⚙️ Operator Statistics</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Total Operators</div>
                <div className="text-lg font-semibold text-gray-900">
                  {performanceMetrics.operatorStats.totalOperators}
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Max Operator Time</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatTime(performanceMetrics.operatorStats.maxOperatorTimeMs)}
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Avg Operator Time</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatTime(performanceMetrics.operatorStats.avgOperatorTimeMs)}
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Total Operator Time</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatTime(performanceMetrics.operatorStats.totalOperatorTimeMs)}
                </div>
              </div>
            </div>
          </div>

          {/* Longest Running Items */}
          {(performanceMetrics.longestRunningOperator || performanceMetrics.longestRunningPhase) && (
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-3">🏆 Longest Running Items</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {performanceMetrics.longestRunningOperator && (
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <div className="text-sm text-yellow-600 font-medium">Longest Running Operator</div>
                    <div className="text-lg font-semibold text-yellow-800">
                      Op {performanceMetrics.longestRunningOperator.operatorId} ({performanceMetrics.longestRunningOperator.operatorName})
                    </div>
                    <div className="text-sm text-yellow-700">
                      Fragment {performanceMetrics.longestRunningOperator.fragmentId} • {formatTime(performanceMetrics.longestRunningOperator.totalMs)}
                    </div>
                  </div>
                )}
                {performanceMetrics.longestRunningPhase && (
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <div className="text-sm text-blue-600 font-medium">Longest Running Phase</div>
                    <div className="text-lg font-semibold text-blue-800">
                      {performanceMetrics.longestRunningPhase.phaseName}
                    </div>
                    <div className="text-sm text-blue-700">
                      {formatTime(performanceMetrics.longestRunningPhase.durationMs)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Data Volume Statistics */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-3">📈 Data Volume Statistics</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Records Processed</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatRecords(performanceMetrics.dataVolumeStats.totalRecordsProcessed)}
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Data Size</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatBytes(performanceMetrics.dataVolumeStats.totalInputBytes)}
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Avg Throughput</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatNumber(performanceMetrics.dataVolumeStats.avgThroughputRecordsPerSec)} rec/sec
                </div>
              </div>
              {performanceMetrics.dataVolumeStats.compressionRatio && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Compression Ratio</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {performanceMetrics.dataVolumeStats.compressionRatio.toFixed(1)}:1
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Performance Bottlenecks */}
          {performanceMetrics.bottlenecks.length > 0 && (
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-3">🚨 Performance Bottlenecks</h4>
              <div className="space-y-3">
                {performanceMetrics.bottlenecks.map((bottleneck, index) => (
                  <div 
                    key={index}
                    className={`border rounded-lg p-4 ${getSeverityColor(bottleneck.severity)}`}
                  >
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">{getBottleneckIcon(bottleneck.type)}</span>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-semibold">{bottleneck.type} Bottleneck</span>
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                            bottleneck.severity === 'High' ? 'bg-red-100 text-red-800' :
                            bottleneck.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {bottleneck.severity}
                          </span>
                          {bottleneck.operatorId && (
                            <span className="text-xs text-gray-500">Op {bottleneck.operatorId}</span>
                          )}
                        </div>
                        <div className="text-sm mb-2">{bottleneck.description}</div>
                        {bottleneck.details && (
                          <div className="text-xs text-gray-600 mb-2">{bottleneck.details}</div>
                        )}
                        <div className="text-sm font-medium">
                          💡 Recommendation: {bottleneck.recommendation}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Phases */}
          {performanceMetrics.phases.length > 0 && (
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-3">⏱️ Top Query Phases</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-2 text-left">Rank</th>
                      <th className="border border-gray-300 p-2 text-left">Phase Name</th>
                      <th className="border border-gray-300 p-2 text-left">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performanceMetrics.phases.slice(0, 5).map((phase, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="border border-gray-300 p-2">{index + 1}</td>
                        <td className="border border-gray-300 p-2">{phase.phaseName}</td>
                        <td className="border border-gray-300 p-2 font-semibold">{formatTime(phase.durationMs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Top Operators */}
          {performanceMetrics.topOperators.length > 0 && (
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-3">🔥 Top Performance Impact Operators</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-2 text-left">Rank</th>
                      <th className="border border-gray-300 p-2 text-left">Fragment</th>
                      <th className="border border-gray-300 p-2 text-left">Op ID</th>
                      <th className="border border-gray-300 p-2 text-left">Type</th>
                      <th className="border border-gray-300 p-2 text-left">Total Time</th>
                      <th className="border border-gray-300 p-2 text-left">Setup</th>
                      <th className="border border-gray-300 p-2 text-left">Process</th>
                      <th className="border border-gray-300 p-2 text-left">Wait</th>
                      <th className="border border-gray-300 p-2 text-left">Records In</th>
                      <th className="border border-gray-300 p-2 text-left">Records Out</th>
                      <th className="border border-gray-300 p-2 text-left">Throughput</th>
                      <th className="border border-gray-300 p-2 text-left">Memory</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performanceMetrics.topOperators.slice(0, 5).map((operator, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="border border-gray-300 p-2">{index + 1}</td>
                        <td className="border border-gray-300 p-2">{operator.fragmentId}</td>
                        <td className="border border-gray-300 p-2">{operator.operatorId}</td>
                        <td className="border border-gray-300 p-2">{operator.operatorName}</td>
                        <td className="border border-gray-300 p-2 font-semibold">{formatTime(operator.totalMs)}</td>
                        <td className="border border-gray-300 p-2">{formatTime(operator.setupMs)}</td>
                        <td className="border border-gray-300 p-2">{formatTime(operator.processMs)}</td>
                        <td className="border border-gray-300 p-2">{formatTime(operator.waitMs)}</td>
                        <td className="border border-gray-300 p-2">{formatRecords(operator.inputRecords)}</td>
                        <td className="border border-gray-300 p-2">{formatRecords(operator.outputRecords)}</td>
                        <td className="border border-gray-300 p-2">
                          {operator.throughputRecordsPerSec ? 
                            `${formatNumber(operator.throughputRecordsPerSec)} rec/s` : 
                            'N/A'
                          }
                        </td>
                        <td className="border border-gray-300 p-2">
                          {operator.peakMemoryMB > 0 ? `${operator.peakMemoryMB}MB` : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QueryPerformanceAnalysis; 