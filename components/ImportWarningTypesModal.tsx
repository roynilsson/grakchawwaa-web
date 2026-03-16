'use client';

import { useState, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { warningsApi, WarningType, WarningCategory } from '../lib/api';

interface ImportWarningTypesModalProps {
  isOpen: boolean;
  onClose: () => void;
  guildId: string;
  existingTypes: WarningType[];
  existingCategories: WarningCategory[];
  onSuccess: () => void;
}

interface ParsedWarningType {
  name: string;
  severity: string;
  category?: string;
  description?: string;
}

interface ValidatedWarningType {
  name: string;
  severity: number;
  category?: string;
  description?: string;
}

interface ValidationError {
  row: number;
  message: string;
}

type ParseState = 'idle' | 'parsing' | 'validated' | 'importing';

export function ImportWarningTypesModal({
  isOpen,
  onClose,
  guildId,
  existingTypes,
  existingCategories,
  onSuccess,
}: ImportWarningTypesModalProps) {
  const [state, setState] = useState<ParseState>('idle');
  const [validTypes, setValidTypes] = useState<ValidatedWarningType[]>([]);
  const [skippedTypes, setSkippedTypes] = useState<string[]>([]);
  const [newCategories, setNewCategories] = useState<string[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setState('idle');
    setValidTypes([]);
    setSkippedTypes([]);
    setNewCategories([]);
    setErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const validateWarningTypes = useCallback(
    (
      rows: ParsedWarningType[]
    ): {
      valid: ValidatedWarningType[];
      skipped: string[];
      newCategories: string[];
      errors: ValidationError[];
    } => {
      const valid: ValidatedWarningType[] = [];
      const skipped: string[] = [];
      const errs: ValidationError[] = [];

      const existingNames = new Set(existingTypes.map((t) => t.name.toLowerCase()));
      const existingCategoryNames = new Set(existingCategories.map((c) => c.name.toLowerCase()));
      const newCategorySet = new Set<string>();
      const seenNames = new Set<string>();

      rows.forEach((row, idx) => {
        const rowNum = idx + 2; // +2 for header row and 1-based indexing

        // Validate name
        const name = row.name?.trim();
        if (!name) {
          errs.push({ row: rowNum, message: 'Missing name' });
          return;
        }
        if (name.length > 100) {
          errs.push({ row: rowNum, message: `Name too long: "${name.slice(0, 20)}..." (max 100 chars)` });
          return;
        }

        // Check for duplicates (existing or within batch)
        const nameLower = name.toLowerCase();
        if (existingNames.has(nameLower)) {
          skipped.push(name);
          return;
        }
        if (seenNames.has(nameLower)) {
          errs.push({ row: rowNum, message: `Duplicate name in file: "${name}"` });
          return;
        }

        // Validate severity
        const severityStr = row.severity?.trim();
        const severity = parseInt(severityStr, 10);
        if (isNaN(severity) || severity < 1 || severity > 10) {
          errs.push({ row: rowNum, message: `Invalid severity "${severityStr}" (must be 1-10)` });
          return;
        }

        // Validate category (optional)
        const category = row.category?.trim() || undefined;
        if (category && category.length > 50) {
          errs.push({ row: rowNum, message: `Category name too long: "${category.slice(0, 20)}..." (max 50 chars)` });
          return;
        }

        // Track new categories
        if (category && !existingCategoryNames.has(category.toLowerCase())) {
          newCategorySet.add(category);
        }

        const description = row.description?.trim() || undefined;

        valid.push({ name, severity, category, description });
        seenNames.add(nameLower);
      });

      return {
        valid,
        skipped,
        newCategories: Array.from(newCategorySet),
        errors: errs,
      };
    },
    [existingTypes, existingCategories]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setState('parsing');
      setErrors([]);

      // Parse CSV with auto-detect delimiter
      Papa.parse<ParsedWarningType>(file, {
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

          const { valid, skipped, newCategories: newCats, errors: validationErrors } = validateWarningTypes(
            results.data
          );
          setValidTypes(valid);
          setSkippedTypes(skipped);
          setNewCategories(newCats);
          setErrors(validationErrors);
          setState('validated');
        },
        error: (err) => {
          setErrors([{ row: 0, message: `Failed to parse CSV: ${err.message}` }]);
          setState('validated');
        },
      });
    },
    [validateWarningTypes]
  );

  const handleImport = useCallback(async () => {
    setState('importing');

    try {
      const result = await warningsApi.bulkCreateTypes(guildId, validTypes);

      const messages: string[] = [];
      if (result.created > 0) {
        messages.push(`${result.created} warning type${result.created === 1 ? '' : 's'} created`);
      }
      if (result.categoriesCreated > 0) {
        messages.push(`${result.categoriesCreated} categor${result.categoriesCreated === 1 ? 'y' : 'ies'} created`);
      }
      if (result.skipped > 0) {
        messages.push(`${result.skipped} skipped`);
      }

      toast.success(messages.join(', '));
      onSuccess();
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
      setState('validated');
    }
  }, [guildId, validTypes, onSuccess, handleClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={handleOverlayClick}
    >
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Import Warning Types from CSV</h2>

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
                  Expected format: name;severity;category;description
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
            <div className="flex flex-wrap gap-4">
              {validTypes.length > 0 && (
                <div className="text-green-400">
                  {validTypes.length} warning type{validTypes.length === 1 ? '' : 's'} ready to import
                </div>
              )}
              {skippedTypes.length > 0 && (
                <div className="text-yellow-400">
                  {skippedTypes.length} will be skipped (already exist)
                </div>
              )}
              {errors.length > 0 && (
                <div className="text-red-400">
                  {errors.length} error{errors.length === 1 ? '' : 's'}
                </div>
              )}
            </div>

            {/* New categories notice */}
            {newCategories.length > 0 && (
              <div className="bg-indigo-900/30 border border-indigo-700 rounded-lg p-3">
                <div className="text-indigo-300 text-sm font-medium mb-1">
                  + {newCategories.length} new categor{newCategories.length === 1 ? 'y' : 'ies'} will be created:
                </div>
                <div className="flex flex-wrap gap-2">
                  {newCategories.map((cat) => (
                    <span key={cat} className="px-2 py-0.5 bg-indigo-800 rounded text-sm">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Preview table */}
            {validTypes.length > 0 && (
              <div className="bg-gray-700 rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-gray-600 font-semibold text-sm">Preview</div>
                <div className="overflow-x-auto max-h-48">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-600">
                      <tr>
                        <th className="px-3 py-2 text-left">Name</th>
                        <th className="px-3 py-2 text-left">Severity</th>
                        <th className="px-3 py-2 text-left">Category</th>
                        <th className="px-3 py-2 text-left">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-600">
                      {validTypes.slice(0, 10).map((type, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2">{type.name}</td>
                          <td className="px-3 py-2">{type.severity}</td>
                          <td className="px-3 py-2 text-gray-400">{type.category || '-'}</td>
                          <td className="px-3 py-2 text-gray-400 max-w-xs truncate">
                            {type.description || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {validTypes.length > 10 && (
                  <div className="px-4 py-2 text-sm text-gray-400">
                    ...and {validTypes.length - 10} more
                  </div>
                )}
              </div>
            )}

            {/* Skipped types */}
            {skippedTypes.length > 0 && (
              <div className="bg-gray-700 rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-yellow-900/50 font-semibold text-sm text-yellow-400">
                  Skipped (already exist)
                </div>
                <ul className="px-4 py-2 text-sm text-yellow-300 max-h-24 overflow-y-auto">
                  {skippedTypes.slice(0, 5).map((name, idx) => (
                    <li key={idx}>{name}</li>
                  ))}
                  {skippedTypes.length > 5 && (
                    <li className="text-gray-400">...and {skippedTypes.length - 5} more</li>
                  )}
                </ul>
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
                  disabled={state === 'importing' || validTypes.length === 0}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors font-semibold"
                >
                  {state === 'importing'
                    ? 'Importing...'
                    : `Import ${validTypes.length} type${validTypes.length === 1 ? '' : 's'}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
