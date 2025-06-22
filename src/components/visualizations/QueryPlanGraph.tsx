"use client";

import React, { useState, useCallback, useMemo } from 'react';
import ReactFlow, { 
  Node, 
  Edge, 
  addEdge, 
  Connection, 
  useNodesState, 
  useEdgesState,
  Controls,
  Background,
  MiniMap
} from 'react-flow-renderer';
import { ProfileData } from '@/utils/jqUtils';

interface QueryPlanGraphProps {
  leftData: ProfileData | null;
  rightData: ProfileData | null;
  viewMode: 'split' | 'source' | 'target';
}

interface PlanNode {
  id: string;
  type: string;
  operatorType: string;
  operatorName: string;
  cost?: number;
  rows?: number;
  recordsProcessed?: number;
  processingTime?: number;
  children?: PlanNode[];
  fragmentId?: string;
  setupMs?: number;
  processMs?: number;
  waitMs?: number;
  totalMs?: number;
}

// Custom node component for query operators
const QueryOperatorNode = ({ data }: { data: Record<string, unknown> }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const getNodeColor = (operatorType: string) => {
    const colorMap: Record<string, string> = {
      'TABLE_SCAN': '#3B82F6', // Blue
      'FILTER': '#10B981', // Green  
      'PROJECT': '#8B5CF6', // Purple
      'JOIN': '#F59E0B', // Orange
      'AGGREGATE': '#EF4444', // Red
      'SORT': '#6366F1', // Indigo
      'LIMIT': '#14B8A6', // Teal
      'UNION': '#F97316', // Orange-red
      'WINDOW': '#EC4899', // Pink
      'EXCHANGE': '#84CC16', // Lime
    };
    return colorMap[operatorType] || '#6B7280'; // Gray default
  };

  const formatTime = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatRows = (rows?: number) => {
    if (!rows) return 'N/A';
    if (rows < 1000) return rows.toString();
    if (rows < 1000000) return `${(rows / 1000).toFixed(1)}K`;
    return `${(rows / 1000000).toFixed(1)}M`;
  };

  return (
    <div 
      className="px-4 py-3 shadow-lg rounded-lg border-2 min-w-[200px] max-w-[300px]"
      style={{ 
        borderColor: getNodeColor(data.operatorType),
        backgroundColor: 'white'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div 
          className="text-white text-xs font-semibold px-2 py-1 rounded"
          style={{ backgroundColor: getNodeColor(data.operatorType) }}
        >
          {data.operatorType}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {/* Operator Name */}
      <div className="font-medium text-sm text-gray-800 mb-2 break-words">
        {data.operatorName || 'Unknown Operator'}
      </div>

      {/* Collapsible Details */}
      {isExpanded && (
        <div className="text-xs text-gray-600 space-y-1">
          {data.totalMs && (
            <div className="flex justify-between">
              <span>Total Time:</span>
              <span className="font-medium">{formatTime(data.totalMs)}</span>
            </div>
          )}
          {data.processMs && (
            <div className="flex justify-between">
              <span>Process:</span>
              <span>{formatTime(data.processMs)}</span>
            </div>
          )}
          {data.waitMs && (
            <div className="flex justify-between">
              <span>Wait:</span>
              <span>{formatTime(data.waitMs)}</span>
            </div>
          )}
          {data.recordsProcessed && (
            <div className="flex justify-between">
              <span>Records:</span>
              <span className="font-medium">{formatRows(data.recordsProcessed)}</span>
            </div>
          )}
          {data.fragmentId && (
            <div className="text-xs text-gray-400 mt-2">
              Fragment: {data.fragmentId}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Node types for react-flow
const nodeTypes = {
  queryOperator: QueryOperatorNode,
};

const QueryPlanGraph: React.FC<QueryPlanGraphProps> = ({
  leftData,
  rightData,
  viewMode
}) => {
  // Parse plan text to extract operator hierarchy
  const parsePlanToNodes = useCallback((planText: string, side: 'left' | 'right'): { nodes: Node[], edges: Edge[] } => {
    if (!planText) return { nodes: [], edges: [] };
    
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const lines = planText.split('\n');
    const nodeStack: { id: string; level: number }[] = [];
    
    let nodeId = 0;
    let yPosition = 0;
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('Cost') || trimmedLine.startsWith('Rows')) {
        return;
      }
      
      // Detect indentation level
      const level = (line.length - line.trimStart().length) / 2;
      const currentId = `${side}-node-${nodeId++}`;
      
      // Extract operator info from line
      let operatorType = 'UNKNOWN';
      let operatorName = trimmedLine;
      
      // Parse common operator patterns
      if (trimmedLine.includes('Scan')) {
        operatorType = 'TABLE_SCAN';
        operatorName = trimmedLine.replace(/.*Scan\s*/, '');
      } else if (trimmedLine.includes('Filter')) {
        operatorType = 'FILTER';
      } else if (trimmedLine.includes('Project')) {
        operatorType = 'PROJECT';
      } else if (trimmedLine.includes('Join') || trimmedLine.includes('JOIN')) {
        operatorType = 'JOIN';
      } else if (trimmedLine.includes('Aggregate') || trimmedLine.includes('AGG')) {
        operatorType = 'AGGREGATE';
      } else if (trimmedLine.includes('Sort')) {
        operatorType = 'SORT';
      } else if (trimmedLine.includes('Limit')) {
        operatorType = 'LIMIT';
      } else if (trimmedLine.includes('Union')) {
        operatorType = 'UNION';
      } else if (trimmedLine.includes('Exchange')) {
        operatorType = 'EXCHANGE';
      }
      
      // Create node
      const node: Node = {
        id: currentId,
        type: 'queryOperator',
        position: { 
          x: level * 250 + (side === 'right' ? 400 : 0), 
          y: yPosition 
        },
        data: {
          operatorType,
          operatorName,
          level,
          // Add performance data if available from leftData/rightData
        }
      };
      
      nodes.push(node);
      yPosition += 120;
      
      // Create edges based on hierarchy
      while (nodeStack.length > 0 && nodeStack[nodeStack.length - 1].level >= level) {
        nodeStack.pop();
      }
      
      if (nodeStack.length > 0) {
        const parentId = nodeStack[nodeStack.length - 1].id;
        edges.push({
          id: `${parentId}-${currentId}`,
          source: parentId,
          target: currentId,
          type: 'smoothstep',
          style: { 
            strokeWidth: 2,
            stroke: side === 'left' ? '#3B82F6' : '#EF4444'
          },
        });
      }
      
      nodeStack.push({ id: currentId, level });
    });
    
    return { nodes, edges };
  }, []);

  // Enhance nodes with performance data
  const enhanceNodesWithMetrics = useCallback((nodes: Node[], profileData: ProfileData | null) => {
    if (!profileData?.performanceMetrics?.topOperators) return nodes;
    
    return nodes.map(node => {
      // Find matching operator in performance data
      const operator = profileData.performanceMetrics.topOperators.find(op => 
        node.data.operatorName.includes(op.operatorName) ||
        node.data.operatorType === op.operatorType
      );
      
      if (operator) {
        return {
          ...node,
          data: {
            ...node.data,
            totalMs: operator.totalMs,
            processMs: operator.processMs,
            waitMs: operator.waitMs,
            setupMs: operator.setupMs,
            recordsProcessed: operator.outputRecords,
            fragmentId: operator.fragmentId,
          }
        };
      }
      
      return node;
    });
  }, []);

  // Generate nodes and edges based on view mode
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const allNodes: Node[] = [];
    const allEdges: Edge[] = [];
    
    if (viewMode === 'split' || viewMode === 'source') {
      if (leftData?.plan) {
        const { nodes: leftNodes, edges: leftEdges } = parsePlanToNodes(leftData.plan, 'left');
        const enhancedLeftNodes = enhanceNodesWithMetrics(leftNodes, leftData);
        allNodes.push(...enhancedLeftNodes);
        allEdges.push(...leftEdges);
      }
    }
    
    if (viewMode === 'split' || viewMode === 'target') {
      if (rightData?.plan) {
        const { nodes: rightNodes, edges: rightEdges } = parsePlanToNodes(rightData.plan, 'right');
        const enhancedRightNodes = enhanceNodesWithMetrics(rightNodes, rightData);
        allNodes.push(...enhancedRightNodes);
        allEdges.push(...rightEdges);
      }
    }
    
    return { nodes: allNodes, edges: allEdges };
  }, [leftData, rightData, viewMode, parsePlanToNodes, enhanceNodesWithMetrics]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when data changes
  React.useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  if (!leftData?.plan && !rightData?.plan) {
    return (
      <div className="h-[600px] flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <div className="text-gray-400 text-4xl mb-4">📊</div>
          <p className="text-gray-600 text-lg">No query plan data available</p>
          <p className="text-gray-500 text-sm mt-2">Upload profile files with execution plans to visualize</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[600px] border rounded-lg overflow-hidden bg-white">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Controls />
        <MiniMap 
          nodeStrokeColor="#374151"
          nodeColor="#9CA3AF"
          nodeBorderRadius={8}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
};

export default QueryPlanGraph;