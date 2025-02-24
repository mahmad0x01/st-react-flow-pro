import type { Edge, EdgeTypes } from '@xyflow/react';

export const initialEdges: Edge[] = [
  { id: 'a->c', source: 'a', target: 'c', animated: true }
];

export const edgeTypes = {
  // Add your custom edge types here!
} satisfies EdgeTypes;
