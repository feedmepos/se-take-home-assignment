export default function OrderBadge({ type }) {
	return (
		<span className={`badge badge--${type === 'vip' ? 'vip' : 'normal'}`}>
			{type === 'vip' ? 'VIP' : 'NORMAL'}
		</span>
	);
}
