import { createApp } from "./app";
import { ENV } from "./config/environment";

const app = createApp();

const server = app.listen(ENV.PORT, () => {
  console.log(`🐝 BeeBuddy Backend Service running at http://localhost:${ENV.PORT}`);
  console.log(`📡 Environment: ${ENV.NODE_ENV}`);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
  });
});
