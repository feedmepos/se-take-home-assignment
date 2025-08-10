import { OrderStatus, OrderType } from "@/enums";

export class Order {
  private _id;
  private _status: OrderStatus;
  private _type: OrderType;

  constructor(id: number, type: OrderType) {
    this._id = id;
    this._status = OrderStatus.PENDING;
    this._type = type;
  }

  get id(): number {
    return this._id;
  }

  get status(): OrderStatus {
    return this._status;
  }

  set status(value: OrderStatus) {
    this._status = value;
  }

  get type(): OrderType {
    return this._type;
  }
}
