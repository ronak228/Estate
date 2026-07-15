import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  PhoneCall,
  CalendarCheck,
  FileText,
  BookOpen,
  Building2,
  UserCog,
  Settings,
  User,
  LogOut,
  Layers,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES_EXECUTIVE'],
  },
  // ─── Inventory ────────────────────────────────────────────────────────────
  {
    label: 'Projects',
    path: '/projects',
    icon: Layers,
    roles: ['ADMIN', 'MANAGER', 'SALES_EXECUTIVE'],
    group: 'inventory',
  },
  // ─── CRM Workflow ─────────────────────────────────────────────────────────
  {
    label: 'Inquiries',
    path: '/inquiries',
    icon: PhoneCall,
    roles: ['ADMIN', 'MANAGER', 'SALES_EXECUTIVE'],
    group: 'crm',
  },
  {
    label: 'Contacts',
    path: '/contacts',
    icon: Users,
    roles: ['ADMIN', 'MANAGER', 'SALES_EXECUTIVE'],
    group: 'crm',
  },
  {
    label: 'Site Visits',
    path: '/site-visits',
    icon: CalendarCheck,
    roles: ['ADMIN', 'MANAGER', 'SALES_EXECUTIVE'],
    group: 'crm',
  },
  {
    label: 'Quotations',
    path: '/quotations',
    icon: FileText,
    roles: ['ADMIN', 'MANAGER', 'SALES_EXECUTIVE'],
    group: 'crm',
  },
  {
    label: 'Bookings',
    path: '/bookings',
    icon: BookOpen,
    roles: ['ADMIN', 'MANAGER', 'SALES_EXECUTIVE'],
    group: 'crm',
  },
  // ─── Admin ────────────────────────────────────────────────────────────────
  {
    label: 'Companies',
    path: '/companies',
    icon: Building2,
    roles: ['SUPER_ADMIN'],
    group: 'admin',
  },
  {
    label: 'Employees',
    path: '/employees',
    icon: UserCog,
    roles: ['ADMIN', 'MANAGER'],
    group: 'admin',
  },
  {
    label: 'Company Settings',
    path: '/settings/company',
    icon: Settings,
    roles: ['ADMIN'],
    group: 'admin',
  },
];

const BOTTOM_ITEMS = [
  {
    label: 'My Profile',
    path: '/profile',
    icon: User,
    roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SALES_EXECUTIVE'],
  },
];

const SidebarGroupLabel = ({ children }) => (
  <p className="px-2.5 pt-2.5 mb-1 text-[10.5px] font-bold text-gray-400 uppercase tracking-wider">
    {children}
  </p>
);

const SidebarGroupCard = ({ children }) => (
  <div className="bg-white border border-gray-200 rounded-xl px-1 py-1 flex flex-col gap-0.5">
    {children}
  </div>
);

const SidebarLink = ({ item, onNavigate }) => (
  <NavLink
    to={item.path}
    onClick={onNavigate}
    className={({ isActive }) =>
      `relative flex items-center gap-2.5 pl-3 pr-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ease-snappy ${
        isActive
          ? 'bg-primary-50 text-primary-700'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`
    }
  >
    {({ isActive }) => (
      <>
        {isActive && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-primary" aria-hidden="true" />
        )}
        <item.icon size={18} className={isActive ? 'text-primary' : 'text-gray-400'} />
        {item.label}
      </>
    )}
  </NavLink>
);

const Sidebar = ({ mobileOpen = false, onMobileClose = () => {} }) => {
  const { user, logout } = useAuth();
  const role = user?.role;

  const visible = (item) => item.roles.includes(role);

  const dashboardItem = NAV_ITEMS.find((i) => !i.group);
  const inventoryItems = NAV_ITEMS.filter((i) => i.group === 'inventory' && visible(i));
  const crmItems = NAV_ITEMS.filter((i) => i.group === 'crm' && visible(i));
  const adminItems = NAV_ITEMS.filter((i) => i.group === 'admin' && visible(i));
  const bottomItems = BOTTOM_ITEMS.filter(visible);

  // Close the mobile drawer on Escape and lock body scroll while it's open.
  useEffect(() => {
    if (!mobileOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape') onMobileClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [mobileOpen, onMobileClose]);

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-fade-in lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-snappy
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:static lg:z-auto lg:w-64 lg:translate-x-0 lg:transition-none
          flex-shrink-0 bg-app border-r border-gray-200 flex flex-col h-full
        `}
      >
        {/* Logo */}
        <div className="px-4 py-4 bg-white border-b border-gray-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {user?.companyLogoUrl ? (
              <img
                src={user.companyLogoUrl}
                alt={`${user.companyName || 'Company'} logo`}
                className="w-8 h-8 rounded-lg object-cover border border-gray-200 flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <Building2 size={18} className="text-white" />
              </div>
            )}
            <span className="font-semibold text-gray-900 text-sm truncate min-w-0 flex-1" title={user?.companyName || 'Real Estate CRM'}>
              {user?.companyName || 'Real Estate CRM'}
            </span>
          </div>
          <button
            onClick={onMobileClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-150 ease-snappy lg:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2.5">
          {/* Dashboard */}
          {visible(dashboardItem) && (
            <SidebarGroupCard>
              <SidebarLink item={dashboardItem} onNavigate={onMobileClose} />
            </SidebarGroupCard>
          )}

          {/* Inventory */}
          {inventoryItems.length > 0 && (
            <SidebarGroupCard>
              <SidebarGroupLabel>Inventory</SidebarGroupLabel>
              {inventoryItems.map((item) => (
                <SidebarLink key={item.path} item={item} onNavigate={onMobileClose} />
              ))}
            </SidebarGroupCard>
          )}

          {/* CRM Workflow */}
          {crmItems.length > 0 && (
            <SidebarGroupCard>
              <SidebarGroupLabel>CRM Workflow</SidebarGroupLabel>
              {crmItems.map((item) => (
                <SidebarLink key={item.path} item={item} onNavigate={onMobileClose} />
              ))}
            </SidebarGroupCard>
          )}

          {/* Admin */}
          {adminItems.length > 0 && (
            <SidebarGroupCard>
              <SidebarGroupLabel>Admin</SidebarGroupLabel>
              {adminItems.map((item) => (
                <SidebarLink key={item.path} item={item} onNavigate={onMobileClose} />
              ))}
            </SidebarGroupCard>
          )}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-3 border-t border-gray-200">
          <SidebarGroupCard>
            {bottomItems.map((item) => (
              <SidebarLink key={item.path} item={item} onNavigate={onMobileClose} />
            ))}
            <button
              onClick={logout}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors duration-150 ease-snappy w-full text-left"
            >
              <LogOut size={18} className="text-gray-400" />
              Logout
            </button>
          </SidebarGroupCard>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
