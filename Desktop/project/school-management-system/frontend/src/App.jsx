import { Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';

import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import MeetingDetails from './pages/MeetingDetails';

function App() {
  const { user } = useContext(AuthContext);

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
      {/* Protected Routes */}
      <Route path="/" element={user ? <Layout /> : <Navigate to="/login" />}>
        <Route index element={user?.role === 'Admin' ? <AdminDashboard /> : <TeacherDashboard />} />
        <Route path="meetings" element={user?.role === 'Admin' ? <div>Meetings Management</div> : <div>My Meetings</div>} />
        <Route path="meetings/:id" element={<MeetingDetails />} />
      </Route>
    </Routes>
  );
}

export default App;
