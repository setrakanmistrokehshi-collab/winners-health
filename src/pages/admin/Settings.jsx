// src/pages/admin/Settings.jsx
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Store, CreditCard, Truck, Mail, Bell, Lock } from 'lucide-react';

const TABS = [
  { id: 'store',         Icon: Store,      label: 'Store'         },
  { id: 'payments',      Icon: CreditCard, label: 'Payments'      },
  { id: 'shipping',      Icon: Truck,      label: 'Shipping'      },
  { id: 'email',         Icon: Mail,       label: 'Email'         },
  { id: 'notifications', Icon: Bell,       label: 'Notifications' },
  { id: 'security',      Icon: Lock,       label: 'Security'      },
];

// Shipping zones with default values
const SHIPPING_ZONES = [
  { id: 'lagos_within', label: 'Lagos (within)', default: 1500 },
  { id: 'lagos_outside', label: 'Lagos (outside island)', default: 2000 },
  { id: 'south_west', label: 'South-West Nigeria', default: 2500 },
  { id: 'south_east', label: 'South-East / South-South', default: 3000 },
  { id: 'north', label: 'North Nigeria', default: 3500 },
  { id: 'express', label: 'Express (same day)', default: 5000 },
  { id: 'owerri_within', label: 'Owerri (within)', default: 3000 },
  { id: 'owerri_outside', label: 'Owerri (outside)', default: 3500 },
  { id: 'ph_within', label: 'Port-Harcourt (within)', default: 2500 },
  { id: 'ph_outside', label: 'Port-Harcourt (outside)', default: 3000 },
];

// Notification settings
const NOTIFICATIONS = [
  { id: 'low_stock', label: 'Low stock alerts' },
  { id: 'new_order', label: 'New order placed' },
  { id: 'order_status', label: 'Order status update' },
  { id: 'new_customer', label: 'New customer signup' },
  { id: 'payment', label: 'Payment received' },
  { id: 'review', label: 'Review submitted' },
];

// Security settings
const SECURITY_SETTINGS = [
  { id: '2fa', label: 'Two-factor authentication' },
  { id: 'login_alert', label: 'Login email alerts' },
  { id: 'force_https', label: 'Force HTTPS' },
];

export default function Settings() {
  const [tab, setTab] = useState('store');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Form state
  const [form, setForm] = useState({
    // Store
    storeName: 'Winners Health',
    storeEmail: 'admin@winnershealth.ng',
    storePhone: '+234 800 000 0000',
    storeAddress: 'Lagos, Nigeria',
    currency: 'NGN (₦)',
    nafdac: '',
    cac: '',
    
    // Payments
    nombaKey: '',
    webhookSecret: '',
    
    // Email
    smtpHost: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: '',
    
    // Notifications
    lowStockThreshold: '30',
    notifications: {},
    
    // Security
    security: {},
    
    // Shipping
    shipping: {},
    
    // Password change
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/settings');
      if (data) {
        setForm(prev => ({
          ...prev,
          ...data,
          notifications: data.notifications || {},
          security: data.security || {},
          shipping: data.shipping || {},
        }));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  function updateForm(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function updateNested(parent, key, value) {
    setForm(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [key]: value }
    }));
  }

  function updatePassword(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function saveSettings() {
    // Validate required fields
    if (!form.storeName.trim()) {
      toast.error('Store name is required');
      return;
    }
    
    if (!form.storeEmail.trim() || !form.storeEmail.includes('@')) {
      toast.error('Valid store email is required');
      return;
    }

    setSaving(true);
    try {
      await api.put('/admin/settings', form);
      toast.success('Settings saved successfully!');
    } catch (err) {
      console.error('Failed to save settings:', err);
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  // ── CHANGE PASSWORD FUNCTION ─────────────────────────────────────
  async function changePassword() {
    const { currentPassword, newPassword, confirmPassword } = form;
    
    // Validation
    if (!currentPassword || currentPassword.length < 1) {
      toast.error('Please enter your current password');
      return;
    }
    
    if (!newPassword || newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    
    // Check for password strength
    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    if (!hasLetter || !hasNumber) {
      toast.error('Password must contain at least one letter and one number');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (newPassword === currentPassword) {
      toast.error('New password must be different from your current password');
      return;
    }
    
    setChangingPassword(true);
    try {
      // Call your backend password change endpoint
      await api.put('/admin/settings/password', {
        currentPassword,
        newPassword,
      });
      
      toast.success('Password changed successfully! You will be logged out shortly.');
      
      // Clear password fields
      setForm(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      
      // Optional: Logout user after password change (since tokenVersion is incremented)
      setTimeout(() => {
        // Redirect to login or logout
        window.location.href = '/admin-login?passwordChanged=true';
      }, 2000);
      
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to change password';
      toast.error(message);
    } finally {
      setChangingPassword(false);
    }
  }

  async function sendTestEmail() {
    try {
      await api.post('/admin/settings/test-email', {
        email: form.storeEmail,
      });
      toast.success('Test email sent successfully!');
    } catch (err) {
      toast.error('Failed to send test email');
    }
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px' 
      }}>
        <div>Loading settings...</div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Configure your store preferences
          </p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={saveSettings} 
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      <div className="settings-layout">
        {/* Tab nav */}
        <div className="card settings-tabs" style={{ padding:8 }}>

          {TABS.map(t => (
           <div
  key={t.id}
  className={`nav-item settings-tab-item ${tab === t.id ? 'active' : ''}`}
  onClick={() => setTab(t.id)}
  style={{ display: 'flex', alignItems: 'center', gap: 8 }}
>
  <t.Icon size={16} strokeWidth={1.8} aria-hidden="true" /> {t.label}
</div>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Store Tab */}
          {tab === 'store' && (
            <>
              <div className="card">
                <div className="card-title" style={{ marginBottom: 16 }}>Store Information</div>
                <div className="form-grid-2">
                  <FormField 
                    label="Store Name" 
                    value={form.storeName} 
                    onChange={v => updateForm('storeName', v)} 
                    placeholder="Winners Health"
                    required
                  />
                  <FormField 
                    label="Store Email" 
                    value={form.storeEmail} 
                    onChange={v => updateForm('storeEmail', v)} 
                    type="email" 
                    placeholder="admin@winnershealth.ng"
                    required
                  />
                  <FormField 
                    label="Support Phone" 
                    value={form.storePhone} 
                    onChange={v => updateForm('storePhone', v)} 
                    placeholder="+234 800 000 0000"
                  />
                  <FormField 
                    label="Store Address" 
                    value={form.storeAddress} 
                    onChange={v => updateForm('storeAddress', v)} 
                    placeholder="Lagos, Nigeria"
                  />
                  <FormField 
                    label="Currency" 
                    value={form.currency} 
                    onChange={v => updateForm('currency', v)} 
                    placeholder="NGN (₦)"
                  />
                </div>
              </div>
              
              <div className="card">
                <div className="card-title" style={{ marginBottom: 16 }}>NAFDAC & Compliance</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <FormField 
                    label="NAFDAC Number" 
                    value={form.nafdac} 
                    onChange={v => updateForm('nafdac', v)} 
                    placeholder="NAFDAC/FD-001"
                  />
                  <FormField 
                    label="CAC Business Number" 
                    value={form.cac} 
                    onChange={v => updateForm('cac', v)} 
                    placeholder="RC-1234567"
                  />
                </div>
              </div>
            </>
          )}

          {/* Payments Tab */}
          {tab === 'payments' && (
            <div className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>Nomba Payment Gateway</div>
              <div style={{ 
                padding: '12px 16px', 
                background: 'rgba(0,200,150,.06)', 
                border: '1px solid rgba(0,200,150,.2)', 
                borderRadius: 8, 
                marginBottom: 16, 
                fontSize: 13, 
                color: 'var(--muted)' 
              }}>
                ℹ️ Your backend already handles Nomba webhook verification via HMAC-SHA512. 
                Enter keys from your Nomba dashboard.
              </div>
              
              <FormField 
                label="Nomba Public Key" 
                value={form.nombaKey} 
                onChange={v => updateForm('nombaKey', v)} 
                placeholder="pk_live_…" 
                type="password"
              />
              
              <FormField 
                label="Webhook Secret" 
                value={form.webhookSecret} 
                onChange={v => updateForm('webhookSecret', v)} 
                placeholder="whsec_…" 
                type="password"
              />
              
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                  Webhook URL (copy this to your Nomba dashboard)
                </div>
                <div style={{ 
                  background: 'var(--surface2)', 
                  border: '1px solid var(--border)', 
                  borderRadius: 8, 
                  padding: '9px 12px', 
                  fontFamily: 'var(--mono)', 
                  fontSize: 12, 
                  color: 'var(--accent)' 
                }}>
                  {window.location.origin}/webhooks/nomba
                </div>
              </div>
            </div>
          )}

          {/* Email Tab */}
          {tab === 'email' && (
            <div className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>Email (SMTP / Nodemailer)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FormField 
                  label="SMTP Host" 
                  value={form.smtpHost} 
                  onChange={v => updateForm('smtpHost', v)} 
                  placeholder="smtp.gmail.com"
                />
                <FormField 
                  label="SMTP Port" 
                  value={form.smtpPort} 
                  onChange={v => updateForm('smtpPort', v)} 
                  type="number"
                />
                <FormField 
                  label="SMTP User" 
                  value={form.smtpUser} 
                  onChange={v => updateForm('smtpUser', v)} 
                  placeholder="you@gmail.com"
                />
                <FormField 
                  label="SMTP Pass" 
                  value={form.smtpPass} 
                  onChange={v => updateForm('smtpPass', v)} 
                  type="password" 
                  placeholder="App password"
                />
              </div>
              <div style={{ marginTop: 12 }}>
                <button 
                  className="btn btn-ghost" 
                  style={{ fontSize: 12 }} 
                  onClick={sendTestEmail}
                >
                  Send Test Email
                </button>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {tab === 'notifications' && (
            <div className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>Notification Preferences</div>
              
              {NOTIFICATIONS.map(({ id, label }) => (
                <div key={id} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '12px 0', 
                  borderBottom: '1px solid var(--border)' 
                }}>
                  <span style={{ fontSize: 13 }}>{label}</span>
                  <Toggle 
                    checked={form.notifications[id] || false}
                    onChange={(checked) => updateNested('notifications', id, checked)}
                  />
                </div>
              ))}
              
              <div className="form-field" style={{ marginTop: 16 }}>
                <label>Low Stock Threshold</label>
                <input 
                  type="number" 
                  value={form.lowStockThreshold} 
                  onChange={e => updateForm('lowStockThreshold', e.target.value)}
                  style={{ width: 100 }}
                />
              </div>
            </div>
          )}

          {/* Security Tab */}
          {tab === 'security' && (
            <div className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>Security Settings</div>
              
              {/* Security Toggles */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {SECURITY_SETTINGS.map(({ id, label }) => (
                  <div key={id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '12px 0', 
                    borderBottom: '1px solid var(--border)' 
                  }}>
                    <span style={{ fontSize: 13 }}>{label}</span>
                    <Toggle 
                      checked={form.security[id] || false}
                      onChange={(checked) => updateNested('security', id, checked)}
                    />
                  </div>
                ))}
              </div>
              
              {/* Change Password Section - NOW FULLY WORKING */}
              <div style={{ 
                marginTop: 24, 
                borderTop: '1px solid var(--border)', 
                paddingTop: 24 
              }}>
                <div className="card-title" style={{ marginBottom: 12 }}>
                  Change Admin Password
                </div>
                
                <div className="form-grid-1" style={{ maxWidth: 400 }}>
                  <div className="form-field">
                    <label>
                      Current Password <span style={{ color: '#e74c3c' }}>*</span>
                    </label>
                    <input 
                      type="password" 
                      value={form.currentPassword || ''} 
                      onChange={e => updatePassword('currentPassword', e.target.value)}
                      placeholder="Enter current password"
                      autoComplete="current-password"
                    />
                  </div>
                  
                  <div className="form-field">
                    <label>
                      New Password <span style={{ color: '#e74c3c' }}>*</span>
                    </label>
                    <input 
                      type="password" 
                      value={form.newPassword || ''} 
                      onChange={e => updatePassword('newPassword', e.target.value)}
                      placeholder="Min 8 characters"
                      autoComplete="new-password"
                    />
                    <div style={{ 
                      fontSize: 12, 
                      color: 'var(--text-muted)', 
                      marginTop: 4 
                    }}>
                      Must be at least 8 characters with letters and numbers
                    </div>
                  </div>
                  
                  <div className="form-field">
                    <label>
                      Confirm Password <span style={{ color: '#e74c3c' }}>*</span>
                    </label>
                    <input 
                      type="password" 
                      value={form.confirmPassword || ''} 
                      onChange={e => updatePassword('confirmPassword', e.target.value)}
                      placeholder="Repeat new password"
                      autoComplete="new-password"
                    />
                  </div>
                  
                  <button 
                    className="btn btn-primary" 
                    onClick={changePassword}
                    disabled={changingPassword}
                    style={{ alignSelf: 'flex-start', marginTop: 8 }}
                  >
                    {changingPassword ? 'Updating Password...' : 'Update Password'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Shipping Tab */}
          {tab === 'shipping' && (
            <div className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>Shipping Configuration</div>
              
              {SHIPPING_ZONES.map(({ id, label, default: defaultValue }) => (
                <div key={id} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '10px 0', 
                  borderBottom: '1px solid var(--border)' 
                }}>
                  <span style={{ fontSize: 13 }}>{label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--muted)', fontSize: 12 }}>₦</span>
                    <input 
                      type="number" 
                      value={form.shipping[id] || defaultValue}
                      onChange={(e) => updateNested('shipping', id, parseInt(e.target.value) || 0)}
                      style={{ 
                        background: 'var(--surface2)', 
                        border: '1px solid var(--border)', 
                        borderRadius: 6, 
                        color: 'var(--text)', 
                        fontFamily: 'var(--mono)', 
                        fontSize: 13, 
                        padding: '5px 8px', 
                        outline: 'none', 
                        width: 80, 
                        textAlign: 'right' 
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── COMPONENTS ─────────────────────────────────────────────────────

function FormField({ label, value, onChange, type = 'text', placeholder, required = false }) {
  return (
    <div className="form-field">
      <label>
        {label}
        {required && <span style={{ color: '#e74c3c', marginLeft: 4 }}>*</span>}
      </label>
      <input 
        type={type} 
        placeholder={placeholder} 
        value={value || ''} 
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

function Toggle({ checked, onChange }) {
  const [on, setOn] = useState(checked || false);
  
  const handleClick = () => {
    const newState = !on;
    setOn(newState);
    onChange?.(newState);
  };

  return (
    <div 
      onClick={handleClick}
      style={{
        width: 36,
        height: 20,
        background: on ? 'var(--accent)' : 'var(--surface2)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        position: 'relative',
        transition: 'background .2s',
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute',
        top: 2,
        left: on ? 18 : 2,
        width: 14,
        height: 14,
        background: '#fff',
        borderRadius: '50%',
        transition: 'left .2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
      }}/>
    </div>
  );
}