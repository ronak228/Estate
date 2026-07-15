import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, User, LogOut, Settings, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../shared/StatusBadge';
import GlobalSearch from './GlobalSearch';

const Topbar = ({ onMenuClick = () => {} }) => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 sm:px-6 flex-shrink-0 gap-3">
      {/* Company name */}
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 min-w-0 flex-shrink-0">
        <button
          onClick={onMenuClick}
          className="p-1.5 -ml-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-150 ease-snappy lg:hidden flex-shrink-0"
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
        <span className="truncate hidden sm:inline" title={user?.companyName || 'Real Estate CRM'}>
          {user?.companyName || 'Real Estate CRM'}
        </span>
      </div>

      <GlobalSearch />

      <div className="flex-1" />

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-150 ease-snappy text-sm"
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
            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-dropdown z-20 overflow-hidden origin-top-right animate-scale-in">
              <div className="px-4 py-3 bg-gradient-to-br from-primary-50 to-transparent flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                  {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user?.fullName}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
              </div>
              <div className="py-1.5">
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
            </div>
          </>
        )}
      </div>
    </header>
  );
};

export default Topbar;
