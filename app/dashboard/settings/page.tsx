'use client';

import { useAuth } from '../../../lib/auth-context';
import { playersApi } from '../../../lib/api';
import { useState } from 'react';

export default function SettingsPage() {
  const { session } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const selectedPlayer = session?.players.find(
    (p) => p.allyCode === session.selectedAllyCode
  );

  if (!selectedPlayer) {
    return null;
  }

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      await playersApi.update(selectedPlayer.allyCode, { mhannApiKey: apiKey });
      setMessage({ type: 'success', text: 'Mhann API key saved successfully!' });
      setApiKey('');
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to save API key' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Mhann API Key Card */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h2 className="text-xl font-semibold mb-2">Mhann API Integration</h2>
        <p className="text-sm text-gray-400 mb-4">
          Configure your Mhann API key to enable automatic data collection features.
        </p>
        <form onSubmit={handleSaveApiKey} className="space-y-4">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium mb-2">
              API Key
            </label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter your Mhann API key"
            />
            <p className="mt-2 text-xs text-gray-500">
              Your API key is stored securely and used only for automated data collection.
            </p>
          </div>
          {message && (
            <div
              className={`p-3 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-900/50 border border-green-700 text-green-200'
                  : 'bg-red-900/50 border border-red-700 text-red-200'
              }`}
            >
              {message.text}
            </div>
          )}
          <button
            type="submit"
            disabled={saving || !apiKey}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
          >
            {saving ? 'Saving...' : 'Save API Key'}
          </button>
        </form>
      </div>
    </div>
  );
}
