import { IOrder } from '../interfaces/order';
import BaseRepository from './BaseRepository';

export default class OrderRepository extends BaseRepository<IOrder> {
  constructor() {
    super();
  }
}
