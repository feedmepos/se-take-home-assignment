// Models and repositories
import OrderRepository from '../repositories/OrderRepository';
import { IOrder, MemberTypeEnum, OrderStatusEnum } from '../interfaces/order';
import { sortedBy } from "../utils/basic";
import { ISort } from '../interfaces/basic';

export default class OrderService {
  private readonly orderRepository: OrderRepository;

  constructor() {
    this.orderRepository = new OrderRepository();
  }

  /**
   * Find all orders
   */
  getRecords = async (filter: Partial<IOrder>): Promise<IOrder[] | null> => {
    return await this.orderRepository.find(filter);
  }

  /**
   * Find order based on order id
   */
  getRecord = async (filter: Partial<IOrder>): Promise<IOrder | undefined> => {
    return await this.orderRepository.findOne(filter);
  }

  /**
   * To create new order
   */
  createRecord = async (data: IOrder): Promise<IOrder | null> => {
    let recordQueue: number = 1;
    const currentRecords = await this.getRecords({ order_status: OrderStatusEnum.PENDING });

    if (currentRecords !== null) {
      const latestMember = this.getLatestMember(data.member_type, currentRecords);
      recordQueue = latestMember.queue_id + 1;
    }
    
    if (data.member_type === MemberTypeEnum.VIP) {
      await this.rearrangeQueue();
    }
  
    return await this.orderRepository.create({
      ...data,
      queue_id: recordQueue,
      order_status: OrderStatusEnum.PENDING,
    });
  };

  /**
   * To update existing order
   */
  updateRecord = async (orderId: string, data: IOrder): Promise<Partial<IOrder> | undefined> => {
    return await this.orderRepository.update({ order_id: orderId }, data);
  };

  earliestPendingOrder = async (): Promise<IOrder | undefined> => {
    const orders = await this.getRecords({ order_status: OrderStatusEnum.PENDING });
    if (!orders?.length) return undefined;
    return sortedBy(orders, 'queue_id').at(0);
  }

  /**
   * Pre-requisite before execute order
   */
  prePendingOrder = async (order: IOrder) => {
    await this.updateRecord(order?.order_id as string, {
      ...order,
      order_status: OrderStatusEnum.PROCESSING,
    });
  };

  /**
   * Get latest order no based on member type
   */
  protected getLatestMember = (type: MemberTypeEnum, currentRecords: IOrder[]) => {
    const records: IOrder[] = currentRecords.filter(v => v.member_type === type);
    const latest = sortedBy(records, 'queue_id', ISort.DESC).at(0) ?? { queue_id: 0 };
    return latest;
  }

  /**
   * To rearrange queue order number
   */
  protected rearrangeQueue = async (): Promise<void> => {
    const currentRecords = await this.getRecords({ member_type: MemberTypeEnum.NORMAL });
    if (!currentRecords) return;

    await Promise.all(currentRecords.map(async (record: IOrder) => {
      await this.updateRecord(
        record.order_id,
        { ...record, queue_id: record.queue_id + 1 },
      );
    }));
  }
}
