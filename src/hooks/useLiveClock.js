import { useEffect, useState } from 'react';

const useLiveClock = () => {
	const [now, setNow] = useState(() => new Date());

	useEffect(() => {
		const id = setInterval(() => setNow(new Date()), 1000);
		return () => clearInterval(id);
	}, []);

	return now;
};

export default useLiveClock;
