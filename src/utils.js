export function getTime() {
  const now = new Date();
  return now.toTimeString().split(' ')[0]; // HH:MM:SS
}