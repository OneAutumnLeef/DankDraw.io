import { Route, BrowserRouter, Routes, Navigate } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { RoomPage } from './pages/RoomPage';
import { useSocketBindings } from './hooks/useSocketBindings';
import { AchievementToastLayer } from './components/AchievementToast';
import { Background } from './components/Background';
import { Toasts } from './components/Toasts';

export function App() {
  useSocketBindings();
  return (
    <BrowserRouter>
      <Background />
      <div className="relative z-10 min-h-full">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/r/:code" element={<RoomPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Toasts />
      <AchievementToastLayer />
    </BrowserRouter>
  );
}
