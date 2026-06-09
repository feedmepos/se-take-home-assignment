import { TypedUseSelectorHook, useSelector } from "react-redux";
import type { RootState } from "../store/types/rootState";

export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
export default useAppSelector;
