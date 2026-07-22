import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,        // data considered fresh for 60s — no refetch on re-focus/remount
      gcTime: 5 * 60_000,       // keep unused cache for 5 min
      refetchOnWindowFocus: false,
    },
  },
})

// Thin drag region for the macOS traffic light area only. Must stay
// narrow: -webkit-app-region hit-testing happens at the Chromium/OS layer,
// ignoring pointer-events, so a full-width strip here (it previously used
// `right: 0`, covering the whole window) swallowed clicks on anything
// beneath it — e.g. most of the tab bar, which sits flush with the top of
// the window with no title-bar spacer above it.
function TitleBarDragRegion() {
  const isElectron = navigator.userAgent.toLowerCase().includes('electron')
  if (!isElectron) return null
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '80px',
        height: '28px',
        WebkitAppRegion: 'drag',
        zIndex: 9999,
        pointerEvents: 'none',
      } as React.CSSProperties}
    />
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <TitleBarDragRegion />
        <App />
      </HashRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
