/**
 * Application type definitions
 * Modern naming without 'E' prefix following industry standards
 */

export const CUSTOMER_TYPES = {
  VIP: 'VIP',
  NORMAL: 'Normal'
};

export const BOT_STATUS = {
  IDLE: 'Idle',
  BUSY: 'Busy'
};

export const ACTION_TYPES = {
  CREATE_ORDER: 'CREATE_ORDER',
  ADD_BOT: 'ADD_BOT',
  REMOVE_BOT: 'REMOVE_BOT',
  COMPLETE_ORDER: 'COMPLETE_ORDER',
};

// Legacy exports for backward compatibility (deprecated)
export const ECustomerType = CUSTOMER_TYPES;
export const EBotStatus = BOT_STATUS;
export const EActionType = ACTION_TYPES;