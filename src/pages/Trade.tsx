import { useState, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeftRight, ChevronDown, ChevronUp, Plus, Sparkles } from 'lucide-react'
import { Avatar } from '../components/Avatar'
import { IconDisplay } from '../components/IconDisplay'
import { Modal } from '../components/Modal'
import {
  useChores,
  useLocations,
  usePeople,
  useTrades,
  useCreateTrade,
  useAcceptTrade,
  useDeclineTrade,
  useCancelTrade,
} from '../lib/queries'
import type { Chore, Location, Person, Trade } from '../lib/database.types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

// ─── Swap visual (reused in cards + modals) ───────────────────────────────────

function TradeSwapVisual({
  proposer,
  target,
  proposerChore,
  targetChore,
}: {
  proposer: Person
  target: Person
  proposerChore: Chore
  targetChore: Chore
}) {
  return (
    <div className="flex items-stretch gap-3 bg-violet-50/70 rounded-2xl p-4">
      {/* Proposer side */}
      <div className="flex-1 text-center min-w-0">
        <div className="flex items-center gap-1.5 justify-center mb-2">
          <Avatar person={proposer} size="xs" />
          <span className="text-[11px] font-bold text-gray-500 truncate">{proposer.name} gives</span>
        </div>
        <div className="h-12 w-12 mx-auto rounded-2xl bg-white shadow-sm flex items-center justify-center text-2xl mb-2 overflow-hidden">
          {proposerChore.icon ? (
            <IconDisplay icon={proposerChore.icon} />
          ) : (
            <span className="text-gray-300 text-lg">?</span>
          )}
        </div>
        <div className="font-extrabold text-sm text-gray-800 leading-tight truncate px-1">
          {proposerChore.name}
        </div>
        <div className="flex items-center justify-center gap-0.5 text-xs text-amber-600 font-semibold mt-0.5">
          <Sparkles className="h-3 w-3" />{proposerChore.points} pts
        </div>
      </div>

      {/* Arrow */}
      <div className="flex items-center shrink-0">
        <ArrowLeftRight className="h-5 w-5 text-violet-400" />
      </div>

      {/* Target side */}
      <div className="flex-1 text-center min-w-0">
        <div className="flex items-center gap-1.5 justify-center mb-2">
          <Avatar person={target} size="xs" />
          <span className="text-[11px] font-bold text-gray-500 truncate">{target.name} gives</span>
        </div>
        <div className="h-12 w-12 mx-auto rounded-2xl bg-white shadow-sm flex items-center justify-center text-2xl mb-2 overflow-hidden">
          {targetChore.icon ? (
            <IconDisplay icon={targetChore.icon} />
          ) : (
            <span className="text-gray-300 text-lg">?</span>
          )}
        </div>
        <div className="font-extrabold text-sm text-gray-800 leading-tight truncate px-1">
          {targetChore.name}
        </div>
        <div className="flex items-center justify-center gap-0.5 text-xs text-amber-600 font-semibold mt-0.5">
          <Sparkles className="h-3 w-3" />{targetChore.points} pts
        </div>
      </div>
    </div>
  )
}

// ─── Chore picker row (used in create flow) ───────────────────────────────────

function ChoreRow({
  chore,
  location,
  selected,
  onClick,
}: {
  chore: Chore
  location?: Location | null
  selected?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-2xl transition text-left ${
        selected
          ? 'bg-violet-200 ring-2 ring-violet-400'
          : 'bg-violet-50/60 hover:bg-violet-100 active:bg-violet-200'
      }`}
    >
      <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-xl shrink-0 overflow-hidden">
        {chore.icon ? <IconDisplay icon={chore.icon} /> : <span className="text-gray-300">?</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-gray-800 truncate">{chore.name}</div>
        {location && (
          <div className="text-xs text-gray-400 font-medium truncate">{location.name}</div>
        )}
      </div>
      <span className="flex items-center gap-0.5 text-amber-600 font-semibold text-sm shrink-0">
        <Sparkles className="h-3.5 w-3.5" />{chore.points}
      </span>
    </button>
  )
}

// ─── Pending trade card ───────────────────────────────────────────────────────

function PendingTradeCard({
  trade,
  peopleById,
  choresById,
  onAccept,
  onDecline,
  onWithdraw,
}: {
  trade: Trade
  peopleById: Record<string, Person>
  choresById: Record<string, Chore>
  onAccept: () => void
  onDecline: () => void
  onWithdraw: () => void
}) {
  const proposer = peopleById[trade.proposer_id]
  const target = peopleById[trade.target_id]
  const proposerChore = choresById[trade.proposer_chore_id]
  const targetChore = choresById[trade.target_chore_id]
  if (!proposer || !target || !proposerChore || !targetChore) return null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="bg-white/90 backdrop-blur rounded-3xl shadow-md border border-violet-100 p-4"
    >
      {/* Header row */}
      <div className="flex items-center gap-2 mb-3">
        <Avatar person={proposer} size="sm" />
        <div className="flex-1 min-w-0 text-sm">
          <span className="font-extrabold text-gray-800">{proposer.name}</span>
          <span className="text-gray-400 mx-1">→</span>
          <span className="font-extrabold text-gray-800">{target.name}</span>
        </div>
        <span className="text-xs text-gray-400 shrink-0">{formatTimeAgo(trade.created_at)}</span>
      </div>

      <TradeSwapVisual
        proposer={proposer}
        target={target}
        proposerChore={proposerChore}
        targetChore={targetChore}
      />

      <p className="text-[10px] text-center text-gray-400 uppercase tracking-wider font-bold mt-2 mb-3">
        Permanent reassignment
      </p>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onDecline}
          className="flex-1 py-2.5 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:border-rose-300 hover:text-rose-600 transition"
        >
          Decline
        </button>
        <button
          onClick={onAccept}
          className="flex-1 py-2.5 rounded-2xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-700 transition shadow-sm shadow-violet-200"
        >
          Accept
        </button>
      </div>

      <div className="text-center mt-2.5">
        <button
          onClick={onWithdraw}
          className="text-xs text-gray-400 hover:text-gray-600 transition underline underline-offset-2"
        >
          Withdraw offer (if you proposed this)
        </button>
      </div>
    </motion.div>
  )
}

// ─── Past trade card ──────────────────────────────────────────────────────────

function PastTradeCard({
  trade,
  peopleById,
  choresById,
}: {
  trade: Trade
  peopleById: Record<string, Person>
  choresById: Record<string, Chore>
}) {
  const proposer = peopleById[trade.proposer_id]
  const target = peopleById[trade.target_id]
  const proposerChore = choresById[trade.proposer_chore_id]
  const targetChore = choresById[trade.target_chore_id]
  if (!proposer || !target || !proposerChore || !targetChore) return null

  const statusConfig = {
    accepted: { label: 'Accepted', cls: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
    declined: { label: 'Declined', cls: 'text-rose-400', bg: 'bg-gray-50 border-gray-100' },
    cancelled: { label: 'Withdrawn', cls: 'text-gray-400', bg: 'bg-gray-50 border-gray-100' },
    pending: { label: 'Pending', cls: 'text-violet-500', bg: 'bg-violet-50 border-violet-100' },
  }
  const cfg = statusConfig[trade.status]

  return (
    <div className={`rounded-2xl border p-3 opacity-75 ${cfg.bg}`}>
      <div className="flex items-center gap-2 mb-2">
        <Avatar person={proposer} size="xs" />
        <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">
          <strong>{proposer.name}</strong>
          <span className="text-gray-400 mx-1">→</span>
          <strong>{target.name}</strong>
        </span>
        <span className={`text-xs font-extrabold uppercase tracking-wider shrink-0 ${cfg.cls}`}>
          {cfg.label}
        </span>
        <span className="text-xs text-gray-400 shrink-0">
          {formatTimeAgo(trade.resolved_at ?? trade.created_at)}
        </span>
      </div>
      <div className="flex items-center gap-2 px-1">
        <div className="h-6 w-6 rounded-lg bg-white/80 flex items-center justify-center text-sm shrink-0 overflow-hidden">
          {proposerChore.icon ? <IconDisplay icon={proposerChore.icon} /> : null}
        </div>
        <span className="text-sm font-semibold text-gray-600 truncate">{proposerChore.name}</span>
        <ArrowLeftRight className="h-3 w-3 text-gray-300 shrink-0" />
        <div className="h-6 w-6 rounded-lg bg-white/80 flex items-center justify-center text-sm shrink-0 overflow-hidden">
          {targetChore.icon ? <IconDisplay icon={targetChore.icon} /> : null}
        </div>
        <span className="text-sm font-semibold text-gray-600 truncate">{targetChore.name}</span>
      </div>
    </div>
  )
}

// ─── Identity confirm box (shared by accept & decline modals) ─────────────────

function IdentityBox({
  person,
  tone,
}: {
  person: Person
  tone: 'violet' | 'rose'
}) {
  const styles = {
    violet: 'bg-violet-50 border-violet-200 text-violet-800',
    rose: 'bg-rose-50 border-rose-200 text-rose-800',
  }
  return (
    <div className={`mt-4 border rounded-2xl p-4 ${styles[tone]}`}>
      <p className="font-bold text-sm mb-1">Confirm your identity</p>
      <p className="text-sm opacity-80 mb-3">
        Only <strong>{person.name}</strong> should do this.
      </p>
      <div className="flex items-center gap-3">
        <Avatar person={person} size="md" />
        <span className="font-extrabold text-gray-800 text-lg">{person.name}</span>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type CreateStep = 'who' | 'my-chore' | 'their-chore' | 'confirm'

export function Trade() {
  const { data: people = [] } = usePeople()
  const { data: locations = [] } = useLocations()
  const { data: chores = [] } = useChores()
  const { data: trades = [] } = useTrades()
  const createMut = useCreateTrade()
  const acceptMut = useAcceptTrade()
  const declineMut = useDeclineTrade()
  const cancelMut = useCancelTrade()

  // Create flow
  const [createStep, setCreateStep] = useState<CreateStep | null>(null)
  const [proposer, setProposer] = useState<Person | null>(null)
  const [proposerChore, setProposerChore] = useState<Chore | null>(null)
  const [targetChore, setTargetChore] = useState<Chore | null>(null)

  // Action modals
  const [acceptingTrade, setAcceptingTrade] = useState<Trade | null>(null)
  const [decliningTrade, setDecliningTrade] = useState<Trade | null>(null)
  const [withdrawingTrade, setWithdrawingTrade] = useState<Trade | null>(null)
  const [showPast, setShowPast] = useState(false)

  // Lookup maps
  const peopleById = useMemo(
    () => Object.fromEntries(people.map((p) => [p.id, p])),
    [people],
  )
  const choresById = useMemo(
    () => Object.fromEntries(chores.map((c) => [c.id, c])),
    [chores],
  )
  const locationsById = useMemo(
    () => Object.fromEntries(locations.map((l) => [l.id, l])),
    [locations],
  )

  // Split trades
  const pendingTrades = useMemo(
    () =>
      [...trades]
        .filter((t) => t.status === 'pending')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [trades],
  )
  const pastTrades = useMemo(
    () =>
      [...trades]
        .filter((t) => t.status !== 'pending')
        .sort(
          (a, b) =>
            new Date(b.resolved_at ?? b.created_at).getTime() -
            new Date(a.resolved_at ?? a.created_at).getTime(),
        ),
    [trades],
  )

  // Create flow: chores available to proposer
  const myChores = useMemo(
    () => (proposer ? chores.filter((c) => c.default_person_id === proposer.id) : []),
    [chores, proposer],
  )

  // Create flow: other people's chores grouped by person
  const othersGroups = useMemo(() => {
    if (!proposer) return []
    return people
      .filter((p) => p.id !== proposer.id)
      .map((p) => ({
        person: p,
        chores: chores.filter((c) => c.default_person_id === p.id),
      }))
      .filter((g) => g.chores.length > 0)
  }, [chores, people, proposer])

  const targetPerson = useMemo(
    () =>
      targetChore?.default_person_id
        ? (peopleById[targetChore.default_person_id] ?? null)
        : null,
    [targetChore, peopleById],
  )

  function resetCreate() {
    setCreateStep(null)
    setProposer(null)
    setProposerChore(null)
    setTargetChore(null)
  }

  async function submitTrade() {
    if (!proposer || !proposerChore || !targetChore || !targetPerson) return
    try {
      await createMut.mutateAsync({
        proposer_id: proposer.id,
        proposer_chore_id: proposerChore.id,
        target_id: targetPerson.id,
        target_chore_id: targetChore.id,
      })
      resetCreate()
    } catch {
      alert('Failed to create trade offer. Please try again.')
    }
  }

  const createStepTitles: Record<CreateStep, string> = {
    'who': 'Propose a Trade',
    'my-chore': 'Your Chore',
    'their-chore': 'Their Chore',
    'confirm': 'Confirm Trade',
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pt-6 pb-8">
      {/* Page header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-800">Trades</h2>
          <p className="text-sm text-gray-500 mt-0.5">Swap chore assignments permanently</p>
        </div>
        <button
          onClick={() => setCreateStep('who')}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold px-4 py-2.5 rounded-2xl transition shadow-md shadow-violet-200 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Propose
        </button>
      </div>

      {/* Empty state */}
      {pendingTrades.length === 0 && pastTrades.length === 0 && (
        <div className="bg-white/80 backdrop-blur rounded-3xl p-12 text-center border border-white shadow-lg">
          <div className="h-16 w-16 rounded-3xl bg-violet-100 flex items-center justify-center mx-auto mb-4">
            <ArrowLeftRight className="h-8 w-8 text-violet-500" />
          </div>
          <div className="font-extrabold text-xl text-gray-700 mb-1">No trades yet</div>
          <div className="text-gray-500 text-sm">
            Propose a trade to permanently swap a chore with someone.
          </div>
        </div>
      )}

      {/* Pending trades */}
      {pendingTrades.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-extrabold uppercase tracking-wider text-violet-500 mb-3">
            Open Offers ({pendingTrades.length})
          </p>
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {pendingTrades.map((trade) => (
                <PendingTradeCard
                  key={trade.id}
                  trade={trade}
                  peopleById={peopleById}
                  choresById={choresById}
                  onAccept={() => setAcceptingTrade(trade)}
                  onDecline={() => setDecliningTrade(trade)}
                  onWithdraw={() => setWithdrawingTrade(trade)}
                />
              ))}
            </div>
          </AnimatePresence>
        </div>
      )}

      {/* Past trades (collapsible) */}
      {pastTrades.length > 0 && (
        <div>
          <button
            onClick={() => setShowPast((v) => !v)}
            className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition mb-2"
          >
            {showPast ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            {pastTrades.length} past trade{pastTrades.length !== 1 ? 's' : ''}
          </button>
          <AnimatePresence>
            {showPast && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 overflow-hidden"
              >
                {pastTrades.map((trade) => (
                  <PastTradeCard
                    key={trade.id}
                    trade={trade}
                    peopleById={peopleById}
                    choresById={choresById}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── CREATE TRADE MODAL ───────────────────────────────────────────────── */}
      <Modal
        open={createStep !== null}
        onClose={resetCreate}
        title={createStep ? createStepTitles[createStep] : ''}
      >
        {/* Step 1: Who are you? */}
        {createStep === 'who' && (
          <div className="space-y-2 pt-1">
            <p className="text-sm text-gray-500 mb-3">Who are you?</p>
            {people.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setProposer(p)
                  setProposerChore(null)
                  setTargetChore(null)
                  setCreateStep('my-chore')
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-violet-50/60 hover:bg-violet-100 active:bg-violet-200 transition"
              >
                <Avatar person={p} size="md" />
                <span className="font-bold text-gray-800 text-lg">{p.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Which of your chores to give? */}
        {createStep === 'my-chore' && proposer && (
          <div className="pt-1">
            <p className="text-sm text-gray-500 mb-3">
              Which chore do you want to trade away,{' '}
              <strong>{proposer.name}</strong>?
            </p>
            {myChores.length === 0 ? (
              <p className="text-center text-gray-400 py-6">
                You have no assigned chores to trade.
              </p>
            ) : (
              <div className="space-y-2">
                {myChores.map((c) => (
                  <ChoreRow
                    key={c.id}
                    chore={c}
                    location={c.location_id ? locationsById[c.location_id] : null}
                    selected={proposerChore?.id === c.id}
                    onClick={() => {
                      setProposerChore(c)
                      setTargetChore(null)
                      setCreateStep('their-chore')
                    }}
                  />
                ))}
              </div>
            )}
            <button
              onClick={() => setCreateStep('who')}
              className="mt-4 text-sm text-gray-400 hover:text-gray-600 transition"
            >
              ← Back
            </button>
          </div>
        )}

        {/* Step 3: Which chore do you want in return? */}
        {createStep === 'their-chore' && proposer && (
          <div className="pt-1">
            <p className="text-sm text-gray-500 mb-3">
              Which chore do you want in return?
            </p>
            {othersGroups.length === 0 ? (
              <p className="text-center text-gray-400 py-6">
                No other assigned chores available to trade for.
              </p>
            ) : (
              <div className="space-y-4">
                {othersGroups.map(({ person, chores: personChores }) => (
                  <div key={person.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar person={person} size="xs" />
                      <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
                        {person.name}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {personChores.map((c) => (
                        <ChoreRow
                          key={c.id}
                          chore={c}
                          location={c.location_id ? locationsById[c.location_id] : null}
                          selected={targetChore?.id === c.id}
                          onClick={() => {
                            setTargetChore(c)
                            setCreateStep('confirm')
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setCreateStep('my-chore')}
              className="mt-4 text-sm text-gray-400 hover:text-gray-600 transition"
            >
              ← Back
            </button>
          </div>
        )}

        {/* Step 4: Confirm */}
        {createStep === 'confirm' &&
          proposer &&
          proposerChore &&
          targetChore &&
          targetPerson && (
            <div className="pt-1">
              <p className="text-sm text-gray-500 mb-4">Review your offer:</p>
              <TradeSwapVisual
                proposer={proposer}
                target={targetPerson}
                proposerChore={proposerChore}
                targetChore={targetChore}
              />
              <p className="text-xs text-center text-gray-400 mt-3 mb-5">
                This is permanent — both chores will be reassigned forever once{' '}
                <strong>{targetPerson.name}</strong> accepts.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCreateStep('their-chore')}
                  className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition"
                >
                  Back
                </button>
                <button
                  onClick={submitTrade}
                  disabled={createMut.isPending}
                  className="flex-1 py-3 rounded-2xl bg-violet-600 text-white font-bold hover:bg-violet-700 transition disabled:opacity-50"
                >
                  {createMut.isPending ? 'Sending…' : 'Send Offer'}
                </button>
              </div>
            </div>
          )}
      </Modal>

      {/* ── ACCEPT MODAL ────────────────────────────────────────────────────── */}
      <Modal
        open={acceptingTrade !== null}
        onClose={() => setAcceptingTrade(null)}
        title="Accept Trade"
      >
        {acceptingTrade && (() => {
          const aProposer = peopleById[acceptingTrade.proposer_id]
          const aTarget = peopleById[acceptingTrade.target_id]
          const aProposerChore = choresById[acceptingTrade.proposer_chore_id]
          const aTargetChore = choresById[acceptingTrade.target_chore_id]
          if (!aProposer || !aTarget || !aProposerChore || !aTargetChore) return null
          return (
            <div className="pt-1">
              <TradeSwapVisual
                proposer={aProposer}
                target={aTarget}
                proposerChore={aProposerChore}
                targetChore={aTargetChore}
              />
              <IdentityBox person={aTarget} tone="violet" />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setAcceptingTrade(null)}
                  className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      await acceptMut.mutateAsync(acceptingTrade)
                      setAcceptingTrade(null)
                    } catch {
                      alert('Failed to accept trade. Please try again.')
                    }
                  }}
                  disabled={acceptMut.isPending}
                  className="flex-1 py-3 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {acceptMut.isPending ? 'Accepting…' : `Yes, I'm ${aTarget.name}`}
                </button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* ── DECLINE MODAL ───────────────────────────────────────────────────── */}
      <Modal
        open={decliningTrade !== null}
        onClose={() => setDecliningTrade(null)}
        title="Decline Trade"
      >
        {decliningTrade && (() => {
          const dProposer = peopleById[decliningTrade.proposer_id]
          const dTarget = peopleById[decliningTrade.target_id]
          const dProposerChore = choresById[decliningTrade.proposer_chore_id]
          const dTargetChore = choresById[decliningTrade.target_chore_id]
          if (!dProposer || !dTarget || !dProposerChore || !dTargetChore) return null
          return (
            <div className="pt-1">
              <TradeSwapVisual
                proposer={dProposer}
                target={dTarget}
                proposerChore={dProposerChore}
                targetChore={dTargetChore}
              />
              <IdentityBox person={dTarget} tone="rose" />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setDecliningTrade(null)}
                  className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition"
                >
                  Go Back
                </button>
                <button
                  onClick={async () => {
                    try {
                      await declineMut.mutateAsync(decliningTrade.id)
                      setDecliningTrade(null)
                    } catch {
                      alert('Failed to decline trade. Please try again.')
                    }
                  }}
                  disabled={declineMut.isPending}
                  className="flex-1 py-3 rounded-2xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition disabled:opacity-50"
                >
                  {declineMut.isPending ? 'Declining…' : `Yes, Decline`}
                </button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* ── WITHDRAW MODAL ──────────────────────────────────────────────────── */}
      <Modal
        open={withdrawingTrade !== null}
        onClose={() => setWithdrawingTrade(null)}
        title="Withdraw Offer"
      >
        {withdrawingTrade && (
          <div className="pt-1">
            <p className="text-gray-600 text-sm mb-5">
              Are you sure you want to withdraw this trade offer? The other
              person won't be able to accept it anymore.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setWithdrawingTrade(null)}
                className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition"
              >
                Keep Offer
              </button>
              <button
                onClick={async () => {
                  try {
                    await cancelMut.mutateAsync(withdrawingTrade.id)
                    setWithdrawingTrade(null)
                  } catch {
                    alert('Failed to withdraw. Please try again.')
                  }
                }}
                disabled={cancelMut.isPending}
                className="flex-1 py-3 rounded-2xl bg-gray-600 text-white font-bold hover:bg-gray-700 transition disabled:opacity-50"
              >
                {cancelMut.isPending ? 'Withdrawing…' : 'Withdraw'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
