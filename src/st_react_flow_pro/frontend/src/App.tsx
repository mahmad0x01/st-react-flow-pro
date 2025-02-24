import Dagre from '@dagrejs/dagre';
import React, { JSX, useCallback, useEffect, useMemo, memo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  BaseEdge,
  getSmoothStepPath,
  type EdgeProps,
  type Node,
  type Edge,
  type Connection,
} from '@xyflow/react';
import { withStreamlitConnection, Streamlit } from "streamlit-component-lib";
import '@xyflow/react/dist/style.css';
import { initialNodes, nodeTypes } from './nodes';
import { initialEdges } from './edges';

interface MeasuredDimensions {
  width?: number;
  height?: number;
}

interface MeasuredNode extends Node {
  measured?: MeasuredDimensions;
}

interface FlowChartArgs {
  nodes?: MeasuredNode[];
  edges?: Edge[];
  borderNodeId?: string;
  theme?: {
    base?: string;
    secondaryBackgroundColor?: string;
    textColor?: string;
    primaryColor?: string;
  };
}

interface LayoutOptions {
  direction: string;
}

// Move the layout function out - it doesn't need to be memoized since it's pure
const getLayoutedElements = (
  nodes: MeasuredNode[],
  edges: Edge[],
  options: LayoutOptions
): { nodes: MeasuredNode[]; edges: Edge[] } => {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: options.direction });

  nodes.forEach((node) =>
    g.setNode(node.id, {
      width: node.measured?.width ?? 100,
      height: node.measured?.height ?? 50,
    })
  );

  edges.forEach((edge) => g.setEdge(edge.source, edge.target));

  Dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const position = g.node(node.id);
    const width = node.measured?.width ?? 100;
    const height = node.measured?.height ?? 50;
    const x = position.x - width / 2;
    const y = position.y - height / 2;
    return { ...node, position: { x, y } };
  });

  return { nodes: layoutedNodes, edges };
};

// Memoize the AnimatedSVGEdge component
const AnimatedSVGEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: EdgeProps): JSX.Element => {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} />
      <circle r="10" fill="#ff0073">
        <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
      </circle>
    </>
  );
});

AnimatedSVGEdge.displayName = 'AnimatedSVGEdge';

interface FlowChartProps {
  args: FlowChartArgs;
}

// Create a memoized version of the component styles
const useFlowChartStyles = (theme: FlowChartArgs['theme']) => {
  return useMemo(() => {
    const isDark = theme?.base === "dark";
    return {
      backgroundColor: theme?.secondaryBackgroundColor || (isDark ? "#333" : "#fff"),
      textColor: theme?.textColor || (isDark ? "#fff" : "#000"),
      primaryColor: theme?.primaryColor || '#007bff'
    };
  }, [theme]);
};

const FlowChart: React.FC<FlowChartProps> = memo(({ args }) => {
  const { fitView } = useReactFlow();
  const styles = useFlowChartStyles(args?.theme);

  // Memoize initial data
  const initialData = useMemo(() => ({
    nodes: args?.nodes || initialNodes,
    edges: args?.edges || initialEdges
  }), [args?.nodes, args?.edges]);

  // Memoize layouted data
  const layoutedData = useMemo(() =>
    getLayoutedElements(
      initialData.nodes,
      initialData.edges,
      { direction: 'TB' }
    ),
    [initialData.nodes, initialData.edges]
  );

  // Initialize states with memoized data
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedData.edges);

  // Memoize edge types
  const edgeTypes = useMemo(() => ({
    animatedSvg: AnimatedSVGEdge,
  }), []);

  // Set frame height only once on mount
  useEffect(() => {
    Streamlit.setFrameHeight();
  }, []);

  // Update nodes and edges when props change
  useEffect(() => {
    if (args?.nodes) {
      setNodes(args.nodes);
    }
    if (args?.edges) {
      setEdges(args.edges);
    }
  }, [args?.nodes, args?.edges, setNodes, setEdges]);

  // Memoize the addBorderToNode callback
  const addBorderToNode = useCallback(
    (nodeId: string): void => {
      setNodes((prevNodes) =>
        prevNodes.map((node) => ({
          ...node,
          style: {
            ...(node.style || {}),
            ...(node.id === nodeId
              ? { border: `2px solid ${styles.primaryColor}` }
              : { border: undefined })
          }
        }))
      );
    },
    [setNodes, styles.primaryColor]
  );

  // Border effect
  useEffect(() => {
    if (!args?.borderNodeId) return;

    const nodeWithBorder = nodes.find(
      (node) => node.id === args.borderNodeId &&
                node.style?.border === `2px solid ${styles.primaryColor}`
    );

    if (!nodeWithBorder) {
      addBorderToNode(args.borderNodeId);
    }
  }, [nodes, args?.borderNodeId, addBorderToNode, styles.primaryColor]);

  // Memoize connect callback
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges]
  );

  // Fit view effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fitView();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [fitView]);

  console.log('rerendered');


  return (
    <div style={{ height: 800, backgroundColor: styles.backgroundColor, color: styles.textColor }}>
      <ReactFlow
        nodes={nodes}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        edges={edges}
        edgeTypes={edgeTypes}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Background />
        <MiniMap />
        <Controls />
      </ReactFlow>
    </div>
  );
});

FlowChart.displayName = 'FlowChart';

const ConnectedFlowChart = withStreamlitConnection(FlowChart);
export default ConnectedFlowChart;
