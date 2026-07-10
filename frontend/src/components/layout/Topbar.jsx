import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, User, LogOut, Settings, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../shared/StatusBadge';

const Topbar = ({ onMenuClick = () => {} }) => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 gap-2">
      {/* Company name */}
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 min-w-0">
        <button
          onClick={onMenuClick}
          className="p-1.5 -ml-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors lg:hidden flex-shrink-0"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        {user?.companyLogoUrl && (
          <img
            src={user.companyLogoUrl}
            alt={`${user.companyName || 'Company'} logo`}
            className="w-6 h-6 rounded object-cover border border-gray-200 flex-shrink-0"
          />
        )}
        <span className="truncate" title={user?.companyName || 'Real Estate CRM'}>
          {user?.companyName || 'Real Estate CRM'}
        </span>
      </div>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors text-sm"
        >
          <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
            {user?.fullName?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="text-gray-700 font-medium hidden sm:inline">{user?.fullName}</span>
          <span className="hidden sm:inline"><StatusBadge value={user?.role} size="xs" /></span>
          <ChevronDown size={14} className="text-gray-400" />
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-dropdown z-20 py-1.5 origin-top-right animate-scale-in">
              <div className="px-4 py-2 border-b border-gray-100 sm:hidden">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.fullName}</p>
                <StatusBadge value={user?.role} size="xs" />
              </div>
              <Link
                to="/profile"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150 ease-snappy"
              >
                <User size={15} className="text-gray-400" />
                My Profile
              </Link>
              {user?.role === 'ADMIN' && (
                <Link
                  to="/settings/company"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150 ease-snappy"
                >
                  <Settings size={15} className="text-gray-400" />
                  Company Settings
                </Link>
              )}
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={() => { setMenuOpen(false); logout(); }}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150 ease-snappy w-full text-left"
              >
                <LogOut size={15} className="text-red-400" />
                Logout
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
};

export default Topbar;
