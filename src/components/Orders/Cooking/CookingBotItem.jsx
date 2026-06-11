import robotBotIcon from '../../../assets/png/robot-2.png';
import useNowTick from '../../../hooks/useNowTick';
import { getProcessTimeMs } from '../../../hooks/useOrderController';
import {
	getCancellationProgress,
	getCookingProgress,
} from '../../../utils/cookingProgress';
import OrderBadge from '../OrderBadge';

export default function CookingBotItem({ bot, getOrder }) {
	const isProcessing = bot.status === 'processing';
	const isCancelling = bot.status === 'cancelling';
	const isReserved = bot.status === 'reserved';
	const isActive = isProcessing || isCancelling;
	const order =
		(isProcessing || isCancelling) && bot.orderId != null
			? getOrder(bot.orderId)
			: isReserved && bot.reservedForOrderId != null
				? getOrder(bot.reservedForOrderId)
				: null;
	const now = useNowTick(isActive);
	const processTimeMs = getProcessTimeMs(bot);
	const progress =
		isProcessing && bot.processingStartedAt != null
			? getCookingProgress(bot.processingStartedAt, now, processTimeMs)
			: null;
	const cancellationProgress =
		isCancelling && bot.cancellationStartedAt != null
			? getCancellationProgress(bot.cancellationStartedAt, now)
			: null;

	const badgeClass = isCancelling
		? 'badge--cancelling'
		: isProcessing
			? 'badge--cooking'
			: isReserved
				? 'badge--reserved'
				: 'badge--idle';
	const badgeLabel = isCancelling
		? 'CANCELLING'
		: isProcessing
			? 'COOKING'
			: isReserved
				? 'AWAITING'
				: 'IDLE';

	return (
		<li
			className={`bot-row ${isActive ? 'bot-row--cooking' : 'bot-row--idle'}`}
		>
			<div className="bot-row__icon">
				<img
					src={robotBotIcon}
					alt=""
					className={`bot-row__icon-img ${!isActive && !isReserved ? 'bot-row__icon-img--dimmed' : ''}`}
				/>
			</div>
			<div className="bot-row__content">
				<div className="bot-row__header">
					<span className="bot-row__name">
						{bot.type === 'fast' ? 'Fast ' : ''}Bot #{bot.id}
					</span>
					<span className={`badge ${badgeClass}`}>{badgeLabel}</span>
				</div>

				{isCancelling && order && cancellationProgress ? (
					<>
						<div className="bot-row__order">
							<span className="bot-row__order-label">Cancelling Order</span>
							<span className="bot-row__order-id">#{order.id}</span>
							<OrderBadge type={order.type} />
						</div>
						<div className="bot-row__progress-wrap">
							<div className="bot-row__progress-track">
								<div
									className="bot-row__progress-fill bot-row__progress-fill--cancelling"
									style={{ width: `${cancellationProgress.percent}%` }}
								/>
							</div>
							<span className="bot-row__timer">
								{cancellationProgress.secondsLeft}s /{' '}
								{cancellationProgress.totalSeconds}s
							</span>
						</div>
					</>
				) : isProcessing && order && progress ? (
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
								{progress.secondsLeft}s / {progress.totalSeconds}s
							</span>
						</div>
					</>
				) : isReserved && order ? (
					<div className="bot-row__idle-text">
						<span>Receiving order #{order.id}</span>
						<span className="bot-row__waiting">Transfer in progress...</span>
					</div>
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
