const sessions = new Map();

export function getSession(client) {
  if (!sessions.has(client)) {
    sessions.set(client, {
      stage: "idle",
      selectedPackage: null,
      details: {},
      lastInteraction: Date.now(),
      followUpSent: false,
    });
  }
  return sessions.get(client);
}

export function updateSession(client, updates) {
  const current = getSession(client);
  sessions.set(client, { ...current, ...updates });
}

export function resetSession(client) {
  sessions.delete(client);
}

export function getAllSessions() {
  return sessions;
}