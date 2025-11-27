import { ICrew, CrewStatusEnum } from '../interfaces/crew';
import BaseRepository from './BaseRepository';

export default class CrewRepository extends BaseRepository<ICrew> {
  constructor() {
    super([
      {
        crew_id: 1,
        crew_status: CrewStatusEnum.IDLE,
        order_id: "",
      },
      {
        crew_id: 2,
        crew_status: CrewStatusEnum.INACTIVE,
        order_id: "",
      },
      {
        crew_id: 3,
        crew_status: CrewStatusEnum.IDLE,
        order_id: "",
      },
      {
        crew_id: 4,
        crew_status: CrewStatusEnum.IDLE,
        order_id: "",
      },
      {
        crew_id: 5,
        crew_status: CrewStatusEnum.IDLE,
        order_id: "",
      }
    ]);
  }
}
