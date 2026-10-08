export function logEvent(event: string, fields: Record<string, unknown> = {}) {
  console.info(JSON.stringify({ ts: new Date().toISOString(), event, ...fields }))
}

export function logError(event: string, error: unknown, fields: Record<string, unknown> = {}) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(JSON.stringify({ ts: new Date().toISOString(), event, error: message, ...fields }))
}
