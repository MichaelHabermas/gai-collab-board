import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { createFirestoreBoardRepo } from './modules/sync/firestoreBoardRepo';
import { createRealtimeSyncRepo } from './modules/sync/realtimeSyncRepo';
import { initRepository } from './lib/repositoryProvider';
import { initWriteQueue } from './lib/writeQueue';
import './index.css';

const boardRepo = createFirestoreBoardRepo();
initRepository(boardRepo, createRealtimeSyncRepo());
initWriteQueue(boardRepo);

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
