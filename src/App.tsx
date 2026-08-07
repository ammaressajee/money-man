import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { HouseholdDataProvider } from './hooks/useHouseholdData'
import { FullPageLoader } from './components/Loader'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ManageData from './pages/ManageData'
import MoneyFlow from './pages/MoneyFlow'

function Protected() {
  const { status } = useAuth()
  if (status === 'loading') return <FullPageLoader />
  if (status === 'signedOut') return <Navigate to="/login" replace />
  return (
    <HouseholdDataProvider>
      <Outlet />
    </HouseholdDataProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Protected />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/flow" element={<MoneyFlow />} />
            <Route path="/manage" element={<ManageData />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
