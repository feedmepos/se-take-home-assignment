import robotBotIcon from '../../../assets/png/robot-2.png';
import useNowTick from '../../../hooks/useNowTick';
import {
	getCookingProgress,
	TOTAL_SECONDS,
} from '../../../utils/cookingProgress';
import OrderBadge from '../OrderBadge';

export default function CookingBotItem({ bot, getOrder }) {
	const isProcessing = bot.status === 'processing';
	const order =
		isProcessing && bot.orderId != null ? getOrder(bot.orderId) : null;
	const now = useNowTick(isProcessing);
	const progress =
		isProcessing && bot.processingStartedAt != null
			? getCookingProgress(bot.processingStartedAt, now)
			: null;

	return (
		<li
			className={`bot-row ${isProcessing ? 'bot-row--cooking' : 'bot-row--idle'}`}
		>
			<div className="bot-row__icon">
				<img
					src={robotBotIcon}
					alt=""
					className={`bot-row__icon-img ${!isProcessing ? 'bot-row__icon-img--dimmed' : ''}`}
				/>
			</div>
			<div className="bot-row__content">
				<div className="bot-row__header">
					<span className="bot-row__name">Bot #{bot.id}</span>
					<span
						className={`badge ${isProcessing ? 'badge--cooking' : 'badge--idle'}`}
					>
						{isProcessing ? 'COOKING' : 'IDLE'}
					</span>
				</div>

				{isProcessing && order ? (
					<>
						<div className="bot-row__order">
							<span className="bot-row__order-label">Current Order</span>
							<span className="bot-row__order-id">#{order.id}</span>
							<OrderBadge type={order.type} />
						</div>
						<div className="bot-row__progress-wrap">
							<div className="bot-row__progress-track">
								<div
									className="bot-row__progress-fill"
									style={{ width: `${progress.percent}%` }}
								/>
							</div>
							<span className="bot-row__timer">
								{progress.secondsLeft}s / {TOTAL_SECONDS}s
							</span>
						</div>
					</>
				) : (
					<div className="bot-row__idle-text">
						<span>Idle</span>
						<span className="bot-row__waiting">Waiting for order...</span>
					</div>
				)}
			</div>
		</li>
	);
}
