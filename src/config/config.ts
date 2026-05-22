import dotenv from "dotenv";

dotenv.config({
  debug: false,
  quiet: true,
});

const config = {
  appName: 'Feed Me Service',
  // App's settings
  serverSettings: {
    port: process.env.PORT || 3000,
    requestTimeout: process.env.REQUEST_TIMEOUT || (2 * 60 * 1000),
  },
  general: {
    resetTokenExpiration: 1 * 60 * 24,
    verificationTokenExpiration: 1 * 60 * 24,
  },
  dates: {
    utc: 8,
    format: 'YYYY-MM-DD HH:mm:ss',
  }
};

export default config;
