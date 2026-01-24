'use client';

import { useState } from 'react';

interface FiltersProps {
  onSearchChange: (search: string) => void;
  onDateRangeChange: (days: number | null) => void;
  onCurrentMembersOnlyChange: (value: boolean) => void;
  warningTypes?: { id: number; name: string }[];
  onWarningTypeChange?: (typeId: number | null) => void;
  currentMembersOnly: boolean;
}

const DATE_PRESETS = [
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
  { label: 'All time', value: null },
];

export function Filters({
  onSearchChange,
  onDateRangeChange,
  onCurrentMembersOnlyChange,
  warningTypes,
  onWarningTypeChange,
  currentMembersOnly,
}: FiltersProps) {
  const [search, setSearch] = useState('');
  const [selectedDays, setSelectedDays] = useState<number | null>(30);
  const [selectedType, setSelectedType] = useState<number | null>(null);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onSearchChange(value);
  };

  const handleDateRangeChange = (value: string) => {
    const days = value === '' ? null : parseInt(value);
    setSelectedDays(days);
    onDateRangeChange(days);
  };

  const handleTypeChange = (value: string) => {
    const typeId = value === '' ? null : parseInt(value);
    setSelectedType(typeId);
    onWarningTypeChange?.(typeId);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-4 space-y-4">
      <div className="flex flex-wrap gap-4">
        <input
          type="text"
          placeholder="Search player..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-indigo-500"
        />

        <select
          value={selectedDays ?? ''}
          onChange={(e) => handleDateRangeChange(e.target.value)}
          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-indigo-500"
        >
          {DATE_PRESETS.map((preset) => (
            <option key={preset.label} value={preset.value ?? ''}>
              {preset.label}
            </option>
          ))}
        </select>

        {warningTypes && onWarningTypeChange && (
          <select
            value={selectedType ?? ''}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-indigo-500"
          >
            <option value="">All types</option>
            {warningTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={currentMembersOnly}
          onChange={(e) => onCurrentMembersOnlyChange(e.target.checked)}
          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-sm text-gray-300">Current members only</span>
      </label>
    </div>
  );
}
