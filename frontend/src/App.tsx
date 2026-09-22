import {
  BrowserRouter,
  Route,
  Routes,
} from 'react-router-dom';

import Home from './pages/Home';
import Booking from './pages/Booking';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

import './styles.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/book"
          element={<Booking />}
        />

        <Route
          path="/admin/login"
          element={<AdminLogin />}
        />

        <Route
          path="/admin"
          element={
            <AdminDashboard />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}