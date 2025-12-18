import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Login from './Login';
import Signup from './Signup';
import ResetPassword from './ResetPassword';
import Logout from './Logout';
import Notifications from './Notifications';
import Profile from './Profile';
import Dashboard from './components/Dashboard';

import AdminTransactions from './AdminTransactions';
import ProtectedLayout from './ProtectedLayout';
import Insights from './Insights';
import Assistant from './Assistant';
import Value from './Value';
import { BookingProvider } from './contexts/BookingContext';
import { SettingsProvider } from './contexts/SettingsContext';
import BookingDetails from './components/bookings/BookingDetails';

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <SettingsProvider>
      <div>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/logout" element={<Logout />} />

          {/* Protected routes share the same layout (Navigation + Outlet) */}
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={
              <BookingProvider>
                <Dashboard />
              </BookingProvider>
            } />
            <Route path="/bookings/:id" element={
              <BookingProvider>
                <BookingDetails />
              </BookingProvider>
            } />
            <Route path="/settings" element={<Dashboard initialTab="settings" />} />

            <Route path="/insights" element={<Insights />} />
            <Route path="/value" element={<Value />} />
            <Route path="/assistant" element={<Assistant />} />
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
    </SettingsProvider>
  );
}

export default App;