import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

// Thin drag region for the macOS traffic light area only
function TitleBarDragRegion() {
  const isElectron = navigator.userAgent.toLowerCase().includes('electron')
  if (!isElectron) return null
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
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
      <BrowserRouter>
        <TitleBarDragRegion />
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
