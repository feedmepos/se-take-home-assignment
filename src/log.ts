export function log(msg: string) {
  const time = new Date().toTimeString().slice(0, 8);
  console.log(`[${time}] ${msg}`);
}
