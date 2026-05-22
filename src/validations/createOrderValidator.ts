import Joi from 'joi';
import { OrderStatusEnum, PaymentMethodEnum, PaymentStatusEnum, MemberTypeEnum } from '../interfaces/order';

/**
 * @returns {Object} The value of the scheme or an error object
 */
export default function (data: any): object {
  const createOrderValidation = Joi.object().options({ abortEarly: false }).keys({
    customer_id: Joi.number().required(),
    restaurant_id: Joi.number().required(),
    order_status: Joi.string().valid(...Object.values(OrderStatusEnum)),
    total_price: Joi.number().required(),
    payment_method: Joi.string().valid(...Object.values(PaymentMethodEnum)),
    payment_status: Joi.string().valid(...Object.values(PaymentStatusEnum)),
    member_type: Joi.string().valid(...Object.values(MemberTypeEnum)),
  });

  return createOrderValidation.validate(data);
};
