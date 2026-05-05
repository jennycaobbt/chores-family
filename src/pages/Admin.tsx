import { useState } from 'react'
import { Pencil, Plus, Trash2, Upload, Check, X } from 'lucide-react'
import { Modal } from '../components/Modal'
import { Avatar } from '../components/Avatar'
import { IconDisplay } from '../components/IconDisplay'
import {
  useChores,
  useDeleteChore,
  useDeleteLocation,
  useDeletePerson,
  useLocations,
  usePeople,
  useUpsertChore,
  useUpsertLocation,
  useUpsertPerson,
  uploadPersonPhoto,
  uploadIcon,
} from '../lib/queries'
import { defaultPoints, formatFrequency } from '../lib/dueLogic'
import { locationIcon } from '../lib/style'
import { setStoredPin, DEFAULT_PIN, isPinEnabled, setPinEnabled } from '../components/PinGate'
import type { Chore, FrequencyType, Location, Person } from '../lib/database.types'

type Tab = 'chores' | 'people' | 'locations' | 'settings'

export function Admin() {
  const [tab, setTab] = useState<Tab>('chores')

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 pb-8">
      <h2 className="text-3xl font-extrabold text-gray-800 mb-4">Admin</h2>
      <div className="flex flex-wrap gap-1 bg-white/70 backdrop-blur rounded-full p-1 mb-4 shadow-sm w-fit">
        {(['chores', 'people', 'locations', 'settings'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold capitalize transition ${
              tab === t ? 'bg-violet-600 text-white shadow' : 'text-violet-700 hover:bg-violet-100'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'chores' && <ChoresAdmin />}
      {tab === 'people' && <PeopleAdmin />}
      {tab === 'locations' && <LocationsAdmin />}
      {tab === 'settings' && <SettingsAdmin />}
    </div>
  )
}

// ─── Emoji presets ──────────────────────────────────────────────────────────

const CHORE_EMOJIS = [
  // Common chores (top row — quick picks)
  '🧹','🌀','🗑️','🧺','🍽️','💧','🛏️','🌿','🚽','🫧',
  // Cleaning tools
  '🪣','🧽','🧴','🧼','🪥','🧻','🪠','🪒',
  // Laundry
  '👕','👚','👔','🫧','🧦','👗','🧣','🪡',
  // Dishes / Kitchen
  '🥄','🍳','🥘','🫙','🧊','🫗','🍶','🧂',
  // Trash & recycling
  '🗑️','♻️','📦','🪣',
  // Yard / Outdoor
  '🚜','✂️','🌱','🌲','🌳','🌵','💐','🍂','🍃','🌾','🌊',
  // Bathroom
  '🚿','🛁','🪠',
  // Bedroom
  '🛌','😴',
  // Pets
  '🐾','🐶','🐱','🐠','🐦','🐇',
  // Office / Electronics
  '📺','💻','🖥️','🖨️','📱','🔌','💡','🔦',
  // Misc tools
  '🔧','🪛','🔨','⚙️','🪜','🧲','🔑','🗝️','🪟','🚪',
  // Car / Errands
  '🚗','🛻','🛒','⛽',
  // Symbols
  '💨','☀️','❄️','🌨️','⭐','✨','🌟','🏆','🎯',
  // Organization
  '📂','📁','📋','📌','📍','🗂️','🗃️','🗄️',
]

const LOCATION_EMOJIS = [
  // Common rooms (top row — quick picks)
  '🍳','🛋️','🛏️','🛁','🚿','🚽','📺','👑','🎨','🧸',
  // Bedrooms
  '🛌','🌸','🚂','💤','🌙','🧸',
  // Living / Media
  '🎬','🎞️','🎮','🎵','🎧','📻',
  // Office / Study
  '💻','🖥️','📚','🔬','🧪','📝',
  // Bathroom extras
  '🪥','🧼','🫧',
  // Kitchen extras
  '🥘','☕','🍽️',
  // Garage / Utility
  '🔧','🚗','🛻','🪣','🧺','🗑️',
  // Outdoor
  '🌳','🌿','🌻','🌺','🪴','🌱',
  '🏕️','🌄','🏖️','🌅','⛺','🌊',
  // House / Building
  '🏠','🏡','🏢','🚪','🛗','🪟',
  // Symbols
  '⭐','🌟','✨','💫','🔥','❄️','☀️','🌙','🌈','⚡','💎','🏅',
]

// ─── Icon Picker ─────────────────────────────────────────────────────────────

function isUrl(s: string) {
  return s.startsWith('http') || s.startsWith('data:') || s.startsWith('blob:')
}

function IconPicker({
  value,
  onChange,
  presets,
}: {
  value: string
  onChange: (v: string) => void
  presets: string[]
}) {
  const [uploading, setUploading] = useState(false)
  const hasImage = value ? isUrl(value) : false

  return (
    <div className="space-y-2">
      {/* Preview + text input row */}
      <div className="flex items-center gap-2">
        <div className="h-11 w-11 shrink-0 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-2xl overflow-hidden">
          {value ? (
            <IconDisplay icon={value} className="text-2xl" />
          ) : (
            <span className="text-gray-300 text-lg">?</span>
          )}
        </div>

        {hasImage ? (
          /* URL preview with clear button */
          <div className="flex-1 flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 bg-gray-50">
            <span className="flex-1 text-sm text-gray-500 truncate">Custom image</span>
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-gray-400 hover:text-rose-500 transition"
              aria-label="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          /* Emoji text input */
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type or pick below"
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300 text-xl"
            maxLength={8}
          />
        )}

        {/* Upload button */}
        <label className="pop shrink-0 cursor-pointer h-11 px-3 rounded-xl bg-violet-100 text-violet-700 font-bold text-sm hover:bg-violet-200 flex items-center gap-1.5 transition">
          <Upload className="h-3.5 w-3.5" />
          {uploading ? '…' : 'Upload'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              setUploading(true)
              try {
                const url = await uploadIcon(file)
                onChange(url)
              } catch (err) {
                alert(err instanceof Error ? err.message : String(err))
              } finally {
                setUploading(false)
                // Reset the input so the same file can be re-selected
                e.target.value = ''
              }
            }}
          />
        </label>
      </div>

      {/* Emoji grid */}
      <div className="flex flex-wrap gap-1.5 p-2.5 bg-gray-50 rounded-xl border border-gray-100 max-h-44 overflow-y-auto">
        {presets.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onChange(e)}
            className={`text-xl w-9 h-9 rounded-lg hover:bg-violet-100 transition flex items-center justify-center ${
              value === e ? 'bg-violet-200 ring-2 ring-violet-400' : ''
            }`}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Chores ─────────────────────────────────────────────────────────────────

type ChoreSort = 'name' | 'location' | 'person'

function ChoresAdmin() {
  const { data: chores = [] } = useChores()
  const { data: locations = [] } = useLocations()
  const { data: people = [] } = usePeople()
  const upsert = useUpsertChore()
  const del = useDeleteChore()

  const [editing, setEditing] = useState<Chore | null>(null)
  const [creating, setCreating] = useState(false)
  const [sortBy, setSortBy] = useState<ChoreSort>('name')

  const peopleById = Object.fromEntries(people.map((p) => [p.id, p]))
  const locationsById = Object.fromEntries(locations.map((l) => [l.id, l]))

  const sortedChores = [...chores].sort((a, b) => {
    if (sortBy === 'location') {
      const aLoc = (a.location_id ? locationsById[a.location_id]?.name : null) ?? '￿'
      const bLoc = (b.location_id ? locationsById[b.location_id]?.name : null) ?? '￿'
      const locCmp = aLoc.localeCompare(bLoc)
      if (locCmp !== 0) return locCmp
    } else if (sortBy === 'person') {
      const aP = (a.default_person_id ? peopleById[a.default_person_id]?.name : null) ?? '￿'
      const bP = (b.default_person_id ? peopleById[b.default_person_id]?.name : null) ?? '￿'
      const pCmp = aP.localeCompare(bP)
      if (pCmp !== 0) return pCmp
    }
    return a.name.localeCompare(b.name)
  })

  // Build grouped sections for location/person views
  type Group = { key: string; label: string; sublabel: string; headerIcon: React.ReactNode; chores: Chore[] }

  const groups: Group[] = (() => {
    if (sortBy === 'name') return []

    const map = new Map<string, Group>()
    for (const c of sortedChores) {
      let key: string
      let label: string
      let sublabel: string
      let headerIcon: React.ReactNode

      if (sortBy === 'location') {
        const loc = c.location_id ? locationsById[c.location_id] : null
        key = c.location_id ?? '__none__'
        label = loc?.name ?? 'No room'
        sublabel = ''
        headerIcon = (
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center text-xl overflow-hidden shrink-0">
            <IconDisplay icon={locationIcon(loc)} className="text-xl" />
          </div>
        )
      } else {
        const person = c.default_person_id ? peopleById[c.default_person_id] : null
        key = c.default_person_id ?? '__none__'
        label = person?.name ?? 'Unassigned'
        sublabel = ''
        headerIcon = <Avatar person={person ?? null} size="md" />
      }

      if (!map.has(key)) {
        map.set(key, { key, label, sublabel, headerIcon, chores: [] })
      }
      map.get(key)!.chores.push(c)
    }
    return [...map.values()]
  })()

  const renderChoreRow = (c: Chore) => {
    const loc = c.location_id ? locationsById[c.location_id] : null
    const person = c.default_person_id ? peopleById[c.default_person_id] : null
    const icon = c.icon ?? locationIcon(loc)
    return (
      <div
        key={c.id}
        className="bg-white/85 rounded-2xl p-3 flex items-center gap-3 shadow-sm border border-white"
      >
        <div className="h-9 w-9 shrink-0 rounded-xl bg-violet-50 flex items-center justify-center text-xl overflow-hidden">
          <IconDisplay icon={icon} className="text-xl" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-800 truncate">{c.name}</div>
          <div className="text-xs text-gray-500">
            {sortBy === 'person' ? (loc?.name ?? 'No room') : person?.name ?? 'Unassigned'} · {formatFrequency(c.frequency_type, c.frequency_n)} · {c.points} pt{c.points === 1 ? '' : 's'}
          </div>
        </div>
        <Avatar person={person ?? null} size="sm" />
        <button
          onClick={() => setEditing(c)}
          className="h-9 w-9 rounded-full bg-violet-100 hover:bg-violet-200 text-violet-700 flex items-center justify-center"
          aria-label="Edit"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={() => {
            if (confirm(`Delete "${c.name}"? This will also delete its completion history.`)) {
              del.mutate(c.id)
            }
          }}
          className="h-9 w-9 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-700 flex items-center justify-center"
          aria-label="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <button
          onClick={() => setCreating(true)}
          className="pop bg-violet-600 text-white rounded-full px-4 py-2 font-bold flex items-center gap-2 hover:bg-violet-700 transition"
        >
          <Plus className="h-4 w-4" /> New chore
        </button>

        {/* Sort controls */}
        <div className="inline-flex items-center bg-white/70 backdrop-blur rounded-full p-1 shadow-sm gap-0.5">
          <span className="text-xs font-bold text-gray-400 px-2">Sort:</span>
          {(['name', 'location', 'person'] as ChoreSort[]).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-3 py-1 rounded-full text-xs font-bold capitalize transition ${
                sortBy === s ? 'bg-violet-600 text-white shadow' : 'text-violet-700 hover:bg-violet-100'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {sortBy === 'name' ? (
        <div className="space-y-2">
          {sortedChores.map(renderChoreRow)}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.key}>
              {/* Group header */}
              <div className="flex items-center gap-3 mb-2 px-1">
                {group.headerIcon}
                <div>
                  <div className="font-extrabold text-gray-800">{group.label}</div>
                  <div className="text-xs text-violet-500 font-semibold">
                    {group.chores.length} chore{group.chores.length === 1 ? '' : 's'}
                  </div>
                </div>
              </div>
              {/* Chores under this group */}
              <div className="space-y-2 pl-1">
                {group.chores.map(renderChoreRow)}
              </div>
            </section>
          ))}
        </div>
      )}

      {(editing || creating) && (
        <ChoreForm
          chore={editing}
          locations={locations}
          people={people}
          onSubmit={(payload) => {
            upsert.mutate(payload, {
              onSuccess: () => {
                setEditing(null)
                setCreating(false)
              },
            })
          }}
          onClose={() => {
            setEditing(null)
            setCreating(false)
          }}
        />
      )}
    </div>
  )
}

function ChoreForm({
  chore,
  locations,
  people,
  onSubmit,
  onClose,
}: {
  chore: Chore | null
  locations: Location[]
  people: Person[]
  onSubmit: (payload: Partial<Chore> & { name: string; frequency_type: FrequencyType; id?: string }) => void
  onClose: () => void
}) {
  const [name, setName] = useState(chore?.name ?? '')
  const [icon, setIcon] = useState(chore?.icon ?? '')
  const [locationId, setLocationId] = useState<string>(chore?.location_id ?? '')
  const [personId, setPersonId] = useState<string>(chore?.default_person_id ?? '')
  const [freq, setFreq] = useState<FrequencyType>(chore?.frequency_type ?? 'daily')
  const [n, setN] = useState<number>(chore?.frequency_n ?? 3)
  const [points, setPoints] = useState<number>(chore?.points ?? defaultPoints('daily', null))
  const [pointsTouched, setPointsTouched] = useState<boolean>(!!chore)

  const onFreqChange = (next: FrequencyType, nextN: number) => {
    setFreq(next)
    if (!pointsTouched) {
      const isN = next === 'every_n_days' || next === 'every_n_weeks'
      setPoints(defaultPoints(next, isN ? nextN : null))
    }
  }

  const submit = () => {
    if (!name.trim()) return
    onSubmit({
      id: chore?.id,
      name: name.trim(),
      icon: icon.trim() || null,
      frequency_type: freq,
      frequency_n: freq === 'every_n_days' || freq === 'every_n_weeks' ? n : null,
      location_id: locationId || null,
      default_person_id: personId || null,
      points,
    })
  }

  return (
    <Modal open onClose={onClose} title={chore ? 'Edit chore' : 'New chore'}>
      <div className="space-y-3">
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Wipe counters"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300"
            autoFocus
          />
        </Field>

        <Field label="Icon">
          <IconPicker value={icon} onChange={setIcon} presets={CHORE_EMOJIS} />
        </Field>

        <Field label="Room">
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 bg-white"
          >
            <option value="">— No room —</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Default person">
          <select
            value={personId}
            onChange={(e) => setPersonId(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 bg-white"
          >
            <option value="">— No one —</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Frequency">
          <div className="flex gap-2 flex-wrap">
            {(['daily', 'weekly', 'monthly', 'every_n_days', 'every_n_weeks'] as FrequencyType[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => onFreqChange(f, n)}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                  freq === f ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {f === 'daily' ? 'Daily' : f === 'weekly' ? 'Weekly' : f === 'monthly' ? 'Monthly' : f === 'every_n_days' ? 'Every N days' : 'Every N weeks'}
              </button>
            ))}
          </div>
          {(freq === 'every_n_days' || freq === 'every_n_weeks') && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-gray-500">Every</span>
              <input
                type="number"
                min={1}
                value={n}
                onChange={(e) => {
                  const v = Math.max(1, parseInt(e.target.value || '1', 10))
                  setN(v)
                  if (!pointsTouched) setPoints(defaultPoints(freq, v))
                }}
                className="w-20 rounded-xl border border-gray-200 px-2 py-1.5 text-center"
              />
              <span className="text-sm text-gray-500">{freq === 'every_n_days' ? 'days' : 'weeks'}</span>
            </div>
          )}
        </Field>

        <Field label="Points">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={points}
              onChange={(e) => {
                setPoints(Math.max(0, parseInt(e.target.value || '0', 10)))
                setPointsTouched(true)
              }}
              className="w-24 rounded-xl border border-gray-200 px-3 py-2 text-center font-bold"
            />
            <button
              type="button"
              onClick={() => {
                const isN = freq === 'every_n_days' || freq === 'every_n_weeks'
                setPoints(defaultPoints(freq, isN ? n : null))
                setPointsTouched(false)
              }}
              className="text-xs text-violet-600 hover:underline font-semibold"
            >
              Reset to default
            </button>
          </div>
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-full font-semibold text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button onClick={submit} className="px-4 py-2 rounded-full font-bold bg-violet-600 text-white hover:bg-violet-700">
            {chore ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── People ──────────────────────────────────────────────────────────────────

function PeopleAdmin() {
  const { data: people = [] } = usePeople()
  const upsert = useUpsertPerson()
  const del = useDeletePerson()
  const [editing, setEditing] = useState<Person | null>(null)
  const [creating, setCreating] = useState(false)

  return (
    <div>
      <button
        onClick={() => setCreating(true)}
        className="pop bg-violet-600 text-white rounded-full px-4 py-2 font-bold flex items-center gap-2 mb-4 hover:bg-violet-700 transition"
      >
        <Plus className="h-4 w-4" /> New person
      </button>
      <div className="space-y-2">
        {people.map((p) => (
          <div key={p.id} className="bg-white/85 rounded-2xl p-3 flex items-center gap-3 shadow-sm border border-white">
            <Avatar person={p} size="md" />
            <div className="flex-1 font-bold text-gray-800">{p.name}</div>
            <button
              onClick={() => setEditing(p)}
              className="h-9 w-9 rounded-full bg-violet-100 hover:bg-violet-200 text-violet-700 flex items-center justify-center"
              aria-label="Edit"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete "${p.name}"? You can only delete a person who has zero completions.`)) {
                  del.mutate(p.id, {
                    onError: (err: unknown) => {
                      const msg = err instanceof Error ? err.message : String(err)
                      alert(`Could not delete: ${msg}`)
                    },
                  })
                }
              }}
              className="h-9 w-9 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-700 flex items-center justify-center"
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {(editing || creating) && (
        <PersonForm
          person={editing}
          onSubmit={(payload) =>
            upsert.mutate(payload, {
              onSuccess: () => {
                setEditing(null)
                setCreating(false)
              },
            })
          }
          onClose={() => {
            setEditing(null)
            setCreating(false)
          }}
        />
      )}
    </div>
  )
}

function PersonForm({
  person,
  onSubmit,
  onClose,
}: {
  person: Person | null
  onSubmit: (payload: Partial<Person> & { name: string; id?: string }) => void
  onClose: () => void
}) {
  const [name, setName] = useState(person?.name ?? '')
  const [photoUrl, setPhotoUrl] = useState<string | null>(person?.photo_url ?? null)
  const [uploading, setUploading] = useState(false)

  const submit = () => {
    if (!name.trim()) return
    onSubmit({ id: person?.id, name: name.trim(), photo_url: photoUrl, sort_order: person?.sort_order ?? Date.now() })
  }

  return (
    <Modal open onClose={onClose} title={person ? 'Edit person' : 'New person'}>
      <div className="space-y-3">
        <div className="flex flex-col items-center gap-3">
          <Avatar
            person={{ id: person?.id ?? 'preview', name: name || '?', photo_url: photoUrl, sort_order: person?.sort_order ?? 1, created_at: person?.created_at ?? new Date().toISOString() }}
            size="xl"
          />
          <label className="pop cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-100 text-violet-700 font-bold text-sm hover:bg-violet-200">
            <Upload className="h-4 w-4" />
            {uploading ? 'Uploading…' : photoUrl ? 'Change photo' : 'Upload photo'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                setUploading(true)
                try {
                  const url = await uploadPersonPhoto(file)
                  setPhotoUrl(url)
                } catch (err) {
                  alert(err instanceof Error ? err.message : String(err))
                } finally {
                  setUploading(false)
                }
              }}
            />
          </label>
          {photoUrl && (
            <button onClick={() => setPhotoUrl(null)} className="text-xs text-rose-500 hover:underline font-semibold">
              Remove photo
            </button>
          )}
        </div>
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300"
            autoFocus
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-full font-semibold text-gray-600 hover:bg-gray-100">Cancel</button>
          <button onClick={submit} className="px-4 py-2 rounded-full font-bold bg-violet-600 text-white hover:bg-violet-700">{person ? 'Save' : 'Create'}</button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Locations ───────────────────────────────────────────────────────────────

function LocationsAdmin() {
  const { data: locations = [] } = useLocations()
  const upsert = useUpsertLocation()
  const del = useDeleteLocation()
  const [editing, setEditing] = useState<Location | null>(null)
  const [creating, setCreating] = useState(false)

  return (
    <div>
      <button
        onClick={() => setCreating(true)}
        className="pop bg-violet-600 text-white rounded-full px-4 py-2 font-bold flex items-center gap-2 mb-4 hover:bg-violet-700 transition"
      >
        <Plus className="h-4 w-4" /> New room
      </button>
      <div className="space-y-2">
        {locations.map((l) => (
          <div key={l.id} className="bg-white/85 rounded-2xl p-3 flex items-center gap-3 shadow-sm border border-white">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center text-xl overflow-hidden">
              <IconDisplay icon={locationIcon(l)} className="text-xl" />
            </div>
            <div className="flex-1 font-bold text-gray-800">{l.name}</div>
            <button
              onClick={() => setEditing(l)}
              className="h-9 w-9 rounded-full bg-violet-100 hover:bg-violet-200 text-violet-700 flex items-center justify-center"
              aria-label="Edit"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete "${l.name}"? Chores in this room will become unassigned.`)) {
                  del.mutate(l.id)
                }
              }}
              className="h-9 w-9 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-700 flex items-center justify-center"
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {(editing || creating) && (
        <LocationForm
          location={editing}
          onSubmit={(payload) =>
            upsert.mutate(payload, {
              onSuccess: () => {
                setEditing(null)
                setCreating(false)
              },
            })
          }
          onClose={() => {
            setEditing(null)
            setCreating(false)
          }}
        />
      )}
    </div>
  )
}

function LocationForm({
  location,
  onSubmit,
  onClose,
}: {
  location: Location | null
  onSubmit: (payload: Partial<Location> & { name: string; id?: string }) => void
  onClose: () => void
}) {
  const [name, setName] = useState(location?.name ?? '')
  const [icon, setIcon] = useState(location?.icon ?? '')

  const submit = () => {
    if (!name.trim()) return
    onSubmit({ id: location?.id, name: name.trim(), icon: icon.trim() || null, sort_order: location?.sort_order ?? Date.now() })
  }

  return (
    <Modal open onClose={onClose} title={location ? 'Edit room' : 'New room'}>
      <div className="space-y-3">
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300"
            autoFocus
          />
        </Field>
        <Field label="Icon">
          <IconPicker value={icon} onChange={setIcon} presets={LOCATION_EMOJIS} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-full font-semibold text-gray-600 hover:bg-gray-100">Cancel</button>
          <button onClick={submit} className="px-4 py-2 rounded-full font-bold bg-violet-600 text-white hover:bg-violet-700">{location ? 'Save' : 'Create'}</button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Settings ────────────────────────────────────────────────────────────────

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={enabled}
      className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 ${
        enabled ? 'bg-violet-600' : 'bg-gray-200'
      }`}
    >
      <div
        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all duration-200 ${
          enabled ? 'left-7' : 'left-1'
        }`}
      />
    </button>
  )
}

function SettingsAdmin() {
  const [pinOn, setPinOn] = useState(isPinEnabled)
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const handleTogglePin = () => {
    const next = !pinOn
    setPinEnabled(next)
    setPinOn(next)
  }

  const handleSavePin = () => {
    setError('')
    if (!/^\d{4}$/.test(newPin)) {
      setError('PIN must be exactly 4 digits.')
      return
    }
    if (newPin !== confirmPin) {
      setError('PINs do not match.')
      return
    }
    setStoredPin(newPin)
    setNewPin('')
    setConfirmPin('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="max-w-sm space-y-4">
      <div className="bg-white/85 rounded-2xl p-5 shadow-sm border border-white space-y-5">
        <div>
          <h3 className="font-extrabold text-lg text-gray-800 mb-0.5">PIN Lock</h3>
          <p className="text-sm text-gray-500">
            Require a 4-digit PIN on each new browser session.
          </p>
        </div>

        {/* Enable / Disable toggle */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-bold text-gray-800 text-sm">Enable PIN lock</div>
            <div className="text-xs text-gray-500">{pinOn ? 'App is locked on new sessions' : 'App opens without a PIN'}</div>
          </div>
          <Toggle enabled={pinOn} onToggle={handleTogglePin} />
        </div>

        {/* Change PIN (only shown when PIN is enabled) */}
        {pinOn && (
          <div className="space-y-3 pt-1 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Default PIN: <span className="font-bold text-violet-600">{DEFAULT_PIN}</span>
            </p>

            <Field label="New PIN (4 digits)">
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300 text-center text-2xl tracking-widest font-bold"
              />
            </Field>

            <Field label="Confirm PIN">
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300 text-center text-2xl tracking-widest font-bold"
              />
            </Field>

            {error && <p className="text-sm text-rose-600 font-semibold">{error}</p>}

            <button
              onClick={handleSavePin}
              className="pop w-full flex items-center justify-center gap-2 py-2.5 rounded-full font-bold bg-violet-600 text-white hover:bg-violet-700 transition"
            >
              {saved ? (
                <><Check className="h-4 w-4" /> Saved!</>
              ) : (
                'Save new PIN'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Field helper ─────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-bold uppercase tracking-wider text-violet-500 mb-1">{label}</div>
      {children}
    </label>
  )
}
