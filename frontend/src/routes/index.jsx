import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import DashboardPage from '../pages/DashboardPage'
import UploadPage from '../pages/UploadPage'
import SeatingPage from '../pages/SeatingPage'
import ManualSeatingPage from '../pages/ManualSeatingPage'
import VisualizationPage from '../pages/VisualizationPage'
import SeatingEditor2DPage from '../pages/SeatingEditor2DPage'

/** App routes. */
export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/seating" element={<SeatingPage />} />
        <Route path="/manual-seating" element={<ManualSeatingPage />} />
        <Route path="/visualization" element={<VisualizationPage />} />
        <Route path="/seating-editor-2d" element={<SeatingEditor2DPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
