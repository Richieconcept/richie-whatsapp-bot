const clientMemory = new Map();

/**
 * Returns greeting based on time of day
 */
export function getTimeGreeting() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Checks if greeting should be sent once per day
 */
export function shouldGreet(client) {
  const data = clientMemory.get(client) || {};
  const today = new Date().toDateString();

  if (data.lastGreeted !== today) {
    data.lastGreeted = today;
    clientMemory.set(client, data);
    return true;
  }
  return false;
}