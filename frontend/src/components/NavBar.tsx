import { NavLink } from 'react-router-dom';

export default function NavBar() {
  const linkStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    textDecoration: 'none',
    color: isActive ? '#fff' : '#333',
    background: isActive ? '#1976d2' : 'transparent',
    borderRadius: '4px',
    fontWeight: isActive ? 'bold' : 'normal',
  });

  return (
    <nav
      style={{
        display: 'flex',
        gap: '12px',
        padding: '12px 20px',
        background: '#f5f5f5',
        borderBottom: '1px solid #ddd',
      }}
    >
      <NavLink
        to="/orders"
        style={({ isActive }) => linkStyle(isActive)}
      >
        我的订单
      </NavLink>
      <NavLink
        to="/bots"
        style={({ isActive }) => linkStyle(isActive)}
      >
        Bot 管理
      </NavLink>
    </nav>
  );
}
