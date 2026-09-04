import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { createProduct, updateProduct, uploadProductImage, getProductById } from '../../api/adminApi';
import { ImagePlus } from 'lucide-react';

const EMPTY = {
  name: '', shortDescription: '', description: '',
  ingredients: '', benefits: '', howToUse: '',
  price: '', originalPrice: '', stock: '', servings: '',
  category: 'immunity', badge: '', tags: '',
  nafdac: '', isFeatured: false, isActive: true,
};

const BADGE_OPTIONS = ['', 'Best Seller', 'New', 'Sale', 'Top Rated'];

export default function AddProduct() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [files, setFiles] = useState([]);           // new files to upload
  const [previews, setPreviews] = useState([]);     // local previews
  const [existingImages, setExistingImages] = useState([]); // already on server
  const [saving, setSaving] = useState(false);
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  // Load product when editing
  useEffect(() => {
    if (!isEdit) return;

    setLoading(true);
    getProductById(id)
      .then((res) => {
        const p = res?.data?.product || res?.product || res?.data || res;
        if (!p) return;

        setForm({
          name: p.name || '',
          shortDescription: p.shortDescription || '',
          description: p.description || '',
          ingredients: (p.ingredients || []).join(', '),
          benefits: (p.benefits || []).join(', '),
          howToUse: p.howToUse || '',
          price: p.price ?? '',
          originalPrice: p.originalPrice ?? '',
          stock: p.stock ?? '',
          servings: p.servings ?? '',
          category: p.category || 'immunity',
          badge: p.badge || '',
          tags: (p.tags || []).join(', '),
          nafdac: p.nafdac || '',
          isFeatured: !!p.isFeatured,
          isActive: p.isActive !== false,
        });

        setExistingImages(p.images || []);
      })
      .catch(() => toast.error('Failed to load product'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // ✅ Append files instead of replacing
  function handleFiles(fileList) {
    const incoming = Array.from(fileList);
    const remainingSlots = 5 - files.length;
    if (remainingSlots <= 0) {
      toast.error('Maximum 5 new images');
      return;
    }

    const toAdd = incoming.slice(0, remainingSlots);
    setFiles((prev) => [...prev, ...toAdd]);
    setPreviews((prev) => [
      ...prev,
      ...toAdd.map((f) => URL.createObjectURL(f)),
    ]);
  }

  function removeFile(index) {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  function clearNewFiles() {
    previews.forEach((url) => URL.revokeObjectURL(url));
    setFiles([]);
    setPreviews([]);
  }

  async function handleSubmit(status = 'active') {
    if (!form.name || !form.price || form.stock === '') {
      toast.error('Name, price and stock are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
        stock: Number(form.stock),
        servings: form.servings ? Number(form.servings) : undefined,
        badge: form.badge || undefined,
        ingredients: form.ingredients.split(',').map((s) => s.trim()).filter(Boolean),
        benefits: form.benefits.split(',').map((s) => s.trim()).filter(Boolean),
        tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean),
        isActive: status === 'active',
      };

      // ⚠️ Do NOT send images in this payload.
      // Images are handled only by the dedicated upload endpoint.
      delete payload.images;

      let saved;
      if (isEdit) {
        saved = await updateProduct(id, payload);
        toast.success('Product updated');
      } else {
        saved = await createProduct(payload);
        toast.success('Product created');
      }

      // Robust productId extraction
      const productId =
        saved?.data?.product?._id ||
        saved?.product?._id ||
        saved?.data?._id ||
        saved?._id ||
        id;

      if (files.length && productId) {
        const uploadToast = toast.loading(`Uploading ${files.length} image(s)…`);
        try {
          const fd = new FormData();
          files.forEach((f) => fd.append('images', f)); // field name must be "images"
          const uploadRes = await uploadProductImage(productId, fd);

          console.log('Upload response:', uploadRes); // check this in console
          toast.success(`${files.length} image(s) uploaded`, { id: uploadToast });
        } catch (uploadErr) {
          console.error('Image upload error:', uploadErr);
          toast.error(
            'Product saved but image upload failed. Try adding images again from Edit.',
            { id: uploadToast }
          );
        }
      }

      navigate('/admin/products');
    } catch (e) {
      toast.error(e?.response?.data?.message || e.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading product…</div>;
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>{isEdit ? 'Edit Product' : 'Add Product'}</h1>
          <p>{isEdit ? `Editing product #${id}` : 'Create a new product listing'}</p>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate('/admin/products')}>
          ← Back
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
        {/* LEFT — form fields (same as before) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div className="card-title" style={{ marginBottom: 16 }}>Product Information</div>
            <Field label="Product Name *" value={form.name} onChange={(v) => set('name', v)} placeholder="e.g. Greens Plus Daily Formula" />
            <Field label="Short Description *" value={form.shortDescription} onChange={(v) => set('shortDescription', v)} placeholder="One-line summary" />
            <div className="form-field">
              <label>Full Description</label>
              <textarea rows={4} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Detailed description…" />
            </div>
            <Field label="Ingredients (comma separated)" value={form.ingredients} onChange={(v) => set('ingredients', v)} />
            <Field label="Benefits (comma separated)" value={form.benefits} onChange={(v) => set('benefits', v)} />
            <Field label="How To Use" value={form.howToUse} onChange={(v) => set('howToUse', v)} />
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: 16 }}>Pricing & Stock</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Price (₦) *" value={form.price} onChange={(v) => set('price', v)} type="number" />
              <Field label="Original Price (₦)" value={form.originalPrice} onChange={(v) => set('originalPrice', v)} type="number" />
              <Field label="Stock Quantity *" value={form.stock} onChange={(v) => set('stock', v)} type="number" />
              <Field label="Servings Per Pack" value={form.servings} onChange={(v) => set('servings', v)} type="number" />
            </div>
          </div>

          <div className="card">
            <div className="card-title" style={{ marginBottom: 16 }}>Tags & Compliance</div>
            <Field label="Tags (comma separated)" value={form.tags} onChange={(v) => set('tags', v)} />
            <Field label="NAFDAC Number" value={form.nafdac} onChange={(v) => set('nafdac', v)} />
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Images */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: 14 }}>
              Product Images
              <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400, marginLeft: 8 }}>
                {existingImages.length + files.length}/10 total · {files.length} new
              </span>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
              onClick={() => document.getElementById('file-input').click()}
              style={{
                border: `2px dashed ${drag ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 10,
                padding: '24px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                background: drag ? 'rgba(0,200,150,.04)' : 'transparent',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                <ImagePlus size={26} strokeWidth={1.6} color="var(--muted)" aria-hidden="true" />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Drop images or click to browse</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>JPEG, PNG, WebP · Max 5MB · Up to 5 new</div>
            </div>

            <input
              id="file-input"
              type="file"
              multiple
              accept="image/jpeg,image/jpg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={(e) => handleFiles(e.target.files)}
            />

            {/* Existing + new previews */}
            {(existingImages.length > 0 || previews.length > 0) && (
              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {existingImages.map((src, i) => (
                  <div key={`exist-${i}`} style={{ position: 'relative', width: 72, height: 72 }}>
                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                    <span style={{ position: 'absolute', bottom: 2, left: 2, fontSize: 9, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '1px 4px', borderRadius: 3 }}>
                      SAVED
                    </span>
                  </div>
                ))}

                {previews.map((src, i) => (
                  <div key={`new-${i}`} style={{ position: 'relative', width: 72, height: 72 }}>
                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                      style={{
                        position: 'absolute', top: -6, right: -6,
                        width: 20, height: 20, borderRadius: '50%',
                        background: '#f87171', color: '#fff', border: 'none',
                        cursor: 'pointer', fontSize: 12, fontWeight: 700,
                      }}
                    >
                      ×
                    </button>
                    {i === 0 && existingImages.length === 0 && (
                      <span style={{ position: 'absolute', bottom: 2, left: 2, fontSize: 9, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '1px 4px', borderRadius: 3 }}>
                        MAIN
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {previews.length > 0 && (
              <button className="btn btn-ghost" style={{ width: '100%', marginTop: 8, fontSize: 12 }} onClick={clearNewFiles}>
                Clear new images
              </button>
            )}
          </div>

          {/* Category & Badge */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: 14 }}>Category & Badge</div>
            <div className="form-field">
              <label>Category</label>
              <select value={form.category} onChange={(e) => set('category', e.target.value)}>
                {['immunity', 'vitamins', 'beauty', 'energy', 'weight', 'general'].map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Badge</label>
              <select value={form.badge} onChange={(e) => set('badge', e.target.value)}>
                {BADGE_OPTIONS.map((b) => (
                  <option key={b} value={b}>{b || 'None'}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              <Toggle label="Featured product" checked={form.isFeatured} onChange={(v) => set('isFeatured', v)} />
              <Toggle label="Active / visible in store" checked={form.isActive} onChange={(v) => set('isActive', v)} />
            </div>
          </div>

          <button className="btn btn-primary" style={{ width: '100%', padding: 13 }} onClick={() => handleSubmit('active')} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Publish Product'}
          </button>
          <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => handleSubmit('draft')} disabled={saving}>
            Save as Draft
          </button>
        </div>
      </div>
    </>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <div className="form-field">
      <label>{label}</label>
      <input type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 36, height: 20,
          background: checked ? 'var(--accent)' : 'var(--surface2)',
          border: '1px solid var(--border)', borderRadius: 20,
          position: 'relative', flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute', top: 2, left: checked ? 18 : 2,
          width: 14, height: 14, background: '#fff', borderRadius: '50%',
        }} />
      </div>
      {label}
    </label>
  );
}