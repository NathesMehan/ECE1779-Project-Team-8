
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Sidebar.css'

function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const navItems = [
    { label: 'Dashboard', path: '/' },
    { label: 'Workspaces', path: '/workspaces' },
    { label: 'AI Chat', path: '/chat' },
    { label: 'Activity', path: '/activity' },
  ]

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">✦</div>
        <div>
          <h2>Context</h2>
          <span>WORKSPACE</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <p className="nav-heading">MAIN MENU</p>

        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-user">
        <div className="sidebar-user-avatar">
          {user?.name.charAt(0).toUpperCase() || 'U'}
        </div>

        <div className="sidebar-user-info">
          <strong>{user?.name || 'User'}</strong>
          <span>{user?.email}</span>
        </div>
      </div>

      <button
        className="sidebar-logout"
        onClick={handleLogout}
        type="button"
      >
        ↪ Sign Out
      </button>

      <div className="sidebar-footer">
        <p>LLM Context Workspace</p>
        <span>ECE1779 Course Project</span>
      </div>
    </aside>
  )
}

export default Sidebar
