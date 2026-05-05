import { useState } from 'react'
import { motion } from 'framer-motion'

const PIN_KEY = 'chores_pin'
const PIN_ENABLED_KEY = 'chores_pin_enabled'
const UNLOCK_KEY = 'chores_unlocked'
export const DEFAULT_PIN = '1234'

export function getStoredPin(): string {
  return localStorage.getItem(PIN_KEY) ?? DEFAULT_PIN
}

export function setStoredPin(pin: string): void {
  localStorage.setItem(PIN_KEY, pin)
}

export function isPinEnabled(): boolean {
  const stored = localStorage.getItem(PIN_ENABLED_KEY)
  return stored === null ? true : stored === 'true'
}

export function setPinEnabled(enabled: boolean): void {
  localStorage.setItem(PIN_ENABLED_KEY, String(enabled))
  // If disabling, mark the session as unlocked so re-renders immediately
  if (!enabled) sessionStorage.setItem(UNLOCK_KEY, '1')
}

function isUnlocked(): boolean {
  return !isPinEnabled() || sessionStorage.getItem(UNLOCK_KEY) === '1'
}

const DIGITS = 4

export function PinGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(isUnlocked)
  const [input, setInput] = useState('')
  const [shake, setShake] = useState(false)

  const handleDigit = (d: string) => {
    if (shake || input.length >= DIGITS) return
    const next = input + d
    setInput(next)
    if (next.length === DIGITS) {
      if (next === getStoredPin()) {
        sessionStorage.setItem(UNLOCK_KEY, '1')
        setUnlocked(true)
      } else {
        setShake(true)
        setTimeout(() => {
          setInput('')
          setShake(false)
        }, 520)
      }
    }
  }

  const handleBackspace = () => {
    if (!shake) setInput((v) => v.slice(0, -1))
  }

  if (unlocked) return <>{children}</>

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center gap-8 z-[100]"
      style={{
        background:
          'radial-gradient(at 80% 0%, #ffe6f3 0px, transparent 50%), radial-gradient(at 0% 50%, #e0f4ff 0px, transparent 50%), radial-gradient(at 80% 100%, #f0e6ff 0px, transparent 50%), #fefcff',
      }}
    >
      {/* Header */}
      <div className="text-center select-none">
        <div className="text-6xl mb-3">🧹</div>
        <h1 className="text-4xl font-extrabold text-gray-800">Chores</h1>
        <p className="text-gray-500 font-semibold mt-1.5">Enter PIN to continue</p>
      </div>

      {/* Dot indicators */}
      <motion.div
        animate={shake ? { x: [-10, 10, -10, 10, -6, 6, -2, 2, 0] } : { x: 0 }}
        transition={{ duration: 0.5 }}
        className="flex gap-4"
      >
        {Array.from({ length: DIGITS }).map((_, i) => (
          <div
            key={i}
            className={`h-4 w-4 rounded-full transition-all duration-150 ${
              i < input.length
                ? shake
                  ? 'bg-rose-500 scale-110'
                  : 'bg-violet-600 scale-110'
                : 'bg-gray-200'
            }`}
          />
        ))}
      </motion.div>

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-3 w-64">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button
            key={d}
            onClick={() => handleDigit(d)}
            className="pop h-16 rounded-2xl bg-white/90 backdrop-blur shadow-sm border border-white/80 text-2xl font-bold text-gray-800 hover:bg-violet-50 hover:shadow-md active:scale-95 transition"
          >
            {d}
          </button>
        ))}
        <div />
        <button
          onClick={() => handleDigit('0')}
          className="pop h-16 rounded-2xl bg-white/90 backdrop-blur shadow-sm border border-white/80 text-2xl font-bold text-gray-800 hover:bg-violet-50 hover:shadow-md active:scale-95 transition"
        >
          0
        </button>
        <button
          onClick={handleBackspace}
          className="pop h-16 rounded-2xl bg-white/90 backdrop-blur shadow-sm border border-white/80 text-xl font-bold text-gray-400 hover:bg-rose-50 hover:text-rose-500 hover:shadow-md active:scale-95 transition"
          aria-label="Backspace"
        >
          ⌫
        </button>
      </div>

      <p className="text-xs text-gray-400 select-none">Default PIN: 1234 · Change in Admin → Settings</p>
    </div>
  )
}
