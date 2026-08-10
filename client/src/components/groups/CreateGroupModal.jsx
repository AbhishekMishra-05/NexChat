import { useState } from 'react';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';
import useChatStore from '../../store/chatStore';

const CreateGroupModal = ({ onClose }) => {
  const { user } = useAuthStore();
  const { addConversation, setActiveConversation,
          setMessages } = useChatStore();
  const [step, setStep] = useState(1); // 1=name, 2=members
  const [groupName, setGroupName] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!searchName.trim()) return;
    setSearching(true);
    setError('');
    try {
      const res = await api.get(
        `/api/users/search-by-name?name=${searchName.trim()}`
      );
      const filtered = res.data.filter(u => u.id !== user.id);
      setSearchResults(filtered);
      if (filtered.length === 0) setError('No users found');
    } catch {
      setError('Search failed');
    } finally {
      setSearching(false);
    }
  };

  const toggleSelect = (person) => {
    const exists = selected.find(s => s.id === person.id);
    if (exists) {
      setSelected(selected.filter(s => s.id !== person.id));
    } else {
      setSelected([...selected, person]);
    }
  };

  const handleCreate = async () => {
    if (!groupName.trim()) return;
    if (selected.length < 1) {
      setError('Add at least 1 member');
      return;
    }
    setCreating(true);
    try {
      const res = await api.post('/api/conversations', {
        type: 'GROUP',
        groupName: groupName.trim(),
        participantIds: selected.map(s => s.id),
      });
      addConversation(res.data);
      setActiveConversation(res.data);
      setMessages([]);
      onClose();
    } catch {
      setError('Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const initials = (name) =>
    (name || 'U').split(' ').map(n => n[0]).join('')
      .toUpperCase().slice(0, 2);

  const avatarColors = [
    'bg-emerald-600', 'bg-blue-600', 'bg-purple-600',
    'bg-orange-600', 'bg-pink-600',
  ];
  const getColor = (name) =>
    avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center
                    justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl
                      w-full max-w-md overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4
                        border-b border-gray-800">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button onClick={() => setStep(1)}
                className="text-gray-400 hover:text-white mr-1">
                ←
              </button>
            )}
            <div>
              <h2 className="text-white font-semibold">
                {step === 1 ? 'New Group' : 'Add Members'}
              </h2>
              <p className="text-gray-500 text-xs">
                Step {step} of 2
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-800
                       flex items-center justify-center
                       text-gray-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-800">
          <div className="h-full bg-emerald-500 transition-all duration-300"
               style={{ width: step === 1 ? '50%' : '100%' }}/>
        </div>

        {/* Step 1 — Group name */}
        {step === 1 && (
          <div className="px-6 py-6">
            {/* Group icon preview */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-20 h-20 rounded-full bg-emerald-600
                              flex items-center justify-center
                              text-white text-3xl font-bold mb-3">
                {groupName.charAt(0).toUpperCase() || '👥'}
              </div>
              <p className="text-gray-400 text-sm">Group Icon</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase
                                   tracking-wider block mb-2">
                  Group Name *
                </label>
                <input
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && groupName.trim()) {
                      setStep(2);
                    }
                  }}
                  placeholder="e.g. Dev Team, Family, Friends..."
                  autoFocus
                  className="w-full bg-gray-800 border border-gray-700
                             rounded-xl px-4 py-3 text-white text-sm
                             placeholder-gray-500 focus:outline-none
                             focus:border-emerald-500 transition-colors"/>
                <p className="text-gray-600 text-xs mt-1">
                  {groupName.length}/50 characters
                </p>
              </div>

              <button
                onClick={() => groupName.trim() && setStep(2)}
                disabled={!groupName.trim()}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600
                           text-white font-semibold rounded-xl
                           transition-colors disabled:opacity-40
                           disabled:cursor-not-allowed">
                Next — Add Members →
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Add members */}
        {step === 2 && (
          <div className="px-6 py-4 space-y-4">

            {/* Group name badge */}
            <div className="flex items-center gap-2 bg-emerald-500/10
                            rounded-xl px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-emerald-600
                              flex items-center justify-center
                              text-white text-sm font-bold">
                {groupName.charAt(0).toUpperCase()}
              </div>
              <span className="text-emerald-400 text-sm font-medium">
                {groupName}
              </span>
            </div>

            {/* Search */}
            <div className="flex gap-2">
              <input
                value={searchName}
                onChange={e => {
                  setSearchName(e.target.value);
                  setError('');
                }}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search people by name..."
                className="flex-1 bg-gray-800 border border-gray-700
                           rounded-xl px-4 py-2.5 text-white text-sm
                           placeholder-gray-500 focus:outline-none
                           focus:border-emerald-500 transition-colors"/>
              <button onClick={handleSearch} disabled={searching}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600
                           text-white text-sm rounded-xl transition-colors
                           disabled:opacity-50 font-medium">
                {searching ? '...' : 'Find'}
              </button>
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            {/* Selected members chips */}
            {selected.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">
                  Selected ({selected.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {selected.map(p => (
                    <div key={p.id}
                      className="flex items-center gap-1.5
                                 bg-emerald-500/20 border border-emerald-500/30
                                 text-emerald-400 px-3 py-1 rounded-full
                                 text-xs">
                      <span>{p.displayName || p.username}</span>
                      <button
                        onClick={() => toggleSelect(p)}
                        className="text-emerald-300 hover:text-white
                                   ml-1 font-bold">
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto
                              rounded-xl border border-gray-700/50">
                {searchResults.map(person => {
                  const isSelected = selected.some(
                    s => s.id === person.id
                  );
                  return (
                    <button key={person.id}
                      onClick={() => toggleSelect(person)}
                      className={`w-full flex items-center gap-3 p-3
                                  transition-colors text-left
                                  ${isSelected
                                    ? 'bg-emerald-500/10'
                                    : 'hover:bg-gray-800'}`}>
                      <div className={`w-10 h-10 rounded-full
                                       ${getColor(person.displayName)}
                                       flex items-center justify-center
                                       text-white text-sm font-bold
                                       flex-shrink-0`}>
                        {initials(person.displayName || person.username)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium
                                      truncate">
                          {person.displayName || person.username}
                        </p>
                        <p className="text-gray-500 text-xs">
                          @{person.username}
                        </p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2
                                       flex items-center justify-center
                                       transition-all flex-shrink-0
                                       ${isSelected
                                         ? 'bg-emerald-500 border-emerald-500'
                                         : 'border-gray-600'}`}>
                        {isSelected && (
                          <svg viewBox="0 0 24 24" fill="currentColor"
                               className="w-3.5 h-3.5 text-white">
                            <path fillRule="evenodd" clipRule="evenodd"
                              d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z"/>
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Create button */}
            <button
              onClick={handleCreate}
              disabled={selected.length < 1 || creating}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600
                         text-white font-semibold rounded-xl transition-all
                         disabled:opacity-40 disabled:cursor-not-allowed
                         hover:scale-[1.02] active:scale-[0.98]">
              {creating
                ? 'Creating group...'
                : `Create "${groupName}" with ${selected.length} member${selected.length !== 1 ? 's' : ''}`
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateGroupModal;