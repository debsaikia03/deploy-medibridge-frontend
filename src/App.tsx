import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from './components/ThemeProvider';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';
import DoctorDashboard from './pages/doctor/Dashboard';
import MentalHealth from './pages/MentalHealth';
import Chat from './pages/mental-health/Chat';
import MoodTracker from './pages/mental-health/MoodTracker';
import Exercises from './pages/mental-health/Exercises';
import Challenges from './pages/mental-health/Challenges';
import Journal from './pages/mental-health/Journal';
import Community from './pages/mental-health/Community';
import Assessment from './pages/mental-health/Assessment';
import FoodInfo from './components/dashboard/FoodInfo';
import { AuthProvider } from './contexts/AuthContext';
import { Analytics } from '@vercel/analytics/react';
import Landing from './pages/Landing';
import CommunityForum from './components/dashboard/CommunityForum';

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="EquiHealth-theme">
      <AuthProvider>
        <Router>
          <Layout>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Shared Protected Routes (Patient, Doctor, Admin) */}
              <Route element={<ProtectedRoute roles={['patient', 'doctor', 'admin']} />}>
                <Route path="/community-forum" element={<CommunityForum />} />
              </Route>

              {/* Patient-Only Routes */}
              <Route element={<ProtectedRoute roles={['patient']} />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/mental-health" element={<MentalHealth />} />
                <Route path="/mental-health/chat" element={<Chat />} />
                <Route path="/mental-health/mood-tracker" element={<MoodTracker />} />
                <Route path="/mental-health/exercises" element={<Exercises />} />
                <Route path="/mental-health/challenges" element={<Challenges />} />
                <Route path="/mental-health/journal" element={<Journal />} />
                <Route path="/mental-health/community" element={<Community />} />
                <Route path="/mental-health/assessment" element={<Assessment />} />
                <Route path="/food-info" element={<FoodInfo />} />
              </Route>

              {/* Doctor-Only Routes */}
              <Route element={<ProtectedRoute roles={['doctor']} />}>
                <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
                {/* Community forum is now in the shared block */}
              </Route>

              {/* Admin-Only Routes */}
              <Route element={<ProtectedRoute roles={['admin']} />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                {/* Community forum is now in the shared block */}
              </Route>

              {/* Fallback Route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
          <Toaster position="top-center" richColors />
        </Router>
        <Analytics />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;