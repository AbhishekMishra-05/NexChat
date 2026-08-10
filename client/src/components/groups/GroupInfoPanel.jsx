import { useState } from 'react';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';
import useChatStore from '../../store/chatStore';

const GroupInfoPanel = ({ conversation, onClose }) => {
  const { user } = useAuthStore();
  const { conversations, setConversations,
          setActiveConversation, setMessages } = useChatStore();
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(conversation.name || '');
  const [searchAdd, setSearchAdd] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [tab, setTab] = useState('members'); // members | media

  const isAdmin = conversation.participants?.[0]?.id === user?.id;

  const handleRename = async () => {
    if (!newName.trim()) return;
    try {
      const res = await api.put(
        `/api/conversations/${conversation.id}/name`,
        { name: newName.trim() }
      );
      setConversations(conversations.map(c =>
        c.id === conversation.id
          ? { ...c, name: newName.trim() }
          : c
      ));
      setActiveConversation({ ...conversation, name: newName.trim() });
      setEditingName(false);
    } catch { console.error('Rename failed'); }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      await api.delete(
        `/api/conversations/${conversation.id}/members/${memberId}`
      );
      setConversations(conversations.map(c =>
        c.id === conversation.id
          ? {
              ...c,
              participants: c.participants.filter(
                p => p.id !== memberId
              )
            }
          : c
      ));
      setActiveConversation({
        ...conversation,
        participants: conversation.participants.filter(
          p => p.id !== memberId
        )
      });
    } catch { console.error('Remove failed'); }
  };

  const handleSearchAdd = async () => {
    if (!searchAdd.trim()) return;
    setSearching(true);
    try {
      const res = await api.get(
        `/api/users/search-by-name?name=${searchAdd.trim()}`
      );
      const existing = conversation.participants.map(p => p.id);
      setSearchResults(
        res.data.filter(u => !existing.includes(u.id))
      );
    } catch {} finally { setSearching(false); }
  };

  const handleAddMember = async (person) => {
    try {
      const res = await api.post(
        `/api/conversations/${conversation.id}/members`,
        { userId: person.id }
      );
      setConversations(conversations.map(c =>
        c.id === conversation.id ? res.data : c
      ));
      setActiveConversation(res.data);
      setSearchResults([]);
      setSearchAdd('');
    } catch { console.error('Add member failed'); }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('Leave this group?')) return;
    try {
      await api.delete(
        `/api/conversations/${conversation.id}/members/${user.id}`
      );
      setConversations(conversations.filter(
        c => c.id !== conversation.id
      ));
      setActiveConversation(null);
      setMessages([]);
      onClose();
    } catch { console.error('Leave failed'); }
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
    <div className="w-80 bg-gray-900 border-l border-gray-800
                    flex flex-col h-full flex-shrink-0">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4
                      border-b border-gray-800">
        <h3 className="text-white font-semibold">Group Info</h3>
        <button onClick={onClose}
          className="w-8 h-8 rounded-full hover:bg-gray-800
                     flex items-center justify-center
                     text-gray-400 hover:text-white transition-colors">
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* Group profile */}
        <div className="px-4 py-6 border-b border-gray-800
                        flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-600
                          flex items-center justify-center
                          text-white text-3xl font-bold mb-3">
            {initials(conversation.name || 'G')}
          </div>

          {/* Editable group name */}
          {editingName ? (
            <div className="flex items-center gap-2 w-full">
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') setEditingName(false);
                }}
                autoFocus
                className="flex-1 bg-gray-800 border border-emerald-500
                           rounded-lg px-3 py-1.5 text-white text-sm
                           focus:outline-none text-center"/>
              <button onClick={handleRename}
                className="text-emerald-400 text-sm hover:text-white">
                ✓
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h4 className="text-white font-semibold text-lg">
                {conversation.name || 'Group Chat'}
              </h4>
              {isAdmin && (
                <button
                  onClick={() => setEditingName(true)}
                  className="text-gray-500 hover:text-gray-300
                             transition-colors">
                  <svg viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth={2}
                       className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"/>
                  </svg>
                </button>
              )}
            </div>
          )}

          <p className="text-gray-400 text-sm mt-1">
            {conversation.participants?.length || 0} members
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          {['members', 'media'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium
                          capitalize transition-colors
                          ${tab === t
                            ? 'text-emerald-400 border-b-2 border-emerald-500'
                            : 'text-gray-500 hover:text-gray-300'}`}>
              {t === 'members'
                ? `👥 Members (${conversation.participants?.length})`
                : '📁 Media'}
            </button>
          ))}
        </div>

        {/* Members tab */}
        {tab === 'members' && (
          <div>
            {/* Add member (admin only) */}
            {isAdmin && (
              <div className="px-4 py-3 border-b border-gray-800">
                <p className="text-xs text-gray-500 mb-2">
                  Add Member
                </p>
                <div className="flex gap-2">
                  <input
                    value={searchAdd}
                    onChange={e => setSearchAdd(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearchAdd()}
                    placeholder="Search by name..."
                    className="flex-1 bg-gray-800 border border-gray-700
                               rounded-xl px-3 py-2 text-white text-xs
                               placeholder-gray-500 focus:outline-none
                               focus:border-emerald-500"/>
                  <button onClick={handleSearchAdd}
                    disabled={searching}
                    className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600
                               text-white text-xs rounded-xl disabled:opacity-50
                               transition-colors">
                    {searching ? '...' : 'Find'}
                  </button>
                </div>

                {searchResults.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-32
                                  overflow-y-auto">
                    {searchResults.map(person => (
                      <button key={person.id}
                        onClick={() => handleAddMember(person)}
                        className="w-full flex items-center gap-2
                                   p-2 hover:bg-gray-800 rounded-lg
                                   text-left transition-colors">
                        <div className={`w-7 h-7 rounded-full
                                         ${getColor(person.displayName)}
                                         flex items-center justify-center
                                         text-white text-xs font-bold
                                         flex-shrink-0`}>
                          {initials(person.displayName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs truncate">
                            {person.displayName}
                          </p>
                        </div>
                        <span className="text-emerald-400 text-xs">
                          + Add
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Members list */}
            <div className="py-2">
              {conversation.participants?.map((member, idx) => (
                <div key={member.id}
                  className="flex items-center gap-3 px-4 py-2.5
                             hover:bg-gray-800/50 transition-colors">
                  <div className="relative flex-shrink-0">
                    <div className={`w-9 h-9 rounded-full
                                     ${getColor(member.displayName)}
                                     flex items-center justify-center
                                     text-white text-sm font-bold`}>
                      {initials(member.displayName || member.username)}
                    </div>
                    {member.online && (
                      <div className="absolute bottom-0 right-0
                                      w-2.5 h-2.5 bg-emerald-400
                                      rounded-full border-2
                                      border-gray-900"/>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white text-sm font-medium
                                    truncate">
                        {member.displayName || member.username}
                        {member.id === user?.id && (
                          <span className="text-gray-500"> (You)</span>
                        )}
                      </p>
                      {idx === 0 && (
                        <span className="text-xs bg-emerald-500/20
                                         text-emerald-400 px-2 py-0.5
                                         rounded-full flex-shrink-0">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs">
                      @{member.username}
                    </p>
                  </div>

                  {/* Remove button (admin only, not self) */}
                  {isAdmin && member.id !== user?.id && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="w-7 h-7 rounded-full hover:bg-red-500/20
                                 flex items-center justify-center
                                 text-gray-500 hover:text-red-400
                                 transition-colors flex-shrink-0">
                      <svg viewBox="0 0 24 24" fill="none"
                           stroke="currentColor" strokeWidth={2}
                           className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Media tab */}
        {tab === 'media' && (
          <div className="p-4">
            <p className="text-gray-500 text-sm text-center py-8">
              📁 Shared media will appear here
            </p>
          </div>
        )}
      </div>

      {/* Leave group button */}
      <div className="px-4 py-4 border-t border-gray-800">
        <button onClick={handleLeaveGroup}
          className="w-full py-2.5 rounded-xl bg-red-500/10
                     hover:bg-red-500/20 text-red-400 text-sm
                     font-medium transition-colors">
          🚪 Leave Group
        </button>
      </div>
    </div>
  );
};

export default GroupInfoPanel;