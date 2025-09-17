import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Login from './Login';
import Logout from './Logout';
import Notifications from './Notifications';
import Profile from './Profile';
import Dashboard from './components/Dashboard';
import Payments from './Payments';
import AdminTransactions from './AdminTransactions';
import ProtectedLayout from './ProtectedLayout';

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <div>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/logout" element={<Logout />} />

        {/* Protected routes share the same layout (Navigation + Outlet) */}
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/admin/transactions" element={<AdminTransactions />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        <Route 
          path="/" 
          element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} 
        />
      </Routes>
    </div>
  );
}

export default App;