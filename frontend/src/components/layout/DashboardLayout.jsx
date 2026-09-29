import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Upload,
  FileText,
  CreditCard,
  Settings,
  LogOut,
  TrendingUp,
  Bell,
  Sun,
  Moon,
  Crown,
  Menu,
  X,
  HelpCircle,
  ShieldCheck,
  ChevronRight,
  Building2,
  Receipt,
  Users,
} from 'lucide-react';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Functional Dark Mode State - Default to false (Clean Light Mode)
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('payroll_theme_v2');
    if (saved) return saved === 'dark';
    // Clear old theme key that auto-locked to dark
    localStorage.removeItem('payroll_theme');
    return false; // Default to Light Mode
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('payroll_theme_v2', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('payroll_theme_v2', 'light');
      localStorage.removeItem('payroll_theme');
    }
  }, [isDark]);

  const toggleDarkMode = () => {
    // Disable all CSS transitions momentarily so all letters and backgrounds switch simultaneously
    const css = document.createElement('style');
    css.appendChild(
      document.createTextNode(
        `*, *::before, *::after {
          -webkit-transition: none !important;
          -moz-transition: none !important;
          -o-transition: none !important;
          -ms-transition: none !important;
          transition: none !important;
        }`
      )
    );
    document.head.appendChild(css);

    setIsDark((prev) => !prev);

    // Force style recalculation then restore transitions for hover interactions
    window.getComputedStyle(document.body);
    setTimeout(() => {
      if (document.head.contains(css)) {
        document.head.removeChild(css);
      }
    }, 50);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const currentPlan = user?.subscription?.plan || 'starter';
  const isStarter = currentPlan === 'starter';
  const trialDaysRemaining = user?.trialInfo?.daysRemaining;
  const isTrialExpired = user?.trialInfo?.isExpired;

  // Active page title helper
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/dashboard')) return user?.role === 'admin' ? 'Admin Dashboard' : 'Dashboard Overview';
    if (path.includes('/upload')) return 'Upload Payroll Batch';
    if (path.includes('/payroll/')) return 'Payroll Statement';
    if (path.includes('/payroll')) return 'Payroll Records';
    if (path.includes('/subscription')) return 'Subscription & Plans';
    if (path.includes('/settings')) return 'Settings';
    if (path.includes('/admin/users')) return 'Admin — User Management';
    if (path.includes('/admin/payments')) return 'Admin — Payment Management';
    if (path.includes('/admin/accounts') || path.includes('/admin/companies')) return 'Admin — Account Management';
    if (path.includes('/admin')) return 'Admin Dashboard';
    return 'PayrollPro';
  };

  const NavItem = ({ to, icon: Icon, label, badge, isSubItem = false }) => (
    <NavLink
      to={to}
      onClick={() => setMobileMenuOpen(false)}
      className={({ isActive }) =>
        `flex items-center justify-between px-3 ${
          isSubItem ? 'py-1.5 text-xs pl-7' : 'py-2 rounded-xl font-medium text-xs'
        } transition ${
          isActive
            ? isSubItem
              ? 'text-blue-600 dark:text-blue-400 font-semibold bg-blue-50/60 dark:bg-blue-900/30 rounded-lg'
              : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold'
            : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-100 rounded-xl'
        }`
      }
    >
      <div className="flex items-center space-x-2.5">
        <Icon className="w-3.5 h-3.5 text-current flex-shrink-0" />
        <span>{label}</span>
      </div>
      {badge && (
        <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-semibold">
          {badge}
        </span>
      )}
    </NavLink>
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full justify-between bg-white dark:bg-slate-900">
      <div>
        {/* Logo Area */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-gray-100 dark:border-slate-800">
          <div
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-2 cursor-pointer"
          >
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm shadow-blue-200">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <span className="text-base font-bold tracking-tight text-gray-900 dark:text-slate-100">
              Payroll<span className="text-blue-600">Pro</span>
            </span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="px-3 py-4 space-y-4">
          {/* Payroll nav is hidden for admins — they use the Admin Panel below */}
          {user?.role !== 'admin' && (
            <>
              <div>
                <div className="space-y-0.5">
                  <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
                  <NavItem to="/upload" icon={Upload} label="Upload Payroll" />
                  <NavItem to="/payroll" icon={FileText} label="Payroll Records" />
                </div>
              </div>

              <div>
                <span className="px-2.5 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                  Finances &amp; Plans
                </span>
                <div className="mt-1 space-y-0.5">
                  <NavItem to="/subscription" icon={CreditCard} label="Subscription" isSubItem />
                  <NavItem to="/settings" icon={ShieldCheck} label="Account Info" isSubItem />
                </div>
              </div>
            </>
          )}

          {/* Admin section — only for admins */}
          {user?.role === 'admin' && (
            <div>
              <span className="px-2.5 text-[10px] font-bold text-rose-400 dark:text-rose-500 uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Admin Panel
              </span>
              <div className="mt-1 space-y-0.5">
                <NavItem to="/admin" icon={ShieldCheck} label="Admin Dashboard" isSubItem />
                <NavItem to="/admin/users" icon={Users} label="User Management" isSubItem />
                <NavItem to="/admin/accounts" icon={Building2} label="Account Management" isSubItem />
                <NavItem to="/admin/payments" icon={Receipt} label="Payment Management" isSubItem />
              </div>
            </div>
          )}

          <div>
            <span className="px-2.5 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
              Settings &amp; Help
            </span>
            <div className="mt-1 space-y-0.5">
              <NavItem to="/settings" icon={Settings} label="Settings" />
              <button
                type="button"
                onClick={toggleDarkMode}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 text-xs font-medium transition cursor-pointer"
              >
                <div className="flex items-center space-x-2.5">
                  {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-500" />}
                  <span>Theme</span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300">
                  {isDark ? 'Dark' : 'Light'}
                </span>
              </button>
              <a
                href="#help"
                onClick={(e) => {
                  e.preventDefault();
                  alert('PayrollPro Support: For assistance, please email support@payrollpro.com');
                }}
                className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 text-xs font-medium transition"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Help &amp; Support</span>
              </a>
            </div>
          </div>
        </nav>
      </div>

      {/* Sidebar Footer / Premium Upgrade Banner */}
      <div className="p-3 border-t border-gray-100 dark:border-slate-800 space-y-3">
        {/* User Quick Switch */}
        <div className="flex items-center justify-between px-2 text-[11px] text-gray-500 dark:text-slate-400">
          <span className="truncate max-w-[120px] font-medium text-gray-700 dark:text-slate-300">
            {user?.companyName || 'My Company'}
          </span>
          <button
            onClick={handleLogout}
            className="text-gray-400 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1 transition"
            title="Sign Out"
          >
            <LogOut className="w-3 h-3" />
            <span>Sign out</span>
          </button>
        </div>

        {/* Premium Upgrade Banner — hidden for admins */}
        {user?.role !== 'admin' && (
          <div className="relative bg-gradient-to-b from-blue-700 to-blue-900 rounded-xl p-3.5 text-white overflow-hidden shadow-md">
          <div className="absolute -right-3 -bottom-3 w-20 h-20 bg-blue-600 rounded-full opacity-50 blur-xl pointer-events-none"></div>
          <div className="relative z-10">
            <div className="w-7 h-7 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center mb-2 text-amber-300">
              <Crown className="w-3.5 h-3.5" />
            </div>
            <h4 className="font-bold text-xs mb-0.5">
              {isStarter ? 'Upgrade to Premium!' : `${currentPlan.toUpperCase()} Plan`}
            </h4>
            <p className="text-[11px] text-blue-200 mb-2.5 leading-relaxed">
              {isStarter
                ? isTrialExpired
                  ? '7-day trial ended. Upgrade to continue.'
                  : `${trialDaysRemaining ?? 7}d left in trial. Unlock unlimited capacity.`
                : 'Account active with premium features.'}
            </p>
            <button
              onClick={() => navigate('/subscription')}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px] py-1.5 rounded-lg transition shadow-sm"
            >
              {isStarter ? 'Upgrade premium' : 'Manage plan'}
            </button>
          </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-950 text-gray-800 dark:text-slate-100 antialiased font-sans">
      {/* Desktop Sidebar */}
      <aside className="w-60 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 flex-col justify-between hidden md:flex z-20 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-60 flex-shrink-0 shadow-2xl">
            <SidebarContent />
          </div>
          <div
            className="flex-1 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
        </div>
      )}

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header without Search Bar */}
        <header className="h-14 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-7 z-10 flex-shrink-0">
          {/* Left: Mobile Menu + Breadcrumb/Page Title */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 p-1 rounded-lg"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2 text-xs">
              <span className="font-semibold text-gray-900 dark:text-slate-100">
                {getPageTitle()}
              </span>
              <span className="text-gray-300 dark:text-slate-700 hidden sm:inline">•</span>
              <span className="text-gray-500 dark:text-slate-400 hidden sm:inline font-medium">
                {user?.companyName}
              </span>
            </div>
          </div>

          {/* Right: Controls & Dark Mode Toggle & User Profile */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* New Payroll — hidden for admins */}
            {user?.role !== 'admin' && (
              <button
                onClick={() => navigate('/upload')}
                className="hidden lg:flex items-center space-x-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-3 py-1.5 rounded-xl transition"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>New Payroll</span>
              </button>
            )}

            {/* Active Dark Mode Toggle Button */}
            <button
              type="button"
              onClick={toggleDarkMode}
              className="w-8 h-8 rounded-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-600 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition cursor-pointer"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-slate-600" />
              )}
            </button>

            {/* Notifications */}
            <button
              onClick={() => navigate('/subscription')}
              className="w-8 h-8 rounded-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-600 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition relative"
              title="Subscription Alerts"
            >
              {isStarter && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              )}
              <Bell className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400" />
            </button>

            <div className="h-5 w-px bg-gray-200 dark:bg-slate-800 hidden sm:block"></div>

            {/* User Avatar */}
            <div
              onClick={() => navigate('/settings')}
              className="flex items-center space-x-2 cursor-pointer hover:opacity-85 transition"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-semibold flex items-center justify-center text-xs shadow-sm shadow-blue-200 border border-white dark:border-slate-800">
                {user?.companyName ? user.companyName.substring(0, 2).toUpperCase() : 'CO'}
              </div>
              <div className="hidden xl:block text-left">
                <p className="text-xs font-semibold text-gray-900 dark:text-slate-100 leading-tight truncate max-w-[120px]">
                  {user?.companyName || 'Company'}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-slate-500 capitalize">
                  {user?.subscription?.plan || 'Starter'}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Dashboard View */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6 bg-gray-50 dark:bg-slate-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
