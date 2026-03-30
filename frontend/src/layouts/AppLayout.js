import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ChatWidget from '../components/ChatWidget';
import axios from 'axios';
import { LayoutDashboard, Database, Lightbulb, Target, FileText, Settings, LogOut, Menu, X, ChevronRight, Users, ChevronDown, Plus, Check, Code2, Activity } from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { path: '/sources', label: 'Feedback & Data', icon: Database },
  { path: '/insights', label: 'Key Findings', icon: Lightbulb },
  { path: '/opportunities', label: 'Project Ideas', icon: Target },
  { path: '/briefs', label: 'Product Briefs', icon: FileText },
  { path: '/specs', label: 'Developer Docs', icon: Code2 },
  { path: '/activity', label: 'Activity', icon: Activity },
  { path: '/workspace', label: 'Team', icon: Users },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function AppLayout() {
  const { user, logout, switchWorkspace, API } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [wsDropdown, setWsDropdown] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/workspaces`, { withCredentials: true });
        setWorkspaces(res.data);
      } catch {}
    })();
  }, [API, user?.active_workspace_id]);

  const handleLogout = async () => { await logout(); navigate('/login'); };
  const handleSwitch = async (wsId) => { await switchWorkspace(wsId); setWsDropdown(false); };

  const activeWs = user?.workspace;
  const role = user?.workspace_role;

  return (
    <div className="h-screen bg-[#FAFAFA] flex overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ✅ Sidebar FIXED */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-56 h-screen overflow-hidden bg-white border-r border-[#E4E4E7] flex flex-col transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-[#E4E4E7]">
          <span className="font-heading text-3xl font-bold tracking-tight text-[#171717]">Kinesis</span>
          <button
            className="ml-auto lg:hidden text-[#A1A1AA]"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Workspace Switcher */}
        <div className="px-2 py-2 border-b border-[#E4E4E7] relative">
          <button
            data-testid="workspace-switcher"
            onClick={() => setWsDropdown(!wsDropdown)}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-[#F4F4F5] rounded-sm transition-colors"
          >
            <div className="w-5 h-5 bg-[#002FA7]/10 flex items-center justify-center rounded-sm flex-shrink-0">
              <Users className="w-3 h-3 text-[#002FA7]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-mono text-[#171717] truncate font-medium">
                {activeWs?.name || 'Workspace'}
              </p>
              <p className="text-[9px] font-mono text-[#A1A1AA]">
                {role || 'MEMBER'}
              </p>
            </div>
            <ChevronDown className={`w-3 h-3 text-[#A1A1AA] transition-transform ${wsDropdown ? 'rotate-180' : ''}`} />
          </button>

          {wsDropdown && (
            <div className="absolute left-2 right-2 top-full mt-1 bg-white border border-[#E4E4E7] shadow-lg z-50 max-h-60 overflow-auto">
              {workspaces.map(ws => (
                <button
                  key={ws.workspace_id}
                  data-testid={`ws-option-${ws.workspace_id}`}
                  onClick={() => handleSwitch(ws.workspace_id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[#F4F4F5] text-xs font-mono transition-colors"
                >
                  <span className="flex-1 truncate text-[#171717]">{ws.name}</span>
                  <span className="text-[9px] text-[#A1A1AA]">{ws.role}</span>
                  {ws.is_active && <Check className="w-3 h-3 text-[#002FA7]" />}
                </button>
              ))}

              <button
                data-testid="create-workspace-btn"
                onClick={() => { setWsDropdown(false); navigate('/workspace?create=1'); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[#F4F4F5] text-xs font-mono text-[#002FA7] border-t border-[#E4E4E7]"
              >
                <Plus className="w-3 h-3" /> New Workspace
              </button>
            </div>
          )}
        </div>

        {/* ✅ Scroll ONLY here */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              data-testid={`nav-${item.label.toLowerCase()}`}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 text-xs font-mono transition-colors duration-100 rounded-sm ${
                  isActive
                    ? 'bg-[#F4F4F5] text-[#002FA7] border-l-2 border-[#002FA7] font-medium'
                    : 'text-[#71717A] hover:text-[#171717] hover:bg-[#F4F4F5]'
                }`
              }
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-[#E4E4E7] p-3">
          <div className="flex items-center gap-2 mb-2">
            {user?.picture ? (
              <img src={user.picture} alt="" className="w-6 h-6 rounded-full" />
            ) : (
              <div className="w-6 h-6 bg-[#E4E4E7] rounded-full" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono text-[#171717] truncate">{user?.name}</p>
              <p className="text-[10px] font-mono text-[#A1A1AA] truncate">{user?.email}</p>
            </div>
          </div>

          <button
            data-testid="logout-btn"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-mono text-[#A1A1AA] hover:text-red-500 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-[#E4E4E7] flex items-center px-4 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
          <button
            data-testid="mobile-menu-btn"
            className="lg:hidden mr-3 text-[#A1A1AA] hover:text-[#171717]"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1 text-xs font-mono text-[#A1A1AA]">
            <span>{activeWs?.name || 'Kinesis'}</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#171717]">Workspace</span>
          </div>

          {role === 'VIEWER' && (
            <span className="ml-3 text-[9px] font-mono px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-sm">
              View Only
            </span>
          )}
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      <ChatWidget />
    </div>
  );
}