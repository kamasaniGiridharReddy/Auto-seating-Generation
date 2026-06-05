import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from '../pages/LoginPage'
import SignupPage from '../pages/SignupPage'
import DashboardPage from '../pages/DashboardPage'
import UploadPage from '../pages/UploadPage'
import SeatingPage from '../pages/SeatingPage'
import ManualSeatingPage from '../pages/ManualSeatingPage'
import VisualizationPage from '../pages/VisualizationPage'
import SeatingEditor2DPage from '../pages/SeatingEditor2DPage'

/** App routes. TODO: add ProtectedRoute for authenticated pages. */
export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/seating" element={<SeatingPage />} />
        <Route path="/manual-seating" element={<ManualSeatingPage />} />
        <Route path="/visualization" element={<VisualizationPage />} />
        <Route path="/seating-editor-2d" element={<SeatingEditor2DPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
