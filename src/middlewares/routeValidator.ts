import { Request, Response, NextFunction } from "express";
import messages from "../config/messages";
import createOrderValidator from "../validations/createOrderValidator";
import updateOrderValidator from "../validations/updateOrderValidator";

/**
 * Generic type for validator functions
 * Each validator receives the request body and returns:
 * { error?: { details: { message: string }[] } }
 */
export type ValidatorFn = (body: any) => {
  error?: {
    details: { message: string }[];
  };
};

/**
 * Export all available validation functions
 */
export const validators = {
  createOrderValidator,
  updateOrderValidator,
};

/**
 * Validates body request
 * @param validator A validator function picked from validators list
 */
export const validate =
  (validator: ValidatorFn) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (req.body && req.body !== "") {
      const { error } = validator(req.body.input);

      if (error) {
        const errors = error.details.map((detail) => detail.message);
        return res.status(400).json({ errors });
      }

      return next();
    }

    return res
      .status(400)
      .json({ errors: [messages.errors.missingBody] });
  };
