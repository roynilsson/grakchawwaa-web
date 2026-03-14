'use client';

import { useAuth } from '../../../../lib/auth-context';
import { warningsApi, warningCategoriesApi, WarningType, WarningCategory } from '../../../../lib/api';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type FormMode = 'none' | 'add' | 'edit';

interface FormData {
  name: string;
  severity: number;
  categoryId: number | null;
  description: string;
}

const SEVERITY_OPTIONS = [
  { value: 1, label: '1 - Minor' },
  { value: 2, label: '2 - Minor' },
  { value: 3, label: '3 - Minor' },
  { value: 4, label: '4 - Moderate' },
  { value: 5, label: '5 - Moderate' },
  { value: 6, label: '6 - Moderate' },
  { value: 7, label: '7 - Major' },
  { value: 8, label: '8 - Major' },
  { value: 9, label: '9 - Major' },
  { value: 10, label: '10 - Critical' },
];

export default function WarningTypesPage() {
  const { session } = useAuth();
  const router = useRouter();
  const [warningTypes, setWarningTypes] = useState<WarningType[]>([]);
  const [categories, setCategories] = useState<WarningCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>('none');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>({ name: '', severity: 5, categoryId: null, description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [addingCategory, setAddingCategory] = useState(false);

  const selectedPlayer = session?.players.find(
    (p) => p.allyCode === session.selectedAllyCode
  );

  // Check officer permission
  useEffect(() => {
    if (selectedPlayer && selectedPlayer.memberLevel < 3 && !selectedPlayer.isAdmin) {
      router.push('/player');
    }
  }, [selectedPlayer, router]);

  const fetchCategories = useCallback(async () => {
    if (!selectedPlayer) return;
    try {
      const res = await warningCategoriesApi.list(selectedPlayer.guildId);
      setCategories(res.categories);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }, [selectedPlayer]);

  const fetchWarningTypes = useCallback(async () => {
    if (!selectedPlayer) return;

    setLoading(true);
    setError(null);
    try {
      const res = await warningsApi.getTypes(selectedPlayer.guildId);
      setWarningTypes(res.warningTypes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load warning types');
    } finally {
      setLoading(false);
    }
  }, [selectedPlayer]);

  useEffect(() => {
    fetchWarningTypes();
    fetchCategories();
  }, [fetchWarningTypes, fetchCategories]);

  const getSeverityColor = (severity: number) => {
    if (severity >= 7) return 'bg-red-600';
    if (severity >= 4) return 'bg-yellow-600';
    return 'bg-blue-600';
  };

  const getSeverityLabel = (severity: number) => {
    if (severity === 10) return 'Critical';
    if (severity >= 7) return 'Major';
    if (severity >= 4) return 'Moderate';
    return 'Minor';
  };

  const handleAddClick = () => {
    setFormMode('add');
    setEditingId(null);
    setFormData({ name: '', severity: 5, categoryId: null, description: '' });
  };

  const handleEditClick = (type: WarningType) => {
    setFormMode('edit');
    setEditingId(type.id);
    setFormData({
      name: type.name,
      severity: type.severity,
      categoryId: type.category?.id ?? null,
      description: type.description ?? '',
    });
  };

  const handleCancelForm = () => {
    setFormMode('none');
    setEditingId(null);
    setFormData({ name: '', severity: 5, categoryId: null, description: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer || !formData.name.trim()) return;

    setSubmitting(true);
    try {
      if (formMode === 'add') {
        await warningsApi.createType(
          selectedPlayer.guildId,
          formData.name.trim(),
          formData.severity,
          formData.categoryId ?? undefined,
          formData.description.trim() || undefined
        );
        toast.success('Warning type created successfully');
      } else if (formMode === 'edit' && editingId !== null) {
        await warningsApi.updateType(
          editingId,
          formData.name.trim(),
          formData.severity,
          formData.categoryId,
          formData.description.trim() || null
        );
        toast.success('Warning type updated successfully');
      }
      handleCancelForm();
      fetchWarningTypes();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Operation failed';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (id: number) => {
    setDeleteConfirmId(id);
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmId === null) return;

    setSubmitting(true);
    try {
      await warningsApi.deleteType(deleteConfirmId);
      toast.success('Warning type deleted successfully');
      setDeleteConfirmId(null);
      fetchWarningTypes();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmId(null);
  };

  const handleAddCategory = async () => {
    if (!selectedPlayer || !newCategoryName.trim()) return;

    setAddingCategory(true);
    try {
      await warningCategoriesApi.create(selectedPlayer.guildId, newCategoryName.trim());
      toast.success('Category created successfully');
      setNewCategoryName('');
      fetchCategories();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create category';
      toast.error(message);
    } finally {
      setAddingCategory(false);
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (!selectedPlayer) return;

    try {
      await warningCategoriesApi.delete(selectedPlayer.guildId, categoryId);
      toast.success('Category deleted successfully');
      fetchCategories();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete category';
      toast.error(message);
    }
  };

  const truncateDescription = (description: string | null | undefined, maxLength: number = 50): string => {
    if (!description) return '-';
    if (description.length <= maxLength) return description;
    return description.slice(0, maxLength) + '...';
  };

  if (!selectedPlayer || selectedPlayer.memberLevel < 3 && !selectedPlayer.isAdmin) {
    return <div className="text-center py-8">Access denied</div>;
  }

  if (loading && warningTypes.length === 0) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Warning Types</h1>
        <button
          onClick={handleAddClick}
          disabled={formMode !== 'none'}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors font-semibold"
        >
          Add Type
        </button>
      </div>

      {/* Categories Section */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">Categories</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.length === 0 ? (
            <span className="text-gray-400 text-sm">No categories defined yet.</span>
          ) : (
            categories.map((category) => (
              <span
                key={category.id}
                className="inline-flex items-center gap-1 px-3 py-1 bg-gray-700 rounded-full text-sm"
              >
                {category.name}
                <button
                  onClick={() => handleDeleteCategory(category.id)}
                  className="ml-1 text-gray-400 hover:text-red-400 transition-colors"
                  title="Delete category"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="New category name"
            className="flex-1 max-w-xs px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-indigo-500 text-sm"
          />
          <button
            onClick={handleAddCategory}
            disabled={addingCategory || !newCategoryName.trim()}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors text-sm font-semibold"
          >
            {addingCategory ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>

      {/* Add Form */}
      {formMode === 'add' && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4">Add New Warning Type</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Missed TB Phase"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div className="sm:w-48">
                <label htmlFor="category" className="block text-sm font-medium text-gray-400 mb-1">
                  Category
                </label>
                <select
                  id="category"
                  value={formData.categoryId ?? ''}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value ? Number(e.target.value) : null })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-indigo-500"
                >
                  <option value="">No category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:w-48">
                <label htmlFor="severity" className="block text-sm font-medium text-gray-400 mb-1">
                  Severity
                </label>
                <select
                  id="severity"
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-indigo-500"
                >
                  {SEVERITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-400 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Explain the purpose of this warning type..."
                rows={2}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={submitting || !formData.name.trim()}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors font-semibold"
              >
                {submitting ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={handleCancelForm}
                disabled={submitting}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Warning Types Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Category</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Description</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Severity</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {warningTypes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No warning types defined. Click &quot;Add Type&quot; to create one.
                </td>
              </tr>
            ) : (
              warningTypes.map((type) => (
                <tr key={type.id} className="hover:bg-gray-750">
                  {formMode === 'edit' && editingId === type.id ? (
                    // Inline Edit Form
                    <td colSpan={5} className="px-4 py-3">
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-indigo-500"
                              required
                              autoFocus
                            />
                          </div>
                          <div className="sm:w-48">
                            <select
                              value={formData.categoryId ?? ''}
                              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value ? Number(e.target.value) : null })}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-indigo-500"
                            >
                              <option value="">No category</option>
                              {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="sm:w-48">
                            <select
                              value={formData.severity}
                              onChange={(e) => setFormData({ ...formData, severity: Number(e.target.value) })}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-indigo-500"
                            >
                              {SEVERITY_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Explain the purpose of this warning type..."
                            rows={2}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-indigo-500 resize-none"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="submit"
                            disabled={submitting || !formData.name.trim()}
                            className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors text-sm font-semibold"
                          >
                            {submitting ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelForm}
                            disabled={submitting}
                            className="px-3 py-2 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 rounded transition-colors text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </td>
                  ) : (
                    // Normal Row Display
                    <>
                      <td className="px-4 py-3 text-sm">{type.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {type.category?.name ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        <span title={type.description ?? undefined}>
                          {truncateDescription(type.description)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 text-xs font-semibold rounded ${getSeverityColor(
                              type.severity
                            )}`}
                          >
                            {type.severity}
                          </span>
                          <span className="text-gray-400 text-sm">
                            {getSeverityLabel(type.severity)}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {deleteConfirmId === type.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-sm text-gray-400 mr-2">Delete?</span>
                            <button
                              onClick={handleDeleteConfirm}
                              disabled={submitting}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded transition-colors text-sm font-semibold"
                            >
                              {submitting ? 'Deleting...' : 'Yes'}
                            </button>
                            <button
                              onClick={handleDeleteCancel}
                              disabled={submitting}
                              className="px-3 py-1 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 rounded transition-colors text-sm"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditClick(type)}
                              disabled={formMode !== 'none'}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteClick(type.id)}
                              disabled={formMode !== 'none'}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
