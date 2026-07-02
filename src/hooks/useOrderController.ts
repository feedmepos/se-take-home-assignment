import { useSyncExternalStore } from 'react'
import type { OrderController } from '../core/OrderController'
import type { ControllerState } from '../core/types'

/**
 * Binds an {@link OrderController} to React. `useSyncExternalStore` is the
 * idiomatic way to read from an external mutable store: it re-renders only when
 * the controller emits, and the controller caches its snapshot so the reference
 * is stable between changes (avoiding tearing / render loops).
 */
export function useOrderController(controller: OrderController): ControllerState {
  return useSyncExternalStore(controller.subscribe, controller.getSnapshot)
}
