import { NavLink } from 'react-router-dom'
import { HomeIcon, HistoryIcon, CalendarIcon, SettingsIcon } from './icons'

const tabs = [
  { to: '/', label: 'Inicio', Icon: HomeIcon, end: true },
  { to: '/history', label: 'Historial', Icon: HistoryIcon, end: false },
  { to: '/calendar', label: 'Calendario', Icon: CalendarIcon, end: false },
  { to: '/settings', label: 'Ajustes', Icon: SettingsIcon, end: false },
]

/** Bottom nav for the 4 root screens only — flow/secondary screens render without it. */
export function TabBar() {
  return (
    <div className="flex h-[66px] flex-shrink-0 items-center justify-around border-t border-border bg-bg-elevated">
      {tabs.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 ${isActive ? 'text-accent' : 'text-text-tertiary'}`
          }
        >
          {({ isActive }) => (
            <>
              <Icon width={21} height={21} />
              <span className={`text-[10.5px] ${isActive ? 'font-semibold' : 'font-medium'}`}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  )
}
