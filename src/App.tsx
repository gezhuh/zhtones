import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Home } from './routes/Home';
import { Calibrate } from './routes/Calibrate';
import { SingleTone } from './routes/SingleTone';
import { PairDrill } from './routes/PairDrill';
import { Settings } from './routes/Settings';
import { Dev } from './routes/Dev';
import { loadCalibration } from './calibration/store';
import type { Calibration } from './calibration/mapping';

export default function App() {
  const [cal, setCal] = useState<Calibration | null>(() => loadCalibration());

  useEffect(() => {
    const onStorage = () => setCal(loadCalibration());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function refreshCal() {
    setCal(loadCalibration());
  }

  return (
    <div className="app">
      <header>
        <h1>zhtones</h1>
        <nav>
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/single">Single tones</NavLink>
          <NavLink to="/pairs">Pairs</NavLink>
          <NavLink to="/calibrate">Calibrate</NavLink>
          <NavLink to="/settings">Settings</NavLink>
          <NavLink to="/dev">Dev</NavLink>
        </nav>
      </header>
      {!cal && (
        <div className="banner">
          You haven't calibrated your pitch range yet — drills will use a default range until
          you do. <NavLink to="/calibrate">Run calibration →</NavLink>
        </div>
      )}
      <Routes>
        <Route path="/" element={<Home calibrated={!!cal} />} />
        <Route path="/single" element={<SingleTone cal={cal} />} />
        <Route path="/pairs" element={<PairDrill cal={cal} />} />
        <Route path="/calibrate" element={<Calibrate onSaved={refreshCal} />} />
        <Route path="/settings" element={<Settings cal={cal} onChange={refreshCal} />} />
        <Route path="/dev" element={<Dev cal={cal} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
