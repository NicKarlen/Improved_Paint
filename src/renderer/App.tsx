import { AppProvider } from './store/AppContext';
import Sidebar from './components/Sidebar';
import Toolbar from './components/Toolbar';
import CanvasEditor from './components/CanvasEditor';
import ConfigSidebar from './components/ConfigSidebar';
import './styles/app.css';

export default function App() {
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
    </AppProvider>
  );
}
