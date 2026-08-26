import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { readInitialState } from './router';
import { preloadRoute } from './pages';
import './styles.css';

// =============================================================================
//  Wait for the current route's chunk before the first render.
//
//  Every route page is React.lazy(), and createRoot() replaces the prerendered
//  DOM rather than reusing it. So the sequence used to be:
//
//    1. the browser paints the prerendered page — complete, correct, tall
//    2. the bundle executes, React empties #app and renders
//    3. the page component is lazy and not loaded yet, so React paints the
//       Suspense fallback: an empty 70vh box
//    4. the chunk arrives and the real page comes back
//
//  Between 2 and 4 the whole page collapses. Measured on a throttled mobile
//  profile that is a 0.30 Cumulative Layout Shift — the footer jumping up the
//  viewport and back — which is over Google's 0.25 "poor" threshold and counts
//  against the page in Core Web Vitals.
//
//  Awaiting the initial route's module first collapses steps 2–4 into one
//  render of the same content, so nothing moves. Later navigations still
//  code-split normally; this only covers the page the visitor landed on.
//
//  If the import fails (offline, a stale hashed filename after a deploy) we
//  render anyway — a layout shift is far better than a blank page.
// =============================================================================
function mount() {
  ReactDOM.createRoot(document.getElementById('app')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

let route = 'home';
try { route = readInitialState().route || 'home'; } catch { /* fall through to home */ }

preloadRoute(route).then(mount, mount);
