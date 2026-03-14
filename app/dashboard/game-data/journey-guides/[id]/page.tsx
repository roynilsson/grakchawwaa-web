'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { journeyGuidesApi, JourneyGuide, JourneyGuideType, JourneyRequirement, NestedRequirementData, getUnitThumbnail } from '../../../../../lib/api';

// Type display configuration
const TYPE_CONFIG: Record<JourneyGuideType, { label: string; color: string }> = {
  galactic_legend: { label: 'Galactic Legend', color: 'bg-yellow-600 text-yellow-100' },
  fleet_mastery: { label: 'Fleet Mastery', color: 'bg-cyan-600 text-cyan-100' },
  epic: { label: 'Epic Confrontation', color: 'bg-purple-600 text-purple-100' },
  journey: { label: 'Journey', color: 'bg-green-600 text-green-100' },
  legendary: { label: 'Legendary', color: 'bg-orange-600 text-orange-100' },
  progression: { label: 'Progression', color: 'bg-gray-600 text-gray-100' },
  raid: { label: 'Raid Reward', color: 'bg-red-600 text-red-100' },
  territory_battle: { label: 'Territory Battle', color: 'bg-teal-600 text-teal-100' },
  other: { label: 'Other', color: 'bg-gray-600 text-gray-200' },
};

export default function JourneyGuideDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const [guide, setGuide] = useState<JourneyGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGuide = async () => {
      if (!id || isNaN(id)) return;

      setLoading(true);
      setError(null);

      try {
        const res = await journeyGuidesApi.get(id);
        setGuide(res.journeyGuide);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load journey guide');
      } finally {
        setLoading(false);
      }
    };

    fetchGuide();
  }, [id]);

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error || !guide) {
    return <div className="text-center py-8 text-red-500">{error || 'Journey guide not found'}</div>;
  }

  const unit = guide.character || guide.ship;
  const isShip = !!guide.ship;
  const typeConfig = TYPE_CONFIG[guide.type];

  const getRequirementBadges = (req: JourneyRequirement) => {
    const badges: { label: string; color: string }[] = [];

    if (req.minimumStars) {
      badges.push({ label: `${req.minimumStars}*`, color: 'bg-yellow-600 text-yellow-100' });
    }
    if (req.minimumGearLevel) {
      badges.push({ label: `G${req.minimumGearLevel}`, color: 'bg-orange-600 text-orange-100' });
    }
    if (req.minimumRelicLevel !== null && req.minimumRelicLevel !== undefined) {
      badges.push({ label: `R${req.minimumRelicLevel}`, color: 'bg-red-600 text-red-100' });
    }

    return badges;
  };

  // Build expanded requirements list - category requirements become multiple cards
  interface ExpandedRequirement {
    id: string;
    name: string;
    thumbnailName?: string;
    baseId?: string;
    isShip: boolean;
    isCategory: boolean;
    badges: { label: string; color: string }[];
    isDuplicate: boolean;
  }

  // Helper to expand requirements into cards
  const expandRequirements = (
    requirements: (JourneyRequirement | NestedRequirementData)[],
    seenBaseIds: Set<string>
  ): ExpandedRequirement[] => {
    const expanded: ExpandedRequirement[] = [];

    for (const req of requirements) {
      const badges = getRequirementBadges(req);
      const isDuplicate = 'isDuplicate' in req ? req.isDuplicate : false;

      if (req.requiredCharacter) {
        const alreadySeen = seenBaseIds.has(req.requiredCharacter.baseId);
        expanded.push({
          id: `char-${req.id}`,
          name: req.requiredCharacter.name,
          thumbnailName: req.requiredCharacter.thumbnailName,
          baseId: req.requiredCharacter.baseId,
          isShip: false,
          isCategory: false,
          badges,
          isDuplicate: isDuplicate || alreadySeen,
        });
        seenBaseIds.add(req.requiredCharacter.baseId);
      } else if (req.requiredShip) {
        const alreadySeen = seenBaseIds.has(req.requiredShip.baseId);
        expanded.push({
          id: `ship-${req.id}`,
          name: req.requiredShip.name,
          thumbnailName: req.requiredShip.thumbnailName,
          baseId: req.requiredShip.baseId,
          isShip: true,
          isCategory: false,
          badges,
          isDuplicate: isDuplicate || alreadySeen,
        });
        seenBaseIds.add(req.requiredShip.baseId);
      } else if (req.requiredCategory) {
        const count = req.minimumCount ?? 1;
        const categoryName = req.isShipRequirement
          ? `${req.requiredCategory.name} ${count > 1 ? 'Ships' : 'Ship'}`
          : req.requiredCategory.name;
        for (let i = 0; i < count; i++) {
          expanded.push({
            id: `cat-${req.id}-${i}`,
            name: categoryName,
            isShip: req.isShipRequirement,
            isCategory: true,
            badges,
            isDuplicate: false,
          });
        }
      }
    }

    return expanded;
  };

  // Track seen baseIds across all tiers
  const seenBaseIds = new Set<string>();

  // Expand tier 1 (direct) requirements
  const expandedRequirements = expandRequirements(guide.requirements, seenBaseIds);

  // Expand nested tiers
  const expandedTiers = (guide.nestedRequirements || []).map(tier => ({
    tier: tier.tier,
    sourceGuide: tier.sourceGuide,
    requirements: expandRequirements(tier.requirements, seenBaseIds),
  }));

  const RequirementCard = ({ req }: { req: ExpandedRequirement }) => (
    <div
      className={`bg-gray-750 rounded-lg p-3 border border-gray-600 flex flex-col items-center text-center ${
        req.isDuplicate ? 'opacity-50' : ''
      }`}
    >
      {req.isCategory ? (
        <div className="w-12 h-12 rounded bg-gray-600 flex items-center justify-center mb-2">
          <span className="text-gray-400 text-lg">?</span>
        </div>
      ) : (
        <Link href={`/dashboard/game-data/${req.isShip ? 'ships' : 'characters'}/${req.baseId}`}>
          <img
            src={getUnitThumbnail(req.thumbnailName!)}
            alt={req.name}
            className="w-12 h-12 rounded hover:ring-2 hover:ring-indigo-500 mb-2"
            loading="lazy"
          />
        </Link>
      )}
      <div className="flex-1 min-w-0 w-full">
        {req.isCategory ? (
          <span className="font-medium text-xs text-gray-300 block truncate">{req.name}</span>
        ) : (
          <Link
            href={`/dashboard/game-data/${req.isShip ? 'ships' : 'characters'}/${req.baseId}`}
            className="font-medium text-xs hover:text-indigo-400 block truncate"
          >
            {req.name}
          </Link>
        )}
      </div>
      {req.badges.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1 mt-2">
          {req.badges.map((badge, idx) => (
            <span key={idx} className={`px-1.5 py-0.5 text-xs rounded ${badge.color}`}>
              {badge.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div>
      {/* Back link */}
      <Link
        href="/dashboard/game-data/journey-guides"
        className="inline-flex items-center text-sm text-indigo-400 hover:text-indigo-300 mb-6"
      >
        &larr; Back to Journey Guides
      </Link>

      {/* Header */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
        <div className="flex items-start gap-6">
          {unit && (
            <img
              src={getUnitThumbnail(unit.thumbnailName)}
              alt={unit.name}
              className="w-24 h-24 rounded-lg"
            />
          )}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{guide.title}</h1>
              <span className={`px-2 py-1 text-sm rounded font-semibold ${typeConfig.color}`}>
                {typeConfig.label}
              </span>
              {isShip && (
                <span className="px-2 py-1 text-sm rounded bg-blue-600 text-blue-100 font-semibold">
                  Ship
                </span>
              )}
            </div>
            {unit && (
              <p className="text-gray-400">
                Unlocks:{' '}
                <Link
                  href={`/dashboard/game-data/${isShip ? 'ships' : 'characters'}/${unit.baseId}`}
                  className="text-indigo-400 hover:text-indigo-300"
                >
                  {unit.name}
                </Link>
              </p>
            )}
            <p className="text-gray-500 text-sm mt-2">
              {guide.requirementsCount} requirement{guide.requirementsCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Requirements */}
      {expandedRequirements.length > 0 && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-lg font-semibold mb-4">Requirements</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {expandedRequirements.map(req => (
              <RequirementCard key={req.id} req={req} />
            ))}
          </div>
        </div>
      )}

      {/* Nested Requirements Tiers */}
      {expandedTiers.map(tier => (
        <div key={`tier-${tier.tier}-${tier.sourceGuide.id}`} className="bg-gray-800 rounded-lg border border-gray-700 p-6 mt-6">
          <h2 className="text-lg font-semibold mb-2">
            Additional Requirements
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            From:{' '}
            <Link
              href={`/dashboard/game-data/journey-guides/${tier.sourceGuide.id}`}
              className="text-indigo-400 hover:text-indigo-300"
            >
              {tier.sourceGuide.character?.name || tier.sourceGuide.ship?.name || tier.sourceGuide.title}
            </Link>
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {tier.requirements.map(req => (
              <RequirementCard key={req.id} req={req} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
