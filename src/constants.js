/**
 * Application Constants
 * Centralized constants for type safety and maintainability
 * Prevents magic strings/numbers scattered throughout the codebase
 */

/**
 * Order Types
 */
export const ORDER_TYPES = {
  NORMAL: 'NORMAL',
  VIP: 'VIP'
};

/**
 * Order Status Values
 */
export const ORDER_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETE: 'COMPLETE'
};

/**
 * Bot Status Values
 */
export const BOT_STATUS = {
  IDLE: 'IDLE',
  PROCESSING: 'PROCESSING'
};

/**
 * Processing Configuration
 */
export const PROCESSING_TIME_MS = 10000; // 10 seconds per order

/**
 * System Configuration
 */
export const STARTING_ORDER_NUMBER = 1001;
export const STARTING_BOT_ID = 1;
