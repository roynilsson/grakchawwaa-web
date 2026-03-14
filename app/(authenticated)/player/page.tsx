'use client';

import { useAuth } from '../../../lib/auth-context';
import { getMemberRole } from '../../../lib/api';

export default function Dashboard() {
  const { session } = useAuth();

  if (!session?.selectedAllyCode) {
    return null;
  }

  const selectedPlayer = session.players.find(
    (p) => p.allyCode === session.selectedAllyCode
  );

  if (!selectedPlayer) {
    return null;
  }

  return (
    <div>
      {/* Player Info Card */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Current Player</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-400">Player Name</p>
            <p className="text-lg font-semibold flex items-center gap-2">
              {selectedPlayer.playerName}
              {selectedPlayer.isMain && (
                <span className="px-2 py-1 bg-indigo-600 text-xs font-semibold rounded">
                  MAIN
                </span>
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Ally Code</p>
            <p className="text-lg font-semibold">{selectedPlayer.allyCode}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Role</p>
            <p className="text-lg font-semibold">{getMemberRole(selectedPlayer.memberLevel)}</p>
          </div>
          {selectedPlayer.guildName && (
            <div className="md:col-span-3">
              <p className="text-sm text-gray-400">Guild</p>
              <p className="text-lg font-semibold">{selectedPlayer.guildName}</p>
            </div>
          )}
        </div>
      </div>

      {/* Welcome Card */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
        <h3 className="text-2xl font-semibold mb-4">Welcome to Grakchawwaa!</h3>
        <p className="text-gray-400">
          Use the sidebar to navigate to your warnings, violations, and guild management features.
        </p>
      </div>
    </div>
  );
}
