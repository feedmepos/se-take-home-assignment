import { useEffect, useState } from 'react';

const useNowTick = (active) => {
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		if (!active) return;
		const id = setInterval(() => setNow(Date.now()), 200);
		return () => clearInterval(id);
	}, [active]);

	return now;
};

export default useNowTick;
