import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, Settings, LogOut, Shield } from 'lucide-react';

interface HeaderProps {
  onSettingsClick: () => void;
  onAdminToggle?: () => void;
  isAdminView?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onSettingsClick, onAdminToggle, isAdminView }) => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-[#0d1117]/90 backdrop-blur-xl border-b border-slate-700/50 px-4 md:px-8 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
          <Clock className="w-4 h-4 text-cyan-400" />
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">
          OJT<span className="text-cyan-400">ify</span>
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {user?.role === 'admin' && (
          <button
            onClick={onAdminToggle}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
              isAdminView
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">{isAdminView ? 'Admin Panel' : 'Admin'}</span>
          </button>
        )}

        <span className="text-sm text-slate-400 hidden sm:inline">{user?.name}</span>

        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold">
          {user?.name?.charAt(0).toUpperCase()}
        </div>

        <button
          onClick={onSettingsClick}
          className="w-9 h-9 rounded-full border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-600 transition-all"
        >
          <Settings className="w-4 h-4" />
        </button>

        <button
          onClick={logout}
          className="w-9 h-9 rounded-full border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-all"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

export default Header;
