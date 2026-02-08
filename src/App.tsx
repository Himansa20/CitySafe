import { Route, Routes, Navigate } from "react-router-dom";
import TopBar from "./components/TopBar";
import ProtectedRoute from "./components/ProtectedRoute";
import RequireRole from "./components/RequireRole";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import NewSignalPage from "./pages/NewSignalPage";
import SignalDetailPage from "./pages/SignalDetailPage";
import AdminPage from "./pages/AdminPage";
import HelpPage from "./pages/HelpPage";
import WasteSchedulePage from "./pages/WasteSchedulePage";
import WasteAdminPage from "./pages/WasteAdminPage";
import MyAreaPage from "./pages/MyAreaPage";
import "./leafletFix";
import NightSafety from "./pages/NightSafety";
import NightSafetyAdmin from "./pages/NightSafetyAdmin";
import SafePlacesAdmin from "./pages/SafePlacesAdmin";


import ProximityMonitor from "./components/ProximityMonitor";

export default function App() {
  return (
    <div>
      <TopBar />
      <ProximityMonitor />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/new"
          element={
            <ProtectedRoute>
              <NewSignalPage />
            </ProtectedRoute>
          }
        />

        <Route path="/signal/:id" element={<SignalDetailPage />} />

        <Route path="/help" element={<HelpPage />} />

        {/* Dashboard - unified admin console (replaces /admin) */}
        <Route
          path="/dashboard"
          element={
            <RequireRole roles={["ngo", "admin"]}>
              <AdminPage />
            </RequireRole>
          }
        />

        {/* Legacy admin route - redirect to dashboard */}
        <Route
          path="/admin"
          element={<Navigate to="/dashboard" replace />}
        />

        {/* My Area - personalized local view */}
        <Route
          path="/my-area"
          element={
            <ProtectedRoute>
              <MyAreaPage />
            </ProtectedRoute>
          }
        />

        <Route path="/night-safety" element={<NightSafety />} />
        <Route path="/waste" element={<WasteSchedulePage />} />

        {/* Waste Admin - now accessible from dashboard but kept for direct access */}
        <Route
          path="/waste-admin"
          element={
            <RequireRole roles={["ngo", "admin"]}>
              <WasteAdminPage />
            </RequireRole>
          }
        />

        <Route
          path="/night-safety-admin"
          element={
            <RequireRole roles={["ngo", "admin"]}>
              <NightSafetyAdmin />
            </RequireRole>
          }
        />

        <Route
          path="/safe-places-admin"
          element={
            <RequireRole roles={["ngo", "admin"]}>
              <SafePlacesAdmin />
            </RequireRole>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
