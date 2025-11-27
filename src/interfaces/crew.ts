enum CrewStatusEnum {
  IDLE = 'idle',
  INACTIVE = 'inactive',
  ACTIVE = 'active',
}

interface ICrew {
  order_id: string,
  crew_id: number;
  crew_status: CrewStatusEnum,
}

export { CrewStatusEnum };
export type { ICrew };
