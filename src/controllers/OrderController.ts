import { Request, Response } from 'express';

import log from "../utils/logger";
import messages from '../config/messages';
import { CrewStatusEnum } from '../interfaces/crew';
import { OrderStatusEnum } from '../interfaces/order';
import { runWithDelay } from "../utils/asynchonous";

// Services
import OrderService from '../services/OrderService';
import CrewService from '../services/CrewService';

export default class OrderController {
  private readonly orderService: OrderService;
  private readonly crewService: CrewService;

  constructor() {
    this.orderService = new OrderService();
    this.crewService = new CrewService();
  }

  /**
   * Endpoint to retrieve all order's info
   * @returns Order details
   */
  getOrders = async (req: Request, res: Response, next: any): Promise<object> => {
    try {
      const { filter } = req.body;
      const orders = await this.orderService.getRecords(filter);

      return res.status(200).json({ data: orders });
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Endpoint to retrieve order's info
   * @returns Order details
   */
  getOrder = async (req: Request, res: Response, next: any): Promise<object> => {
    try {
      const { filter } = req.body;
      const order = await this.orderService.getRecord(filter);

      return res.status(200).json({ data: order });
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Endpoint to register order
   * @returns Created order details
   */
  createOrder = async (req: Request, res: Response, next: any): Promise<object> => {
    try {
      const { input } = req.body;
      const createdOrder = await this.orderService.createRecord(input);
      if (!createdOrder) return {};

      log(messages.success.successCreateOrder(
        createdOrder?.order_id,
        createdOrder?.member_type,
        createdOrder?.order_status,
        createdOrder?.queue_id
      ));
      return res.status(200).json({ data: createdOrder });
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Endpoint to update order's info
   * @returns Updated order details
   */
  updateOrder = async (req: Request, res: Response, next: any): Promise<object> => {
    try {
      const { id, input } = req.body;
      const order = await this.orderService.updateRecord(id, input);

      return res.status(200).json({ data: order });
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Endpoint to assign pending order
   * @returns Updated order details
   */
  assignOrder = async (_req: Request, res: Response, next: any): Promise<object | undefined> => {
    try {
      // Check for idle crew
      const crew = await this.crewService.getRecord({
        crew_status: CrewStatusEnum.IDLE,
      });
      if (!crew?.crew_id) {
        log(messages.info.unavailableCrew);
        return res.status(400).json({ errors: messages.info.unavailableCrew });
      }

      // Get earliest pending order
      const pendingOrder = await this.orderService.earliestPendingOrder();
      if (!pendingOrder) {
        log(messages.info.noPendingOrder);
        return res.status(400).json({ errors: messages.info.noPendingOrder });
      }

      const processPendingOrder = async () => {
        await Promise.all([
          this.orderService.updateRecord(pendingOrder?.order_id as string, {
            ...pendingOrder,
            order_status: OrderStatusEnum.COMPLETE,
          }),
          this.crewService.updateRecord(crew.crew_id, { ...crew, crew_status: CrewStatusEnum.INACTIVE }),
        ]);

        log(`${messages.success.successProcessOrder} ${pendingOrder.order_id} with status ${OrderStatusEnum.COMPLETE}`);
        log(`${messages.info.setCrewAvailability} ${crew.crew_id} to ${CrewStatusEnum.INACTIVE}`);
        return pendingOrder;
      };

      // Process pending order (10s)
      runWithDelay({
        beforeDelay: 5000,
        fn: processPendingOrder,
        afterDelay: 5000,
        onStart: async () => {
          await Promise.all([
            this.crewService.prePendingOrder(crew, pendingOrder),
            this.orderService.prePendingOrder(pendingOrder),
          ])
        },
        onComplete: (result: any) => log(`Task ${result?.order_id} successfully completed`),
      });

      return res.status(200).json({ data: messages.info.crewAssignInProgress });
    } catch (error) {
      return next(error);
    }
  };
}
