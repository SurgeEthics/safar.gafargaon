import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Manage Service Worker lifecycle cleanly: unregister stale SW caches in dev, auto-update in production
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  if (!import.meta.env.PROD) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => {
        void reg.unregister().catch(() => {});
      });
    }).catch(() => {});
    if ('caches' in window) {
      caches.keys().then((keys) => {
        keys.forEach((k) => {
          void caches.delete(k).catch(() => {});
        });
      }).catch(() => {});
    }
  } else {
    let reloadedOnSwChange = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloadedOnSwChange) return;
      reloadedOnSwChange = true;
      window.location.reload();
    });

    const registerSW = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then((reg) => {
          void reg.update().catch(() => {});
        })
        .catch(() => {
          navigator.serviceWorker
            .register('/sw-notifications.js', { scope: '/', updateViaCache: 'none' })
            .catch(() => {});
        });
    };

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW);
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
