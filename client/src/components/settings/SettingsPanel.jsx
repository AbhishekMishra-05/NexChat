import { useState } from 'react';
import useAuthStore from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

const SettingsPanel = ({ onClose }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState('account');
  const [notifMuted, setNotifMuted] = useState(
    localStorage.getItem('notifMuted') === 'true'
  );
  const [blockedUsers] = useState(
    JSON.parse(localStorage.getItem('blockedUsers') || '[]')
  );

  const toggleNotifications = () => {
    const newVal = !notifMuted;
    localStorage.setItem('notifMuted', newVal);
    setNotifMuted(newVal);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const tabs = [
    { id: 'account', label: '👤 Account' },
    { id: 'privacy', label: '🔒 Privacy' },
    { id: 'notifications', label: '🔔 Notifications' },
    { id: 'blocked', label: '🚫 Blocked' },
  ];

  return (
    <div className="fixed inset-0 z-40 bg-black/60 flex
                    items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700
                      rounded-2xl w-full max-w-md max-h-[85vh]
                      flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between
                        px-6 py-4 border-b border-gray-800">
          <h2 className="text-white font-semibold text-lg">
            Settings
          </h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-800
                       flex items-center justify-center
                       text-gray-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>

        {/* Profile summary */}
        <div className="px-6 py-4 border-b border-gray-800
                        flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-emerald-600
                          flex items-center justify-center
                          text-white text-2xl font-bold">
            {(user?.displayName || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-white font-semibold">
              {user?.displayName}
            </p>
            <p className="text-gray-400 text-sm">
              @{user?.username}
            </p>
            <p className="text-gray-500 text-xs mt-0.5">
              {user?.email}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 py-2 border-b border-gray-800
                        overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs
                          font-medium whitespace-nowrap transition-colors
                          ${tab === t.id
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'text-gray-500 hover:text-gray-300'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {/* Account */}
          {tab === 'account' && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 uppercase
                               tracking-wider mb-3">
                  Account Info
                </p>
                <div className="space-y-3">
                  {[
                    { label: 'Display Name', value: user?.displayName },
                    { label: 'Username', value: `@${user?.username}` },
                    { label: 'Email', value: user?.email },
                  ].map(item => (
                    <div key={item.label}
                      className="flex justify-between items-center
                                 py-2 border-b border-gray-800">
                      <span className="text-gray-400 text-sm">
                        {item.label}
                      </span>
                      <span className="text-white text-sm">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={handleLogout}
                className="w-full py-3 rounded-xl bg-red-500/10
                           hover:bg-red-500/20 text-red-400 text-sm
                           font-medium transition-colors mt-4">
                Sign out
              </button>
            </div>
          )}

          {/* Privacy */}
          {tab === 'privacy' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 uppercase
                             tracking-wider mb-3">
                Privacy
              </p>
              {[
                { label: 'Last Seen', value: 'Everyone' },
                { label: 'Profile Photo', value: 'Everyone' },
                { label: 'Status', value: 'Everyone' },
                { label: 'Read Receipts', value: 'On' },
              ].map(item => (
                <div key={item.label}
                  className="flex justify-between items-center
                             py-3 border-b border-gray-800">
                  <span className="text-white text-sm">{item.label}</span>
                  <span className="text-emerald-400 text-sm">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Notifications */}
          {tab === 'notifications' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 uppercase
                             tracking-wider mb-3">
                Notifications
              </p>
              <div className="flex justify-between items-center
                             py-3 border-b border-gray-800">
                <div>
                  <p className="text-white text-sm">
                    App Notifications
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    Mute all notifications
                  </p>
                </div>
                <button onClick={toggleNotifications}
                  className={`w-12 h-6 rounded-full transition-colors
                              relative ${notifMuted
                                ? 'bg-gray-600'
                                : 'bg-emerald-500'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full
                                   absolute top-0.5 transition-all
                                   ${notifMuted
                                     ? 'left-0.5'
                                     : 'left-6'}`}/>
                </button>
              </div>
            </div>
          )}

          {/* Blocked */}
          {tab === 'blocked' && (
            <div>
              <p className="text-xs text-gray-500 uppercase
                             tracking-wider mb-3">
                Blocked Users
              </p>
              {blockedUsers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-4xl mb-2">🚫</p>
                  <p className="text-gray-500 text-sm">
                    No blocked users
                  </p>
                </div>
              ) : (
                blockedUsers.map(u => (
                  <div key={u.id}
                    className="flex items-center justify-between
                               py-3 border-b border-gray-800">
                    <span className="text-white text-sm">
                      {u.username}
                    </span>
                    <button className="text-emerald-400 text-xs
                                       hover:underline">
                      Unblock
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;