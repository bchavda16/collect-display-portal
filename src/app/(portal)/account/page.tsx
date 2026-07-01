'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { User, MapPin, Lock, Building2, Phone, Mail, Hash, Save, Edit2, X, Plus, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { toast } from '@/components/ui/Toaster'

interface AccountData {
  businessName: string
  contactName: string
  email: string
  phone: string | null
  vatNumber: string | null
  pricingTier: string
  paymentTerms: string
  creditLimitPence: number | null
  addresses: Address[]
}

interface Address {
  id: string
  label: string | null
  line1: string
  line2: string | null
  city: string
  county: string | null
  postcode: string
  country: string
  isDefault: boolean
}

export default function AccountPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'details' | 'addresses' | 'security'>('details')

  const { data: account, isLoading } = useQuery<AccountData>({
    queryKey: ['account'],
    queryFn: async () => {
      const res = await fetch('/api/account')
      if (!res.ok) throw new Error('Failed to load account')
      return res.json()
    },
  })

  const tabs = [
    { id: 'details', label: 'Business Details', icon: Building2 },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
    { id: 'security', label: 'Security', icon: Lock },
  ] as const

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">My Account</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage your business details and preferences</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-white/10">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-brand text-white'
                : 'border-transparent text-gray-400 hover:text-white hover:border-white/20'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="card p-8 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !account ? (
        <div className="card p-8 text-center text-gray-400">Failed to load account details</div>
      ) : (
        <>
          {activeTab === 'details' && <DetailsTab account={account} onUpdate={() => queryClient.invalidateQueries({ queryKey: ['account'] })} />}
          {activeTab === 'addresses' && <AddressesTab addresses={account.addresses} onUpdate={() => queryClient.invalidateQueries({ queryKey: ['account'] })} />}
          {activeTab === 'security' && <SecurityTab email={account.email} />}
        </>
      )}
    </div>
  )
}

function DetailsTab({ account, onUpdate }: { account: AccountData; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    contactName: account.contactName,
    phone: account.phone ?? '',
  })
  const [saving, setSaving] = useState(false)

  const f = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/account', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactName: form.contactName, phone: form.phone || null }),
      })
      if (!res.ok) throw new Error()
      toast('Details updated', 'success')
      setEditing(false)
      onUpdate()
    } catch {
      toast('Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  const tierColour = (tier: string) => {
    switch (tier) {
      case 'PLATINUM': return 'purple'
      case 'GOLD': return 'warning'
      case 'SILVER': return 'info'
      default: return 'default'
    }
  }

  return (
    <div className="space-y-4">
      {/* Read-only account info */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Business</h2>
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="Business Name" value={account.businessName} icon={<Building2 className="w-4 h-4" />} />
          <InfoRow label="Email" value={account.email} icon={<Mail className="w-4 h-4" />} />
          {account.vatNumber && <InfoRow label="VAT Number" value={account.vatNumber} icon={<Hash className="w-4 h-4" />} mono />}
        </div>

        <div className="pt-2 border-t border-white/10 flex gap-6">
          <div>
            <p className="text-xs text-gray-500 mb-1">Pricing Tier</p>
            <Badge variant={tierColour(account.pricingTier) as any}>{account.pricingTier}</Badge>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Payment Terms</p>
            <p className="text-sm font-medium text-white">{account.paymentTerms?.replace('_', ' ')}</p>
          </div>
          {account.creditLimitPence && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Credit Limit</p>
              <p className="text-sm font-medium text-white">
                £{(account.creditLimitPence / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-600">To update your business name, email, or VAT number, please contact us.</p>
      </div>

      {/* Editable contact info */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Contact Details</h2>
          {!editing && (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs text-brand hover:text-brand/80 transition-colors">
              <Edit2 className="w-3 h-3" /> Edit
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Contact Name" value={form.contactName} onChange={f('contactName')} />
              <Input label="Phone Number" value={form.phone} onChange={f('phone')} placeholder="+44 7700 900000" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} loading={saving} icon={<Save className="w-3.5 h-3.5" />}>Save Changes</Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setForm({ contactName: account.contactName, phone: account.phone ?? '' }) }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Contact Name" value={account.contactName} icon={<User className="w-4 h-4" />} />
            <InfoRow label="Phone" value={account.phone ?? '—'} icon={<Phone className="w-4 h-4" />} />
          </div>
        )}
      </div>
    </div>
  )
}

function AddressesTab({ addresses, onUpdate }: { addresses: Address[]; onUpdate: () => void }) {
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div className="space-y-4">
      {addresses.map(addr => (
        <AddressCard key={addr.id} address={addr} onUpdate={onUpdate} />
      ))}

      {showAdd ? (
        <AddressForm onCancel={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); onUpdate() }} />
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full card p-4 border-dashed flex items-center justify-center gap-2 text-gray-500 hover:text-white hover:border-white/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">Add Address</span>
        </button>
      )}
    </div>
  )
}

function AddressCard({ address, onUpdate }: { address: Address; onUpdate: () => void }) {
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/account/addresses/${address.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast('Address removed', 'success')
      onUpdate()
    } catch {
      toast('Failed to remove address', 'error')
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-brand" />
            <span className="text-sm font-medium text-white">{address.label ?? 'Delivery Address'}</span>
            {address.isDefault && <Badge variant="success">Default</Badge>}
          </div>
          <div className="text-sm text-gray-400 leading-relaxed pl-6">
            <p>{address.line1}</p>
            {address.line2 && <p>{address.line2}</p>}
            <p>{address.city}</p>
            {address.county && <p>{address.county}</p>}
            <p className="font-mono text-xs">{address.postcode}</p>
          </div>
        </div>
        <div className="flex-shrink-0">
          {confirmDelete ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400">Remove?</span>
              <button onClick={handleDelete} disabled={deleting} className="text-red-400 hover:text-red-300 font-medium">Yes</button>
              <button onClick={() => setConfirmDelete(false)} className="text-gray-500">No</button>
            </div>
          ) : (
            !address.isDefault && (
              <button onClick={() => setConfirmDelete(true)} className="text-gray-600 hover:text-red-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}

function AddressForm({ onCancel, onSuccess }: { onCancel: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ label: '', line1: '', line2: '', city: '', county: '', postcode: '', country: 'GB' })
  const [saving, setSaving] = useState(false)

  const f = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/account/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, line2: form.line2 || undefined, county: form.county || undefined, label: form.label || undefined }),
      })
      if (!res.ok) throw new Error()
      toast('Address added', 'success')
      onSuccess()
    } catch {
      toast('Failed to add address', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card p-5 space-y-4">
      <h3 className="text-sm font-semibold text-white">New Address</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Input label="Label (optional)" value={form.label} onChange={f('label')} placeholder="e.g. Warehouse, Head Office" />
        </div>
        <div className="col-span-2">
          <Input label="Address Line 1" value={form.line1} onChange={f('line1')} placeholder="Street address" />
        </div>
        <Input label="Address Line 2" value={form.line2} onChange={f('line2')} placeholder="Optional" />
        <Input label="City" value={form.city} onChange={f('city')} />
        <Input label="County" value={form.county} onChange={f('county')} placeholder="Optional" />
        <Input label="Postcode" value={form.postcode} onChange={f('postcode')} />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} loading={saving}>Add Address</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}

function SecurityTab({ email }: { email: string }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleChange = async () => {
    if (form.newPassword !== form.confirmPassword) {
      toast('Passwords do not match', 'error')
      return
    }
    if (form.newPassword.length < 8) {
      toast('Password must be at least 8 characters', 'error')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed')
      }
      toast('Password updated', 'success')
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err: any) {
      toast(err.message ?? 'Failed to update password', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Login Details</h2>
        <InfoRow label="Email Address" value={email} icon={<Mail className="w-4 h-4" />} />
        <p className="text-xs text-gray-600">To change your email address, please contact us.</p>
      </div>

      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Change Password</h2>
        <div className="space-y-3 max-w-sm">
          <div className="relative">
            <Input
              label="Current Password"
              type={showCurrent ? 'text' : 'password'}
              value={form.currentPassword}
              onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))}
            />
            <button
              type="button"
              onClick={() => setShowCurrent(v => !v)}
              className="absolute right-3 top-8 text-gray-500 hover:text-white"
            >
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="relative">
            <Input
              label="New Password"
              type={showNew ? 'text' : 'password'}
              value={form.newPassword}
              onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
              hint="At least 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowNew(v => !v)}
              className="absolute right-3 top-8 text-gray-500 hover:text-white"
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <Input
            label="Confirm New Password"
            type="password"
            value={form.confirmPassword}
            onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
          />
        </div>
        <Button
          size="sm"
          onClick={handleChange}
          loading={saving}
          disabled={!form.currentPassword || !form.newPassword || !form.confirmPassword}
          icon={<Save className="w-3.5 h-3.5" />}
        >
          Update Password
        </Button>
      </div>
    </div>
  )
}

function InfoRow({ label, value, icon, mono }: { label: string; value: string; icon?: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-gray-500">{icon}</span>}
        <p className={`text-sm text-white ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
      </div>
    </div>
  )
}
