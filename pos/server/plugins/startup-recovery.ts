/**
 * Nitro plugin that runs recovery logic on server startup.
 * This ensures that any stuck bots or incomplete orders from
 * a previous server session are properly recovered.
 */

// Run recovery on server startup
;(async () => {
  try {
    // Dynamically import the recovery function
    const { runRecovery } = await import('../../src/routes/api/orders/route')
    await runRecovery()
  } catch (err) {
    console.error('[StartupRecovery] Failed to run recovery:', err)
  }
})()

// Export empty default to satisfy Nitro plugin requirements
export default () => {}
