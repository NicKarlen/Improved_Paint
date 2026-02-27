import { useState } from 'react';
import { AppProvider } from './store/AppContext';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import CanvasEditor from './components/CanvasEditor';
import ConfigSidebar from './components/ConfigSidebar';
import IntroDialog from './components/IntroDialog';
import './styles/app.css';

export default function App() {
  const [showIntro, setShowIntro] = useState(false);
  return (
    <AppProvider>
      <div className="app-layout">
        <Sidebar />
        <div className="main-area">
          <Toolbar />
          <CanvasEditor />
        </div>
        <ConfigSidebar />
      </div>
      <button className="info-btn" onClick={() => setShowIntro(true)} title="Show intro">?</button>
      {showIntro && <IntroDialog onClose={() => setShowIntro(false)} />}
    </AppProvider>
  );
}
