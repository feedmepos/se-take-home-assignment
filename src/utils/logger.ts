// import { currentTimestamp } from "./dates";

const log = (log: string, sublog?: string): void => {
  console.log(
    // `[${currentTimestamp().toISOString()}]`,
    log,
    sublog ?? '',
  )
}

export default log;
