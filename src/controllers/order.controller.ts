import { Request, Response } from "express";
import { OrderService } from "../services/order.service";

export class OrderController {
  constructor(private orderService: OrderService) {}

  createNormalOrder = (req: Request, res: Response): void => {
    try {
      const order = this.orderService.createOrder("NORMAL");
      res.status(201).json({
        success: true,
        message: "Normal order created",
        data: order,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to create order",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  createVipOrder = (req: Request, res: Response): void => {
    try {
      const order = this.orderService.createOrder("VIP");
      res.status(201).json({
        success: true,
        message: "VIP order created",
        data: order,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to create order",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  getAllOrders = (req: Request, res: Response): void => {
    try {
      const orders = this.orderService.getAllOrders();
      res.status(200).json({
        success: true,
        data: orders,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve orders",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
}
