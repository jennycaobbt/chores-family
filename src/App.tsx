import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { ByPerson } from './pages/ByPerson'
import { ByLocation } from './pages/ByLocation'
import { Upcoming } from './pages/Upcoming'
import { Leaderboard } from './pages/Leaderboard'
import { Admin } from './pages/Admin'
import { PinGate } from './components/PinGate'

export default function App() {
  return (
    <PinGate>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/by-person" element={<ByPerson />} />
            <Route path="/by-location" element={<ByLocation />} />
            <Route path="/upcoming" element={<Upcoming />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/admin" element={<Admin />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </PinGate>
  )
}
