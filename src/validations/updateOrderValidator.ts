import Joi from 'joi';
import { OrderStatusEnum, PaymentMethodEnum, PaymentStatusEnum, MemberTypeEnum } from '../interfaces/order';

/**
 * @returns {Object} The value of the scheme or an error object
 */
export default function (data: any): object {
  const updateOrderValidation = Joi.object().options({ abortEarly: false }).keys({
    order_status: Joi.string().valid(...Object.values(OrderStatusEnum)),
    total_price: Joi.number().optional(),
    payment_method: Joi.string().valid(...Object.values(PaymentMethodEnum)),
    payment_status: Joi.string().valid(...Object.values(PaymentStatusEnum)),
    member_type: Joi.string().valid(...Object.values(MemberTypeEnum)),
  });

  return updateOrderValidation.validate(data);
};
