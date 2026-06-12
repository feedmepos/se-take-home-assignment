import { ORDER_NUMBER_PADDING } from "@/constants";

export function formatOrderNumber(num: number): string {
  return num.toString().padStart(ORDER_NUMBER_PADDING, '0');
}