import { OrderController } from './OrderController.js';
// Singleton instance to share across routes
let instance = null;
export const getOrderController = () => {
    if (!instance) {
        instance = new OrderController();
    }
    return instance;
};
//# sourceMappingURL=OrderControllerSingleton.js.map