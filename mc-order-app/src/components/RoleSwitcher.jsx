import { useOrder } from '../store/OrderContext';

export default function RoleSwitcher() {
  const { state, setRole } = useOrder();

  return (
    <div className="role-switcher">
      <button
        className={`role-btn ${state.role === 'customer' ? 'active' : ''}`}
        onClick={() => setRole('customer')}
      >
        顾客
      </button>
      <button
        className={`role-btn ${state.role === 'manager' ? 'active' : ''}`}
        onClick={() => setRole('manager')}
      >
        经理
      </button>
    </div>
  );
}
