import useStarredStore from '../../store/starredStore';

const StarredMessages = ({ onClose }) => {
  const { starred, unstarMessage } = useStarredStore();

  const fmt = (ts) => new Date(ts).toLocaleString([],
    { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center
                    justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl
                      w-full max-w-md max-h-[80vh] flex flex-col
                      overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4
                        border-b border-gray-800">
          <h2 className="text-white font-semibold">
            ⭐ Starred Messages ({starred.length})
          </h2>
          <button onClick={onClose}
            className="text-gray-400 hover:text-white">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {starred.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-4xl mb-3">⭐</p>
              <p className="text-gray-500 text-sm">
                No starred messages yet
              </p>
              <p className="text-gray-600 text-xs mt-1">
                Tap the ⋮ on any message to star it
              </p>
            </div>
          ) : (
            [...starred].reverse().map(msg => (
              <div key={msg.id}
                className="flex items-start gap-3 p-3 mb-2
                           bg-gray-800 rounded-xl">
                <span className="text-yellow-400 flex-shrink-0 mt-0.5">
                  ⭐
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-emerald-400 text-xs font-medium mb-1">
                    {msg.senderDisplayName || msg.senderUsername}
                  </p>
                  {msg.messageType === 'TEXT' && (
                    <p className="text-white text-sm break-words">
                      {msg.content}
                    </p>
                  )}
                  {msg.messageType === 'IMAGE' && (
                    <img src={msg.content} alt="starred"
                         className="rounded-lg max-h-32 object-cover"/>
                  )}
                  {msg.messageType === 'AUDIO' && (
                    <div className="flex items-center gap-2">
                      <span>🎵</span>
                      <audio controls className="h-8">
                        <source src={msg.content}/>
                      </audio>
                    </div>
                  )}
                  <p className="text-gray-500 text-xs mt-1">
                    {fmt(msg.timestamp)}
                  </p>
                </div>
                <button onClick={() => unstarMessage(msg.id)}
                  className="text-gray-500 hover:text-red-400
                             flex-shrink-0 transition-colors text-sm">
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default StarredMessages;