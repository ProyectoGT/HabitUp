import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Verification from './pages/Verification';
import Leads from './pages/Leads';
import Quotes from './pages/Quotes';
import Projects from './pages/Projects';
import Reviews from './pages/Reviews';
import Payments from './pages/Payments';
import Commissions from './pages/Commissions';
import Categories from './pages/Categories';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="verification" element={<Verification />} />
        <Route path="leads" element={<Leads />} />
        <Route path="quotes" element={<Quotes />} />
        <Route path="projects" element={<Projects />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="payments" element={<Payments />} />
        <Route path="commissions" element={<Commissions />} />
        <Route path="categories" element={<Categories />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
