export interface Order {
	id: number;
	type: number; // 0 = Normal, 1 = VIP
	status: number; // 0 = Pending, 1 = Processing, 2 = Complete
	created_at: string;
}

export interface Bot {
	id: number;
	status: number; // 0 = Idle, 1 = Processing
	order?: Order;
}

export interface AppState {
	pending_orders: Order[];
	completed_orders: Order[];
	bots: Bot[];
}

export interface WSEvent {
	type: string;
	payload: any;
}
