import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Workspace from '@/components/layout/Workspace';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Workspace />} />
      </Routes>
    </Router>
  );
}
