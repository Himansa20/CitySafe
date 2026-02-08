import { Route, Routes, Navigate } from "react-router-dom";
import TopBar from "./components/TopBar";
import ProtectedRoute from "./components/ProtectedRoute"; // Phase 1 existing (used for /new)
import RequireRole from "./components/RequireRole";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import NewSignalPage from "./pages/NewSignalPage";
import SignalDetailPage from "./pages/SignalDetailPage";
import AdminPage from "./pages/AdminPage";
import HelpPage from "./pages/HelpPage";
import "./leafletFix";
import NightSafety from "./pages/NightSafety";


export default function App() {
  return (
    <div>
      <TopBar />
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

        <Route
          path="/admin"
          element={
            <RequireRole roles={["ngo", "admin"]}>
              <AdminPage />
            </RequireRole>
          }
        />
        <Route path="/night-safety" element={<NightSafety />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
