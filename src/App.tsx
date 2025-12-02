import { useEffect, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { BookingProvider } from './contexts/BookingContext';
import { UnitProvider, useUnits } from './contexts/UnitContext';
import { toast } from 'react-hot-toast';
import Login from './Login';
import Signup from './Signup';
import Logout from './Logout';
import Notifications from './Notifications';
import Profile from './Profile';
import Dashboard from './components/Dashboard';
import Analytics from './components/Analytics';
import Payments from './Payments';
import AdminTransactions from './AdminTransactions';
import ProtectedLayout from './ProtectedLayout';
import Insights from './Insights';
import Assistant from './Assistant';
import Value from './Value';
import BookingsPage from './pages/BookingsPage';
import BookingForm from './components/bookings/BookingForm';
import BookingDetails from './components/bookings/BookingDetails';

// WebSocket connection manager - DISABLED
// TODO: Re-enable when backend WebSocket is configured at ws://localhost:3001/ws
// const useWebSocket = (onMessage: (data: any) => void) => {
//   useEffect(() => {
//     const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
//     const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
//
//     ws.onopen = () => {
//       console.log('WebSocket Connected');
//     };
//
//     ws.onmessage = (event) => {
//       try {
//         const data = JSON.parse(event.data);
//         onMessage(data);
//       } catch (error) {
//         console.error('Error parsing WebSocket message:', error);
//       }
//     };
//
//     ws.onerror = (error) => {
//       console.error('WebSocket error:', error);
//       toast.error('Connection error. Trying to reconnect...');
//     };
//
//     ws.onclose = () => {
//       console.log('WebSocket Disconnected');
//       setTimeout(() => {
//         onMessage({ type: 'reconnect' });
//       }, 3000);
//     };
//
//     return () => {
//       try { ws.close(); } catch {}
//     };
//   }, [onMessage]);
// };

function AppContent() {
  const { isAuthenticated } = useAuth();
  // const { updateUnit } = useUnits();

  // TODO: Re-enable when backend WebSocket is configured
  // const handleWebSocketMessage = useCallback((data: any) => {
  //   if (data.type === 'unitUpdate') {
  //     const { unitId, updates } = data.payload;
  //     updateUnit(unitId, updates);
  //
  //     // Show toast for significant updates
  //     if (updates.status === 'maintenance') {
  //       toast(`Unit ${unitId} requires maintenance`, { icon: '🔧' });
  //     } else if (updates.fillLevel > 90) {
  //       toast(`Unit ${unitId} is almost full (${updates.fillLevel}%)`, { icon: '⚠️' });
  //     } else if (updates.batteryLevel < 20) {
  //       toast(`Unit ${unitId} battery low (${updates.batteryLevel}%)`, { icon: '🔋' });
  //     }
  //   } else if (data.type === 'reconnect') {
  //     toast.success('Reconnected to real-time updates');
  //   }
  // }, [updateUnit]);
  //
  // // Initialize WebSocket connection
  // useWebSocket(handleWebSocketMessage);

  return (
    <div>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/logout" element={<Logout />} />

        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/value" element={<Value />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/admin/transactions" element={<AdminTransactions />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/bookings/new" element={<BookingForm />} />
          <Route path="/bookings/:id" element={<BookingDetails />} />
          <Route path="/bookings/:id/edit" element={<BookingForm />} />
        </Route>

        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />}
        />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <UnitProvider>
        <BookingProvider>
          <AppContent />
        </BookingProvider>
      </UnitProvider>
    </AuthProvider>
  );
}

export default App;