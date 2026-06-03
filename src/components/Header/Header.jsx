import mcdIcon from '../../assets/png/MCD-icon.png';
import useLiveClock from '../../hooks/useLiveClock';

const Header = () => {
	const liveClock = useLiveClock();

	return (
		<header className="top-header">
			<div className="top-header__brand">
				<div className="top-header__logo-wrap">
					<img src={mcdIcon} alt="" className="top-header__logo" />
				</div>
				<h1>McDonald&apos;s Order System</h1>
			</div>
			<div className="top-header__clock">
				<span className="top-header__date">
					{liveClock.toLocaleDateString('en-US', {
						weekday: 'long',
						month: 'long',
						day: 'numeric',
						year: 'numeric',
					})}
				</span>
				<span className="top-header__time">
					{liveClock.toLocaleTimeString('en-US', {
						hour: 'numeric',
						minute: '2-digit',
						second: '2-digit',
						hour12: true,
					})}
				</span>
			</div>
		</header>
	);
};

export default Header;
