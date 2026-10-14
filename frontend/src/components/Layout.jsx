import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import useAuth from '../hooks/useAuth.js'

const navClass = ({ isActive }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-white/15 text-white' : 'text-indigo-100 hover:bg-white/10 hover:text-white'
  }`

function UserMenu() {
  const { user, logout } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-2 px-2 py-1 text-sm text-indigo-100" title={user.email_address}>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-semibold text-white">
          {user.name.charAt(0).toUpperCase()}
        </span>
        <span className="hidden sm:inline">{user.name}</span>
      </span>
      <button
        type="button"
        disabled={signingOut}
        onClick={() => {
          setSigningOut(true)
          logout()
        }}
        className="rounded-md px-2 py-1 text-sm font-medium text-indigo-100 hover:bg-white/10 hover:text-white disabled:opacity-60"
      >
        Sign out
      </button>
    </div>
  )
}

export default function Layout() {
  return (
    <div className="min-h-screen">
      <header className="bg-gradient-to-r from-indigo-700 to-indigo-600 shadow">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <NavLink to="/" className="flex items-center gap-2 text-white">
              <img src="/favicon.svg" alt="" className="h-7 w-7 rounded-md ring-1 ring-white/30" />
              <span className="text-lg font-semibold tracking-tight">NetAssign</span>
            </NavLink>
            <nav className="hidden gap-1 sm:flex">
              <NavLink to="/" end className={navClass}>
                Dashboard
              </NavLink>
              <NavLink to="/audit" className={navClass}>
                Audit Logs
              </NavLink>
            </nav>
          </div>
          <UserMenu />
        </div>
        <nav className="flex gap-1 px-4 pb-2 sm:hidden">
          <NavLink to="/" end className={navClass}>
            Dashboard
          </NavLink>
          <NavLink to="/audit" className={navClass}>
            Audit Logs
          </NavLink>
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
