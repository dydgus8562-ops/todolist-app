import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useDarkModeStore } from '@/store/darkModeStore.js'
import '@/styles/index.css'
import App from './App.jsx'
import { useEffect } from 'react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60,
    },
  },
})

// 다크 모드 관리 컴포넌트
function DarkModeManager({ children }) {
  const isDarkMode = useDarkModeStore((state) => state.isDarkMode)
  
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])
  
  return children
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <DarkModeManager>
          <App />
        </DarkModeManager>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)