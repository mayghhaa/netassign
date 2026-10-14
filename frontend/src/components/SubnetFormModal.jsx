import { useMemo, useState } from 'react'
import { describeCidr } from '../lib/cidr.js'
import { ENVIRONMENTS, formatCount } from '../lib/format.js'
import { FieldError } from './Feedback.jsx'
import Modal from './Modal.jsx'

const EMPTY = { cidr: '', name: '', vlan_id: '', environment: 'production', description: '' }

export default function SubnetFormModal({ open, ...props }) {
  return open ? <SubnetForm {...props} /> : null
}

function SubnetForm({ subnet, onClose, onSubmit }) {
  const editing = Boolean(subnet)
  const [form, setForm] = useState(() =>
    subnet
      ? { cidr: subnet.cidr, name: subnet.name, vlan_id: subnet.vlan_id ?? '', environment: subnet.environment, description: subnet.description ?? '' }
      : EMPTY,
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)


  const preview = useMemo(() => describeCidr(form.cidr), [form.cidr])
  const fieldErrors = error?.fieldErrors ?? {}
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({ ...form, vlan_id: form.vlan_id === '' ? null : Number(form.vlan_id) })
      onClose()
    } catch (err) {
      setError(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? `Edit ${subnet.name}` : 'New subnet'}
      description="Overlapping CIDR blocks are rejected automatically."
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="subnet-form" className="btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : editing ? 'Save changes' : 'Create subnet'}
          </button>
        </>
      }
    >
      <form id="subnet-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="subnet-cidr" className="label">
            CIDR block <span className="text-rose-500">*</span>
          </label>
          <input
            id="subnet-cidr"
            className={`input font-mono ${fieldErrors.cidr ? 'input-error' : ''}`}
            value={form.cidr}
            onChange={set('cidr')}
            placeholder="10.20.0.0/24"
            autoFocus={!editing}
          />
          <FieldError messages={fieldErrors.cidr} />
          {preview && (
            <div className={`mt-2 rounded-lg px-3 py-2 text-xs ${preview.error ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-600'}`}>
              {preview.error ?? (
                <>
                  <span className="font-mono font-medium text-slate-800">{preview.normalized}</span> · IPv{preview.version} ·{' '}
                  {formatCount(Number(preview.usable))} usable hosts
                  <span className="block font-mono">
                    {preview.firstUsable} – {preview.lastUsable}
                  </span>
                  {preview.hostBitsSet && <span className="block text-amber-700">Host bits will be cleared to {preview.normalized}</span>}
                </>
              )}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="subnet-name" className="label">
            Name <span className="text-rose-500">*</span>
          </label>
          <input id="subnet-name" className={`input ${fieldErrors.name ? 'input-error' : ''}`} value={form.name} onChange={set('name')} placeholder="Core Servers" />
          <FieldError messages={fieldErrors.name} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="subnet-vlan" className="label">
              VLAN ID
            </label>
            <input
              id="subnet-vlan"
              type="number"
              min={1}
              max={4094}
              className={`input ${fieldErrors.vlan_id ? 'input-error' : ''}`}
              value={form.vlan_id}
              onChange={set('vlan_id')}
              placeholder="1–4094"
            />
            <FieldError messages={fieldErrors.vlan_id} />
          </div>
          <div>
            <label htmlFor="subnet-env" className="label">
              Environment
            </label>
            <select id="subnet-env" className="input capitalize" value={form.environment} onChange={set('environment')}>
              {ENVIRONMENTS.map((env) => (
                <option key={env} value={env}>
                  {env}
                </option>
              ))}
            </select>
            <FieldError messages={fieldErrors.environment} />
          </div>
        </div>

        <div>
          <label htmlFor="subnet-description" className="label">
            Description
          </label>
          <textarea id="subnet-description" rows={2} className="input" value={form.description} onChange={set('description')} />
        </div>

        {error && !Object.keys(fieldErrors).length && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error.message}</p>}
      </form>
    </Modal>
  )
}
