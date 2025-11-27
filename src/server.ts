import config from './config/config';
import app from './app';

// Start the server
app.server = app.listen(config.serverSettings.port, (err: any) => {
  if (err) {
    console.error(err);
  }
  console.info(`📡 ${config.appName} started successfully`, { port: config.serverSettings.port });
});

export default app;
