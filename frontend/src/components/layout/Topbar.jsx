import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, User, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../shared/StatusBadge';

const Topbar = () => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      {/* Company name */}
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 min-w-0">
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
          <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold">
            {user?.fullName?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="text-gray-700 font-medium">{user?.fullName}</span>
          <StatusBadge value={user?.role} size="xs" />
          <ChevronDown size={14} className="text-gray-400" />
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1">
              <Link
                to="/profile"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <User size={15} />
                My Profile
              </Link>
              {user?.role === 'ADMIN' && (
                <Link
                  to="/settings/company"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Settings size={15} />
                  Company Settings
                </Link>
              )}
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={() => { setMenuOpen(false); logout(); }}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
              >
                <LogOut size={15} />
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
