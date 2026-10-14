import { useState } from 'react'
import useAllocateIp from '../hooks/useAllocateIp.js'
import { MAC_PATTERN } from '../lib/format.js'
import { FieldError } from './Feedback.jsx'
import Modal from './Modal.jsx'

const EMPTY = { address: '', status: 'static', hostname: '', mac_address: '', notes: '' }

/**
 * Assign an address (specific or next available) or edit an existing record.
 * `record` is an IP row from the table; rows with an id are edited in place.
 */
export default function AllocationModal({ open, ...props }) {
  return open ? <AllocationForm {...props} /> : null
}

function AllocationForm({ subnet, record, onClose, onSaved }) {
  const editing = Boolean(record?.id && record.status !== 'available')
  const { allocate, update, fetchNextAvailable, submitting, error, fieldErrors } = useAllocateIp(subnet?.id, {
    onSuccess: onSaved,
  })
  const [form, setForm] = useState(() => ({
    ...EMPTY,
    address: record?.address ?? '',
    status: editing ? record.status : 'static',
    hostname: record?.hostname ?? '',
    mac_address: record?.mac_address ?? '',
    notes: record?.notes ?? '',
  }))
  const [clientErrors, setClientErrors] = useState({})
  const [lookingUp, setLookingUp] = useState(false)

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const useNextAvailable = async () => {
    setLookingUp(true)
    try {
      const address = await fetchNextAvailable()
      setForm((f) => ({ ...f, address }))
      setClientErrors((errs) => ({ ...errs, address: undefined }))
    } catch (err) {
      setClientErrors((errs) => ({ ...errs, address: [err.message] }))
    } finally {
      setLookingUp(false)
    }
  }

  const validate = () => {
    const errs = {}
    if (form.status === 'static' && !form.hostname.trim()) errs.hostname = ['is required for static assignments']
    if (form.mac_address.trim() && !MAC_PATTERN.test(form.mac_address.trim())) errs.mac_address = ['must look like 00:1a:2b:3c:4d:5e']
    setClientErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    const payload = {
      status: form.status,
      hostname: form.hostname.trim() || null,
      mac_address: form.mac_address.trim() || null,
      notes: form.notes.trim() || null,
    }
    try {
      if (editing) await update(record.id, payload)
      else await allocate({ ...payload, address: form.address.trim() || undefined })
      onClose()
    } catch {
      // surfaced through `error` / `fieldErrors`
    }
  }

  const errorsFor = (field) => clientErrors[field] ?? fieldErrors[field] ?? (field === 'address' ? fieldErrors.address_int : undefined)
  const inputClass = (field) => `input ${errorsFor(field) ? 'input-error' : ''}`
  const generalError = error && !Object.keys(fieldErrors).length ? error.message : null

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? `Edit ${record.address}` : 'Allocate IP address'}
      description={subnet ? `${subnet.name} · ${subnet.cidr}` : undefined}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="allocation-form" className="btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : editing ? 'Save changes' : 'Allocate'}
          </button>
        </>
      }
    >
      <form id="allocation-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="ip-address" className="label">
            IP address
          </label>
          <div className="flex gap-2">
            <input
              id="ip-address"
              className={`${inputClass('address')} font-mono`}
              value={form.address}
              onChange={set('address')}
              disabled={editing}
              placeholder={subnet ? `Leave blank for next available in ${subnet.cidr}` : ''}
            />
            {!editing && (
              <button type="button" className="btn-secondary shrink-0" onClick={useNextAvailable} disabled={lookingUp}>
                {lookingUp ? 'Finding…' : 'Next available'}
              </button>
            )}
          </div>
          <FieldError messages={errorsFor('address')} />
        </div>

        <fieldset>
          <legend className="label">Assignment type</legend>
          <div className="grid grid-cols-3 gap-2">
            {(editing ? ['static', 'reserved', 'available'] : ['static', 'reserved']).map((status) => (
              <label
                key={status}
                className={`flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium capitalize transition ${
                  form.status === status
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <input type="radio" name="status" value={status} checked={form.status === status} onChange={set('status')} className="sr-only" />
                {status}
              </label>
            ))}
          </div>
          <FieldError messages={errorsFor('status')} />
        </fieldset>

        <div>
          <label htmlFor="ip-hostname" className="label">
            Hostname {form.status === 'static' && <span className="text-rose-500">*</span>}
          </label>
          <input id="ip-hostname" className={inputClass('hostname')} value={form.hostname} onChange={set('hostname')} placeholder="web-01.corp.example" />
          <FieldError messages={errorsFor('hostname')} />
        </div>

        <div>
          <label htmlFor="ip-mac" className="label">
            MAC address
          </label>
          <input id="ip-mac" className={`${inputClass('mac_address')} font-mono`} value={form.mac_address} onChange={set('mac_address')} placeholder="00:1a:2b:3c:4d:5e" />
          <FieldError messages={errorsFor('mac_address')} />
        </div>

        <div>
          <label htmlFor="ip-notes" className="label">
            Notes
          </label>
          <textarea id="ip-notes" rows={2} className="input" value={form.notes} onChange={set('notes')} placeholder="Owner, ticket number, purpose…" />
        </div>

        {generalError && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{generalError}</p>}
      </form>
    </Modal>
  )
}
