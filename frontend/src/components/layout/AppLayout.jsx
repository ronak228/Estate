import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

/**
 * AppLayout — wraps every authenticated route.
 * Renders the sidebar + topbar + page content area.
 */
const AppLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-app">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
