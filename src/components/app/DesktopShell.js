'use client'
import { Bell, Home, MessageCircle, Search, Settings, ShoppingBag, User, Users, Megaphone, Plus } from 'lucide-react'
import { Avatar } from '@/components/common/Avatar'
import { FLITTERS_MARK } from '@/lib/flitters-mark'

// On wide screens (desktop / laptop / big tablet) the app shows a left sidebar
// with the main navigation and keeps the content in a centered column.
// On phones the sidebar is hidden by CSS (see "DESKTOP LAYOUT" in globals.css),
// so nothing changes there.
export function DesktopShell({ children, tab, onNav, badges = {}, onSearch, onProfile, onSettings, onCompose, onAdmin, isAdmin, user, avatarUrl, color }) {
  const items = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'messages', label: 'Messages', icon: MessageCircle },
    { id: 'pulse', label: 'Store', icon: ShoppingBag },
    { id: 'friends', label: 'People', icon: Users },
    { id: 'notifications', label: 'Alerts', icon: Bell },
  ]
  return (
    <div className="dk-root">
      <aside className="dk-side" aria-label="Main navigation">
        <div className="dk-brand" onClick={() => onNav('home')} role="button" tabIndex={0}>
          <img src={FLITTERS_MARK} alt="Flitters" width="34" height="34" style={{ objectFit: 'contain' }} />
          <span>Flitters</span>
        </div>
        <nav className="dk-nav">
          {items.map(({ id, label, icon: Icon }) => {
            const n = badges[id] || 0
            const active = tab === id
            return (
              <button key={id} className={'dk-item' + (active ? ' active' : '')} onClick={() => onNav(id)}>
                <span className="dk-ico"><Icon size={24} />{n > 0 && <i className="dk-badge">{n > 9 ? '9+' : n}</i>}{!n && badges[id + 'Dot'] && <i className="dk-dot" />}</span>
                <span className="dk-label">{label}</span>
              </button>
            )
          })}
          <button className="dk-item" onClick={onSearch}><span className="dk-ico"><Search size={24} /></span><span className="dk-label">Search</span></button>
          <button className="dk-item" onClick={onProfile}><span className="dk-ico"><User size={24} /></span><span className="dk-label">Profile</span></button>
          <button className="dk-item" onClick={onSettings}><span className="dk-ico"><Settings size={24} /></span><span className="dk-label">Settings</span></button>
          {isAdmin && <button className="dk-item" onClick={onAdmin}><span className="dk-ico"><Megaphone size={24} /></span><span className="dk-label">Ads</span></button>}
        </nav>
        <button className="dk-post" onClick={onCompose}><Plus size={20} /> Post</button>
        <button className="dk-me" onClick={onProfile}>
          <Avatar url={avatarUrl} name={user?.display_name} color={color} size={38} />
          <span className="dk-me-text">
            <b>{user?.display_name}</b>
            <small>@{user?.username}</small>
          </span>
        </button>
      </aside>
      <div className="dk-main">{children}</div>
    </div>
  )
}
