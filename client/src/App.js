import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { io } from "socket.io-client";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AuctionList from "./pages/AuctionList";
import ItemDetails from "./pages/ItemDetails";
import AdminDashboard from "./pages/AdminDashboard";
import Navbar from "./components/Navbar";

const apiUrl = process.env.REACT_APP_API_URL;

if (process.env.NODE_ENV === 'production' && !apiUrl) {
  throw new Error('REACT_APP_API_URL must be configured for production builds');
}

const socket = io(apiUrl || 'http://localhost:5000', {
  withCredentials: true,
  transports: ['websocket', 'polling']
});
window.socket = socket;

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Navbar />
                <AuctionList />
              </PrivateRoute>
            }
          />
          <Route
            path="/item/:id"
            element={
              <PrivateRoute>
                <Navbar />
                <ItemDetails />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Navbar />
                <AdminDashboard />
              </AdminRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

// Private Route component
function PrivateRoute({ children }) {
  const { currentUser, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  
  return currentUser ? children : <Navigate to="/login" />;
}

// Admin Route component
function AdminRoute({ children }) {
  const { currentUser, isAdmin, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  
  return currentUser && isAdmin ? children : <Navigate to="/" />;
}

export default App;
