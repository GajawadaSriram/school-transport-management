import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { NotificationProvider } from "./contexts/NotificationContext";
import StudentRegister from "./pages/StudentRegister";
import StudentLogin from "./pages/StudentLogin";
import StudentDashboard from "./pages/StudentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import NotificationsPage from "./pages/NotificationsPage";
import DriverDashboard from "./pages/DriverDashboard";

function App() {
  return (
    <NotificationProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/register/student" />} />
          <Route path="/register/student" element={<StudentRegister />} />
          <Route path="/student-login" element={<StudentLogin />} />
          <Route path="/student-dashboard" element={<StudentDashboard />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/driver-dashboard" element={<DriverDashboard />} />
        </Routes>
      </Router>
    </NotificationProvider>
  );
}

export default App;
