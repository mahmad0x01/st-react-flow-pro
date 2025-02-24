import React from 'react';
import ReactDOM from 'react-dom/client';

import ConnectedFlowChart from './App';

import './index.css';
import { ReactFlowProvider } from '@xyflow/react';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ReactFlowProvider>
      <ConnectedFlowChart />
    </ReactFlowProvider>
  </React.StrictMode>
);
