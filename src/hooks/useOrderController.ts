import { useSyncExternalStore } from 'react'
import type { OrderController } from '../core/OrderController'
import type { ControllerState } from '../core/types'

/** Subscribes a component to the controller and re-renders on every change. */
export function useOrderController(controller: OrderController): ControllerState {
  return useSyncExternalStore(controller.subscribe, controller.getSnapshot)
}
