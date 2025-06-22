"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { ProfileData } from '@/utils/jqUtils';

interface FlameGraphProps {
  leftData: ProfileData | null;
  rightData: ProfileData | null;
  viewMode: 'split' | 'source' | 'target';
  selectedSide?: 'source' | 'target';
}

interface FlameNode {
  name: string;
  value: number;
  children?: FlameNode[];
  depth: number;
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
  operatorType?: string;
  fragmentId?: string;
  details?: {
    setupMs: number;
    processMs: number;
    waitMs: number;
    inputRecords: number;
    outputRecords: number;
  };
}

const FlameGraph: React.FC<FlameGraphProps> = ({
  leftData,
  rightData,
  viewMode,
  selectedSide = 'source'
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Transform performance data into flame graph format
  const flameData = useMemo((): FlameNode | null => {
    const data = selectedSide === 'source' ? leftData : rightData;
    
    if (!data?.performanceMetrics?.topOperators) return null;

    // Group operators by fragment and create hierarchy
    const fragmentMap = new Map<string, any[]>();
    
    data.performanceMetrics.topOperators.forEach(op => {
      const fragmentId = op.fragmentId || 'unknown';
      if (!fragmentMap.has(fragmentId)) {
        fragmentMap.set(fragmentId, []);
      }
      fragmentMap.get(fragmentId)!.push(op);
    });

    // Create root node
    const root: FlameNode = {
      name: 'Query Execution',
      value: data.performanceMetrics.totalQueryTimeMs,
      depth: 0,
      children: []
    };

    // Create fragment-level nodes
    Array.from(fragmentMap.entries()).forEach(([fragmentId, operators]) => {
      const fragmentTotalMs = operators.reduce((sum, op) => sum + op.totalMs, 0);
      
      const fragmentNode: FlameNode = {
        name: `Fragment ${fragmentId}`,
        value: fragmentTotalMs,
        depth: 1,
        children: []
      };

      // Sort operators by total time (descending) for better visualization
      const sortedOperators = operators.sort((a, b) => b.totalMs - a.totalMs);

      // Create operator nodes
      sortedOperators.forEach(op => {
        const operatorNode: FlameNode = {
          name: `${op.operatorType}: ${op.operatorName}`,
          value: op.totalMs,
          depth: 2,
          operatorType: op.operatorType,
          fragmentId: op.fragmentId,
          details: {
            setupMs: op.setupMs,
            processMs: op.processMs,
            waitMs: op.waitMs,
            inputRecords: op.inputRecords,
            outputRecords: op.outputRecords
          },
          children: []
        };

        // Create breakdown nodes for significant time components
        if (op.processMs > 10) {
          operatorNode.children!.push({
            name: 'Process Time',
            value: op.processMs,
            depth: 3
          });
        }
        
        if (op.waitMs > 10) {
          operatorNode.children!.push({
            name: 'Wait Time',
            value: op.waitMs,
            depth: 3
          });
        }
        
        if (op.setupMs > 10) {
          operatorNode.children!.push({
            name: 'Setup Time',
            value: op.setupMs,
            depth: 3
          });
        }

        fragmentNode.children!.push(operatorNode);
      });

      root.children!.push(fragmentNode);
    });

    return root;
  }, [leftData, rightData, selectedSide]);

  // Color scales for different operator types and performance levels
  const getNodeColor = (node: FlameNode): string => {
    if (node.operatorType) {
      const colorMap: Record<string, string> = {
        'TABLE_SCAN': '#3B82F6',
        'FILTER': '#10B981',
        'PROJECT': '#8B5CF6',
        'JOIN': '#F59E0B',
        'AGGREGATE': '#EF4444',
        'SORT': '#6366F1',
        'LIMIT': '#14B8A6',
        'UNION': '#F97316',
        'WINDOW': '#EC4899',
        'EXCHANGE': '#84CC16',
      };
      return colorMap[node.operatorType] || '#6B7280';
    }
    
    // Performance-based coloring for non-operator nodes
    if (node.value > 10000) return '#DC2626'; // Dark red for > 10s
    if (node.value > 5000) return '#EA580C';  // Orange-red for > 5s
    if (node.value > 1000) return '#F59E0B';  // Orange for > 1s
    return '#6B7280'; // Gray for fast operations
  };

  // Draw flame graph
  useEffect(() => {
    if (!svgRef.current || !flameData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous content

    const width = 800;
    const height = 400;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    svg.attr("width", width).attr("height", height);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Calculate layout
    const maxDepth = 4;
    const rowHeight = chartHeight / maxDepth;

    const partition = d3.partition<FlameNode>()
      .size([chartWidth, chartHeight])
      .round(true);

    const hierarchy = d3.hierarchy(flameData)
      .sum(d => d.value)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const nodes = partition(hierarchy).descendants();

    // Create tooltip
    const tooltip = d3.select(tooltipRef.current!);

    // Draw rectangles
    const rects = g.selectAll("rect")
      .data(nodes)
      .enter()
      .append("rect")
      .attr("x", d => d.x0!)
      .attr("y", d => d.y0!)
      .attr("width", d => Math.max(0, d.x1! - d.x0!))
      .attr("height", d => Math.max(0, d.y1! - d.y0!))
      .attr("fill", d => getNodeColor(d.data))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        // Highlight on hover
        d3.select(this).attr("stroke-width", 2).attr("stroke", "#000");
        
        // Show tooltip
        const details = d.data.details;
        let tooltipContent = `
          <div class="font-semibold">${d.data.name}</div>
          <div class="text-sm text-gray-600">Total Time: ${d.data.value}ms</div>
        `;
        
        if (details) {
          tooltipContent += `
            <div class="text-sm text-gray-600 mt-2">
              <div>Process: ${details.processMs}ms</div>
              <div>Wait: ${details.waitMs}ms</div>
              <div>Setup: ${details.setupMs}ms</div>
              <div>Input Records: ${details.inputRecords?.toLocaleString() || 'N/A'}</div>
              <div>Output Records: ${details.outputRecords?.toLocaleString() || 'N/A'}</div>
            </div>
          `;
        }
        
        if (d.data.fragmentId) {
          tooltipContent += `<div class="text-xs text-gray-500 mt-1">Fragment: ${d.data.fragmentId}</div>`;
        }
        
        tooltip
          .style("opacity", 1)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px")
          .html(tooltipContent);
      })
      .on("mouseout", function(event, d) {
        // Remove highlight
        d3.select(this).attr("stroke-width", 1).attr("stroke", "#fff");
        
        // Hide tooltip
        tooltip.style("opacity", 0);
      })
      .on("click", function(event, d) {
        // Could implement drill-down functionality here
        console.log("Clicked node:", d.data);
      });

    // Add text labels
    const labels = g.selectAll("text")
      .data(nodes.filter(d => (d.x1! - d.x0!) > 50 && (d.y1! - d.y0!) > 15)) // Only show labels for sufficiently large rectangles
      .enter()
      .append("text")
      .attr("x", d => (d.x0! + d.x1!) / 2)
      .attr("y", d => (d.y0! + d.y1!) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .style("fill", "white")
      .style("pointer-events", "none")
      .text(d => {
        const width = d.x1! - d.x0!;
        const name = d.data.name;
        
        // Truncate text based on available width
        if (width < 100) {
          return name.length > 10 ? name.substring(0, 10) + "..." : name;
        } else if (width < 150) {
          return name.length > 15 ? name.substring(0, 15) + "..." : name;
        }
        return name;
      });

    // Add time annotations
    labels.each(function(d) {
      const rect = rects.filter(r => r === d);
      const rectHeight = d.y1! - d.y0!;
      
      if (rectHeight > 30) {
        // Add time below the name
        d3.select(this.parentNode as Element)
          .append("text")
          .attr("x", (d.x0! + d.x1!) / 2)
          .attr("y", (d.y0! + d.y1!) / 2 + 12)
          .attr("dy", "0.35em")
          .attr("text-anchor", "middle")
          .style("font-size", "9px")
          .style("fill", "rgba(255,255,255,0.8)")
          .style("pointer-events", "none")
          .text(`${d.data.value}ms`);
      }
    });

  }, [flameData]);

  if (!flameData) {
    return (
      <div className="h-[400px] flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <div className="text-gray-400 text-4xl mb-4">🔥</div>
          <p className="text-gray-600 text-lg">No performance data available</p>
          <p className="text-gray-500 text-sm mt-2">Upload profile files with operator performance data to generate flame graph</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      {viewMode === 'split' && (
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Performance Flame Graph</h3>
            <div className="flex gap-2">
              <button
                onClick={() => selectedSide !== 'source' && window.location.reload()} // Simplified for demo
                className={`px-3 py-1 rounded text-sm ${
                  selectedSide === 'source' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Source
              </button>
              <button
                onClick={() => selectedSide !== 'target' && window.location.reload()} // Simplified for demo
                className={`px-3 py-1 rounded text-sm ${
                  selectedSide === 'target' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Target
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Hover over rectangles for details • Click to explore • Rectangle width = time spent
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <h4 className="font-semibold text-gray-800 mb-3">Operator Types</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>TABLE_SCAN</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>FILTER</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-500 rounded"></div>
            <span>PROJECT</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span>JOIN</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>AGGREGATE</span>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-500">
          <div>🔥 Red tones = High execution time (potential bottlenecks)</div>
          <div>📊 Rectangle width represents time spent in each operation</div>
        </div>
      </div>

      {/* Flame Graph */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="relative">
          <svg ref={svgRef} className="w-full"></svg>
          
          {/* Tooltip */}
          <div
            ref={tooltipRef}
            className="absolute pointer-events-none bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg opacity-0 transition-opacity z-10"
            style={{ maxWidth: '300px' }}
          />
        </div>
      </div>

      {/* Performance Summary */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <h4 className="font-semibold text-gray-800 mb-3">Performance Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
            <div className="font-semibold text-red-800">Bottlenecks</div>
            <div className="text-red-700 mt-1">
              Operations taking &gt; 10s are highlighted in red and may need optimization
            </div>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
            <div className="font-semibold text-orange-800">Moderate Impact</div>
            <div className="text-orange-700 mt-1">
              Operations taking 5-10s shown in orange tones
            </div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <div className="font-semibold text-green-800">Optimized</div>
            <div className="text-green-700 mt-1">
              Fast operations (&lt; 1s) require minimal attention
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlameGraph;