import robotIcon from '../../../assets/png/robot-1.png';
import { InfoIcon } from '../../../assets/svg';
import CookingBotItem from './CookingBotItem';

export default function CookingBotsPanel({ bots, getOrder }) {
	const sortedBots = [...bots].sort((a, b) => a.id - b.id);

	return (
		<div className="panel panel--bots">
			<div className="panel__header">
				<div className="panel__title panel__title--blue">
					<img
						src={robotIcon}
						alt=""
						className="panel__title-icon panel__title-icon--robot"
					/>
					<h2>COOKING BOTS</h2>
				</div>
			</div>

			<div className="panel__body">
				{bots.length === 0 ? (
					<p className="panel__empty">
						No bots deployed. Click &quot;+ Add Bot&quot; to add one.
					</p>
				) : (
					<ul className="bot-list">
						{sortedBots.map((bot) => (
							<CookingBotItem key={bot.id} bot={bot} getOrder={getOrder} />
						))}
					</ul>
				)}
			</div>

			<p className="panel__footer">
				<InfoIcon />
				Each bot can process one order at a time.
			</p>
		</div>
	);
}
