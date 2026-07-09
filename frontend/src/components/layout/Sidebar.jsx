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

const SidebarLink = ({ item }) => (
  <NavLink
    to={item.path}
    className={({ isActive }) =>
      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? 'bg-primary text-white'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`
    }
  >
    <item.icon size={18} />
    {item.label}
  </NavLink>
);

const Sidebar = () => {
  const { user, logout } = useAuth();
  const role = user?.role;

  const visible = (item) => item.roles.includes(role);

  const dashboardItem = NAV_ITEMS.find((i) => !i.group);
  const inventoryItems = NAV_ITEMS.filter((i) => i.group === 'inventory' && visible(i));
  const crmItems = NAV_ITEMS.filter((i) => i.group === 'crm' && visible(i));
  const adminItems = NAV_ITEMS.filter((i) => i.group === 'admin' && visible(i));
  const bottomItems = BOTTOM_ITEMS.filter(visible);

  return (
    <aside className="w-60 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-200">
        <div className="flex items-center gap-2">
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
          <span className="font-semibold text-gray-900 text-sm">Real Estate CRM</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
        {/* Dashboard */}
        {visible(dashboardItem) && <SidebarLink item={dashboardItem} />}

        {/* Inventory */}
        {inventoryItems.length > 0 && (
          <>
            <div className="my-2 border-t border-gray-100" />
            <p className="px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Inventory</p>
            {inventoryItems.map((item) => (
              <SidebarLink key={item.path} item={item} />
            ))}
          </>
        )}

        {/* CRM Workflow */}
        {crmItems.length > 0 && (
          <>
            <div className="my-2 border-t border-gray-100" />
            {crmItems.map((item) => (
              <SidebarLink key={item.path} item={item} />
            ))}
          </>
        )}

        {/* Admin */}
        {adminItems.length > 0 && (
          <>
            <div className="my-2 border-t border-gray-100" />
            {adminItems.map((item) => (
              <SidebarLink key={item.path} item={item} />
            ))}
          </>
        )}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-gray-200 flex flex-col gap-1">
        {bottomItems.map((item) => (
          <SidebarLink key={item.path} item={item} />
        ))}
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors w-full text-left"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
