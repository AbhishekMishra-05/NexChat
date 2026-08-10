import { useState } from 'react';
import useContactsStore from '../../store/contactsStore';
import api from '../../api/axios';

const COUNTRY_CODES = [
  { code: '+91', country: '🇮🇳 India' },
  { code: '+1', country: '🇺🇸 USA' },
  { code: '+44', country: '🇬🇧 UK' },
  { code: '+61', country: '🇦🇺 Australia' },
  { code: '+81', country: '🇯🇵 Japan' },
  { code: '+86', country: '🇨🇳 China' },
  { code: '+49', country: '🇩🇪 Germany' },
  { code: '+33', country: '🇫🇷 France' },
  { code: '+7', country: '🇷🇺 Russia' },
  { code: '+55', country: '🇧🇷 Brazil' },
  { code: '+27', country: '🇿🇦 South Africa' },
  { code: '+971', country: '🇦🇪 UAE' },
  { code: '+65', country: '🇸🇬 Singapore' },
  { code: '+92', country: '🇵🇰 Pakistan' },
  { code: '+880', country: '🇧🇩 Bangladesh' },
  { code: '+977', country: '🇳🇵 Nepal' },
  { code: '+94', country: '🇱🇰 Sri Lanka' },
  { code: '+60', country: '🇲🇾 Malaysia' },
  { code: '+62', country: '🇮🇩 Indonesia' },
  { code: '+63', country: '🇵🇭 Philippines' },
];

const AddContactModal = ({ onClose }) => {
  const { saveContact } = useContactsStore();
  const [step, setStep] = useState(1); // 1=enter info, 2=find user, 3=saved
  const [form, setForm] = useState({
    name: '',
    countryCode: '+91',
    phone: '',
  });
  const [foundUser, setFoundUser] = useState(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const fullPhone = form.countryCode + form.phone.replace(/\s/g, '');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleFindUser = async () => {
    if (!form.phone.trim()) {
      setError('Enter a phone number');
      return;
    }
    setSearching(true);
    setError('');
    setFoundUser(null);
    try {
      // Try to find user by phone
      const res = await api.get(
        `/api/users/search-by-phone?phone=${encodeURIComponent(fullPhone)}`
      );
      setFoundUser(res.data);
      setStep(2);
    } catch {
      // No user found with this phone — save as contact anyway
      setStep(2);
    } finally {
      setSearching(false);
    }
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      setError('Contact name is required');
      return;
    }
    saveContact({
      userId: foundUser?.id || null,
      savedName: form.name.trim(),
      username: foundUser?.username || null,
      displayName: foundUser?.displayName || null,
      phone: fullPhone,
      online: foundUser?.online || false,
    });
    setSuccess(true);
    setTimeout(onClose, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center
                    justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl
                      w-full max-w-sm shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4
                        border-b border-gray-800">
          <h2 className="text-white font-semibold text-lg">
            Add Contact
          </h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-800
                       flex items-center justify-center text-gray-400">
            ✕
          </button>
        </div>

        {success ? (
          <div className="px-6 py-10 text-center">
            <div className="text-5xl mb-3">✅</div>
            <p className="text-white font-semibold">Contact Saved!</p>
            <p className="text-gray-400 text-sm mt-1">{form.name}</p>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">

            {/* Contact name */}
            <div>
              <label className="text-xs text-gray-500 uppercase
                                 tracking-wider block mb-1.5">
                Contact Name *
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Aarav Rana"
                autoFocus
                className="w-full bg-gray-800 border border-gray-700
                           rounded-xl px-4 py-3 text-white text-sm
                           placeholder-gray-500 focus:outline-none
                           focus:border-emerald-500 transition-colors"/>
            </div>

            {/* Phone with country code */}
            <div>
              <label className="text-xs text-gray-500 uppercase
                                 tracking-wider block mb-1.5">
                Phone Number
              </label>
              <div className="flex gap-2">
                {/* Country code dropdown */}
                <div className="relative">
                  <select
                    name="countryCode"
                    value={form.countryCode}
                    onChange={handleChange}
                    className="bg-gray-800 border border-gray-700
                               rounded-xl px-3 py-3 text-white text-sm
                               focus:outline-none focus:border-emerald-500
                               appearance-none pr-8 cursor-pointer
                               min-w-24">
                    {COUNTRY_CODES.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2
                                  text-gray-400 pointer-events-none text-xs">
                    ▼
                  </div>
                </div>

                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="98765 43210"
                  type="tel"
                  className="flex-1 bg-gray-800 border border-gray-700
                             rounded-xl px-4 py-3 text-white text-sm
                             placeholder-gray-500 focus:outline-none
                             focus:border-emerald-500 transition-colors"/>
              </div>

              {/* Country name hint */}
              <p className="text-gray-600 text-xs mt-1">
                {COUNTRY_CODES.find(c => c.code === form.countryCode)?.country}
                {form.phone && ` · ${fullPhone}`}
              </p>
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            {/* Found user info */}
            {step === 2 && (
              <div className={`rounded-xl p-3 border ${
                foundUser
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-gray-800 border-gray-700'}`}>
                {foundUser ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-600
                                    flex items-center justify-center
                                    text-white font-bold text-sm">
                      {(foundUser.displayName || foundUser.username || 'U')
                        .charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">
                        {foundUser.displayName}
                      </p>
                      <p className="text-emerald-400 text-xs">
                        ✓ Nexchat user found — @{foundUser.username}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm text-center">
                    📵 Not on Nexchat yet — contact saved anyway
                  </p>
                )}
              </div>
            )}

            {/* Buttons */}
            {step === 1 ? (
              <button
                onClick={handleFindUser}
                disabled={searching || !form.name.trim()}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600
                           text-white font-semibold rounded-xl
                           transition-colors disabled:opacity-40">
                {searching ? 'Searching...' : 'Next →'}
              </button>
            ) : (
              <div className="flex gap-3">
                <button onClick={() => setStep(1)}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600
                             text-white rounded-xl transition-colors text-sm">
                  Back
                </button>
                <button onClick={handleSave}
                  disabled={!form.name.trim()}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600
                             text-white font-semibold rounded-xl
                             transition-colors disabled:opacity-40 text-sm">
                  Save Contact
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AddContactModal;