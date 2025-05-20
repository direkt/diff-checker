import React from 'react';
import ReactFlow, { MiniMap, Controls, Background, Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';

interface PhaseGraphProps {
  planJson: string | object;
  title?: string;
}

function extractNodesAndEdges(planJson: any): { nodes: Node[]; edges: Edge[] } {
  // planJson can be a stringified JSON or an object
  let plan: any;
  if (typeof planJson === 'string') {
    try {
      plan = JSON.parse(planJson);
    } catch {
      return { nodes: [], edges: [] };
    }
  } else {
    plan = planJson;
  }
  if (!plan || typeof plan !== 'object') return { nodes: [], edges: [] };

  // If the plan is wrapped in a 'jsonPlan' field, use that
  if (plan.jsonPlan) plan = plan.jsonPlan;

  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const yStep = 120;
  let i = 0;
  for (const phaseId in plan) {
    const phase = plan[phaseId];
    nodes.push({
      id: phaseId.replace(/\"/g, ''),
      data: { label: `${phaseId.replace(/\"/g, '')}: ${phase.op?.split('.')?.pop() || ''}${phase.phaseName ? ` (${phase.phaseName})` : ''}` },
      position: { x: 0, y: i * yStep },
      style: { minWidth: 180, padding: 8, borderRadius: 8, background: '#f0f4ff', border: '1px solid #b6c6e3' },
    });
    if (Array.isArray(phase.inputs)) {
      for (const input of phase.inputs) {
        edges.push({
          id: `${input}->${phaseId.replace(/\"/g, '')}`,
          source: input.replace(/\"/g, ''),
          target: phaseId.replace(/\"/g, ''),
          animated: true,
          style: { stroke: '#4f8cff' },
        });
      }
    }
    i++;
  }
  return { nodes, edges };
}

export const PhaseGraph: React.FC<PhaseGraphProps> = ({ planJson, title }) => {
  const { nodes, edges } = React.useMemo(() => extractNodesAndEdges(planJson), [planJson]);

  if (nodes.length === 0) {
    return <div className="text-gray-500 p-4">No plan graph data available</div>;
  }

  return (
    <div style={{ width: '100%', height: 500, background: '#f9fbfd', borderRadius: 12, boxShadow: '0 2px 8px #e3e8f0' }}>
      {title && <div className="font-semibold text-blue-800 px-4 pt-4">{title}</div>}
      <div style={{ width: '100%', height: 460 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          minZoom={0.2}
          maxZoom={2}
        >
          <MiniMap nodeColor={() => '#4f8cff'} />
          <Controls />
          <Background color="#e3e8f0" gap={16} />
        </ReactFlow>
      </div>
    </div>
  );
}; 