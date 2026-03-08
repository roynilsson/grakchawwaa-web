'use client';

import { useState, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { guildApi, warningsApi, violationsApi, GuildMember, WarningType } from '../lib/api';

type ImportType = 'violations' | 'warnings';

interface ImportCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: ImportType;
  guildId: string;
  issuedByAllyCode: string;
  onSuccess: () => void;
}

interface ParsedViolation {
  ally_code: string;
  date: string;
  ticket_count: string;
}

interface ParsedWarning {
  ally_code: string;
  warning_type: string;
  date?: string;
  note?: string;
}

interface ValidatedViolation {
  allyCode: string;
  playerName: string;
  playerId: string;
  date: string;
  ticketCount: number;
}

interface ValidatedWarning {
  allyCode: string;
  playerName: string;
  warningTypeId: number;
  warningTypeName: string;
  date?: string;
  note?: string;
}

interface ValidationError {
  row: number;
  message: string;
}

type ParseState = 'idle' | 'parsing' | 'validated' | 'importing';

export function ImportCsvModal({
  isOpen,
  onClose,
  type,
  guildId,
  issuedByAllyCode,
  onSuccess,
}: ImportCsvModalProps) {
  const [state, setState] = useState<ParseState>('idle');
  const [validViolations, setValidViolations] = useState<ValidatedViolation[]>([]);
  const [validWarnings, setValidWarnings] = useState<ValidatedWarning[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [members, setMembers] = useState<GuildMember[]>([]);
  const [warningTypes, setWarningTypes] = useState<WarningType[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setState('idle');
    setValidViolations([]);
    setValidWarnings([]);
    setErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const loadReferenceData = useCallback(async () => {
    const membersRes = await guildApi.getMembers(guildId);
    setMembers(membersRes.members);

    if (type === 'warnings') {
      const typesRes = await warningsApi.getTypes(guildId);
      setWarningTypes(typesRes.warningTypes);
    }

    return membersRes.members;
  }, [guildId, type]);

  const validateViolations = useCallback(
    (rows: ParsedViolation[], memberList: GuildMember[]): { valid: ValidatedViolation[]; errors: ValidationError[] } => {
      const valid: ValidatedViolation[] = [];
      const errs: ValidationError[] = [];
      const memberMap = new Map(memberList.map((m) => [m.allyCode, m]));

      rows.forEach((row, idx) => {
        const rowNum = idx + 2; // +2 for header row and 1-based indexing

        // Validate ally_code
        const allyCode = row.ally_code?.trim();
        if (!allyCode || !/^\d{9}$/.test(allyCode)) {
          errs.push({ row: rowNum, message: `Invalid ally code "${allyCode}" (must be 9 digits)` });
          return;
        }

        const member = memberMap.get(allyCode);
        if (!member) {
          errs.push({ row: rowNum, message: `Unknown ally code "${allyCode}" (not in guild)` });
          return;
        }

        // Validate date
        const date = row.date?.trim();
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          errs.push({ row: rowNum, message: `Invalid date "${date}" (must be YYYY-MM-DD)` });
          return;
        }

        // Validate ticket_count
        const ticketCountStr = row.ticket_count?.trim();
        const ticketCount = parseInt(ticketCountStr, 10);
        if (isNaN(ticketCount) || ticketCount < 0 || ticketCount > 600) {
          errs.push({ row: rowNum, message: `Invalid ticket count "${ticketCountStr}" (must be 0-600)` });
          return;
        }

        valid.push({
          allyCode,
          playerName: member.playerName,
          playerId: allyCode, // Using allyCode as playerId for now
          date,
          ticketCount,
        });
      });

      return { valid, errors: errs };
    },
    []
  );

  const validateWarnings = useCallback(
    (
      rows: ParsedWarning[],
      memberList: GuildMember[],
      typeList: WarningType[]
    ): { valid: ValidatedWarning[]; errors: ValidationError[] } => {
      const valid: ValidatedWarning[] = [];
      const errs: ValidationError[] = [];
      const memberMap = new Map(memberList.map((m) => [m.allyCode, m]));
      const typeMap = new Map(typeList.map((t) => [t.name.toLowerCase(), t]));

      rows.forEach((row, idx) => {
        const rowNum = idx + 2;

        // Validate ally_code
        const allyCode = row.ally_code?.trim();
        if (!allyCode || !/^\d{9}$/.test(allyCode)) {
          errs.push({ row: rowNum, message: `Invalid ally code "${allyCode}" (must be 9 digits)` });
          return;
        }

        const member = memberMap.get(allyCode);
        if (!member) {
          errs.push({ row: rowNum, message: `Unknown ally code "${allyCode}" (not in guild)` });
          return;
        }

        // Validate warning_type
        const warningTypeName = row.warning_type?.trim();
        if (!warningTypeName) {
          errs.push({ row: rowNum, message: 'Missing warning type' });
          return;
        }

        const warningType = typeMap.get(warningTypeName.toLowerCase());
        if (!warningType) {
          errs.push({ row: rowNum, message: `Unknown warning type "${warningTypeName}"` });
          return;
        }

        // Validate date (optional)
        const date = row.date?.trim();
        if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          errs.push({ row: rowNum, message: `Invalid date "${date}" (must be YYYY-MM-DD)` });
          return;
        }

        valid.push({
          allyCode,
          playerName: member.playerName,
          warningTypeId: warningType.id,
          warningTypeName: warningType.name,
          date: date || undefined,
          note: row.note?.trim() || undefined,
        });
      });

      return { valid, errors: errs };
    },
    []
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setState('parsing');
      setErrors([]);

      try {
        // Load reference data first
        const memberList = await loadReferenceData();
        let typeList = warningTypes;
        if (type === 'warnings' && typeList.length === 0) {
          const typesRes = await warningsApi.getTypes(guildId);
          typeList = typesRes.warningTypes;
          setWarningTypes(typeList);
        }

        // Parse CSV
        Papa.parse<ParsedViolation | ParsedWarning>(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors.length > 0) {
              setErrors(
                results.errors.map((err, idx) => ({
                  row: err.row ?? idx + 1,
                  message: err.message,
                }))
              );
              setState('validated');
              return;
            }

            if (type === 'violations') {
              const { valid, errors: validationErrors } = validateViolations(
                results.data as ParsedViolation[],
                memberList
              );
              setValidViolations(valid);
              setErrors(validationErrors);
            } else {
              const { valid, errors: validationErrors } = validateWarnings(
                results.data as ParsedWarning[],
                memberList,
                typeList
              );
              setValidWarnings(valid);
              setErrors(validationErrors);
            }

            setState('validated');
          },
          error: (err) => {
            setErrors([{ row: 0, message: `Failed to parse CSV: ${err.message}` }]);
            setState('validated');
          },
        });
      } catch (err) {
        setErrors([{ row: 0, message: err instanceof Error ? err.message : 'Failed to load data' }]);
        setState('validated');
      }
    },
    [type, guildId, loadReferenceData, validateViolations, validateWarnings, warningTypes]
  );

  const handleImport = useCallback(async () => {
    setState('importing');

    try {
      if (type === 'violations') {
        const violations = validViolations.map((v) => ({
          guildId,
          playerId: v.allyCode,
          date: `${v.date}T00:00:00.000Z`,
          ticketCount: v.ticketCount,
        }));
        const result = await violationsApi.bulkCreate(violations);
        toast.success(`Imported ${result.created} violations (${result.updated} updated)`);
      } else {
        const warnings = validWarnings.map((w) => ({
          guildId,
          allyCode: w.allyCode,
          warningTypeId: w.warningTypeId,
          date: w.date ? `${w.date}T00:00:00.000Z` : undefined,
          note: w.note,
        }));
        const result = await warningsApi.bulkCreate(warnings, issuedByAllyCode);
        toast.success(`Imported ${result.created} warnings`);
      }

      onSuccess();
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
      setState('validated');
    }
  }, [type, guildId, issuedByAllyCode, validViolations, validWarnings, onSuccess, handleClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  const validCount = type === 'violations' ? validViolations.length : validWarnings.length;
  const validItems = type === 'violations' ? validViolations : validWarnings;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleOverlayClick}
    >
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          Import {type === 'violations' ? 'Violations' : 'Warnings'} from CSV
        </h2>

        {state === 'idle' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-file-input"
              />
              <label
                htmlFor="csv-file-input"
                className="cursor-pointer text-gray-400 hover:text-white transition-colors"
              >
                <div className="mb-2">Click to select a CSV file</div>
                <div className="text-sm text-gray-500">
                  {type === 'violations'
                    ? 'Expected format: ally_code,date,ticket_count'
                    : 'Expected format: ally_code,warning_type,date,note'}
                </div>
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {state === 'parsing' && (
          <div className="text-center py-8 text-gray-400">Parsing CSV...</div>
        )}

        {(state === 'validated' || state === 'importing') && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex gap-4">
              {validCount > 0 && (
                <div className="text-green-400">
                  {validCount} valid {validCount === 1 ? 'entry' : 'entries'} ready to import
                </div>
              )}
              {errors.length > 0 && (
                <div className="text-red-400">
                  {errors.length} {errors.length === 1 ? 'error' : 'errors'} (will be skipped)
                </div>
              )}
            </div>

            {/* Preview table */}
            {validCount > 0 && (
              <div className="bg-gray-700 rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-gray-600 font-semibold text-sm">Preview</div>
                <div className="overflow-x-auto max-h-48">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-600">
                      <tr>
                        <th className="px-3 py-2 text-left">Player</th>
                        {type === 'violations' ? (
                          <>
                            <th className="px-3 py-2 text-left">Date</th>
                            <th className="px-3 py-2 text-left">Tickets</th>
                          </>
                        ) : (
                          <>
                            <th className="px-3 py-2 text-left">Type</th>
                            <th className="px-3 py-2 text-left">Date</th>
                            <th className="px-3 py-2 text-left">Note</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-600">
                      {validItems.slice(0, 10).map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2">
                            {'playerName' in item ? item.playerName : ''}
                          </td>
                          {type === 'violations' && 'ticketCount' in item && (
                            <>
                              <td className="px-3 py-2">{item.date}</td>
                              <td className="px-3 py-2">{item.ticketCount}</td>
                            </>
                          )}
                          {type === 'warnings' && 'warningTypeName' in item && (
                            <>
                              <td className="px-3 py-2">{item.warningTypeName}</td>
                              <td className="px-3 py-2">{item.date || '-'}</td>
                              <td className="px-3 py-2 max-w-xs truncate">{item.note || '-'}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {validCount > 10 && (
                  <div className="px-4 py-2 text-sm text-gray-400">
                    ...and {validCount - 10} more
                  </div>
                )}
              </div>
            )}

            {/* Errors */}
            {errors.length > 0 && (
              <div className="bg-gray-700 rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-red-900/50 font-semibold text-sm text-red-400">
                  Errors
                </div>
                <ul className="px-4 py-2 text-sm text-red-300 max-h-32 overflow-y-auto">
                  {errors.slice(0, 10).map((err, idx) => (
                    <li key={idx}>
                      Row {err.row}: {err.message}
                    </li>
                  ))}
                  {errors.length > 10 && (
                    <li className="text-gray-400">...and {errors.length - 10} more errors</li>
                  )}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={reset}
                disabled={state === 'importing'}
                className="px-4 py-2 text-gray-400 hover:text-white disabled:opacity-50 transition-colors"
              >
                Choose different file
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={state === 'importing'}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={state === 'importing' || validCount === 0}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors font-semibold"
                >
                  {state === 'importing' ? 'Importing...' : `Import ${validCount} ${validCount === 1 ? 'entry' : 'entries'}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
