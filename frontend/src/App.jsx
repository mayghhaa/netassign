import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import AuditLogs from './pages/AuditLogs.jsx'
import Dashboard from './pages/Dashboard.jsx'
import NotFound from './pages/NotFound.jsx'
import SubnetDetail from './pages/SubnetDetail.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="subnets/:id" element={<SubnetDetail />} />
        <Route path="audit" element={<AuditLogs />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
