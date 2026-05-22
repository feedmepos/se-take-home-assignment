import log from '../utils/logger';
import messages from '../config/messages';
import { CrewStatusEnum, ICrew } from '../interfaces/crew';
import { IOrder } from '../interfaces/order';

// Models and repositories
import BaseMemory from '../repositories/MemoryRepository';

export default class CrewService {
  static readonly collectionName = 'crews';
  private readonly baseMemory: BaseMemory;

  constructor() {
    this.baseMemory = BaseMemory.getInstance();
  }

  /**
   * Find all crews
   */
  getRecords = async (filter: Partial<ICrew>): Promise<ICrew[] | null> => {
    return this.baseMemory.findAll<ICrew>(CrewService.collectionName, filter);
  }

  /**
   * Find crew based on crew id
   */
  getRecord = async (filter: Partial<ICrew>): Promise<ICrew | undefined> => {
    return this.baseMemory.find<ICrew>(CrewService.collectionName, filter);
  }

  /**
   * Create new crew
   */
  createRecord = async (data: IOrder): Promise<ICrew | undefined> => {
    const currentRecords = await this.getRecords({});
    const latestMember = currentRecords?.at(0) ?? { crew_id: 0 };

    this.baseMemory.create<ICrew>(
      CrewService.collectionName,
      {
        ...data,
        crew_id: latestMember?.crew_id + 1,
        crew_status: CrewStatusEnum.IDLE,
      },
    );

    return this.getRecord({ crew_id: latestMember?.crew_id + 1 });
  };

  /**
   * To update existing crew
   */
  updateRecord = async (crewId: number, data: ICrew): Promise<Partial<ICrew> | undefined> => {
    this.baseMemory.update<ICrew>(
      CrewService.collectionName,
      { crew_id: crewId },
      data,
    );
  
    return this.getRecord({ crew_id: crewId });
  };

  /**
   * Pre-requisite before execute order
   */
  prePendingOrder = async (crew: ICrew, pendingOrder: IOrder) => {
    log(messages.info.crewPickupTask(crew.crew_id, pendingOrder.member_type, pendingOrder.order_id));
    this.updateRecord(crew.crew_id, { ...crew, crew_status: CrewStatusEnum.ACTIVE });
  };
}
