import { Outlet } from 'react-router-dom'
import { TabBar } from './ui/TabBar'

/** Wraps the 4 root screens (Home, History, Calendar, Settings) with the bottom tab bar. */
export function Layout() {
  return (
    <>
      <Outlet />
      <TabBar />
    </>
  )
}
