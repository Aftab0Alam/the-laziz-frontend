import { useEffect, useState, useCallback } from 'react';
import { fetchCategories, createCategory, updateCategory, deleteCategory } from '../../utils/adminApi';
import toast from 'react-hot-toast';

const EMPTY_FORM = { name: '', description: '', displayOrder: '0', isActive: 'true', isFeatured: 'false' };

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [imageFile, setImageFile]   = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [saving, setSaving]         = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchCategories().then(setCategories).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setImagePreview('');
    setShowModal(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setForm({
      name: cat.name || '',
      description: cat.description || '',
      displayOrder: cat.displayOrder?.toString() || '0',
      isActive: cat.isActive !== false ? 'true' : 'false',
      isFeatured: cat.isFeatured ? 'true' : 'false',
    });
    setImageFile(null);
    setImagePreview(cat.imageUrl || '');
    setShowModal(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (imageFile) fd.append('image', imageFile);
      if (editing) {
        await updateCategory(editing._id, fd);
        toast.success('Category updated!');
      } else {
        await createCategory(fd);
        toast.success('Category created!');
      }
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`Delete category "${cat.name}"?`)) return;
    setDeletingId(cat._id);
    try {
      await deleteCategory(cat._id);
      toast.success('Category deleted');
      load();
    } catch {
      toast.error('Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Categories</h1>
          <span className="admin-page-sub">{categories.length} categories</span>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={openAdd}>+ Add Category</button>
      </div>

      <div className="admin-categories-grid">
        {loading ? (
          <div className="admin-loading">Loading categories…</div>
        ) : categories.length === 0 ? (
          <div className="admin-empty-state">No categories yet. Add one!</div>
        ) : categories.map(cat => (
          <div key={cat._id} className="admin-cat-card">
            <div className="admin-cat-image-wrap">
              {cat.imageUrl
                ? <img src={cat.imageUrl} alt={cat.name} className="admin-cat-image" />
                : <div className="admin-cat-no-image">🏷️</div>
              }
              <div className="admin-cat-badges">
                {cat.isFeatured && <span className="admin-badge badge-purple">⭐ Featured</span>}
                <span className={`admin-badge ${cat.isActive ? 'badge-green' : 'badge-red'}`}>
                  {cat.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <div className="admin-cat-body">
              <div className="admin-cat-name">{cat.name}</div>
              <div className="admin-cat-desc">{cat.description || 'No description'}</div>
              <div className="admin-cat-meta">Order: {cat.displayOrder}</div>
            </div>
            <div className="admin-cat-actions">
              <button className="admin-btn admin-btn-sm admin-btn-ghost" onClick={() => openEdit(cat)}>✏️ Edit</button>
              <button
                className="admin-btn admin-btn-sm admin-btn-danger"
                onClick={() => handleDelete(cat)}
                disabled={deletingId === cat._id}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal admin-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{editing ? 'Edit Category' : 'Add Category'}</h2>
              <button className="admin-modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="admin-form">
              <div className="admin-form-group">
                <label className="admin-label">Category Image</label>
                <div className="admin-image-upload">
                  {imagePreview && <img src={imagePreview} alt="preview" className="admin-image-preview" />}
                  <label className="admin-btn admin-btn-ghost" style={{ cursor: 'pointer' }}>
                    📷 {imagePreview ? 'Change Image' : 'Upload Image'}
                    <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Name *</label>
                <input className="admin-input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Description</label>
                <textarea className="admin-input admin-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Display Order</label>
                <input className="admin-input" type="number" value={form.displayOrder} onChange={e => setForm(f => ({ ...f, displayOrder: e.target.value }))} />
              </div>

              <div className="admin-form-group">
                <label className="admin-label">Options</label>
                <div className="admin-toggles">
                  {[
                    { key: 'isActive',   label: '✅ Active' },
                    { key: 'isFeatured', label: '⭐ Featured' },
                  ].map(({ key, label }) => (
                    <label key={key} className="admin-toggle-label">
                      <input
                        type="checkbox"
                        checked={form[key] === 'true'}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.checked ? 'true' : 'false' }))}
                        className="admin-toggle-input"
                      />
                      <span className="admin-toggle-track" />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="admin-modal-footer">
                <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
