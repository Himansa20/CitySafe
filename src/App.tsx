import { Route, Routes, Navigate } from "react-router-dom";
import TopBar from "./components/TopBar";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import NewSignalPage from "./pages/NewSignalPage";
import SignalDetailPage from "./pages/SignalDetailPage";
import "./leafletFix";

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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
