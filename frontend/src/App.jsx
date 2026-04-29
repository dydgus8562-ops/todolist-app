import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from '@/pages/LoginPage.jsx'
import { RegisterPage } from '@/pages/RegisterPage.jsx'
import { TasksPage } from '@/pages/TasksPage.jsx'
import { PrivateRoute } from '@/components/PrivateRoute.jsx'
import { ROUTES } from '@/constants/routes.js'

function App() {
  return (
    <Routes>
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
      <Route
        path={ROUTES.TASKS}
        element={
          <PrivateRoute>
            <TasksPage />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to={ROUTES.TASKS} replace />} />
    </Routes>
  )
}

export default App
