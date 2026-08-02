import path from "node:path";
import fs from "node:fs";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

const STATIC_DIR =
  process.env.STATIC_DIR ||
  path.resolve(process.cwd(), "..", "capstone", "dist", "public");

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

if (fs.existsSync(STATIC_DIR)) {
  app.use(express.static(STATIC_DIR));
  app.use((req, res, next) => {
    if (req.method !== "GET") return next();
    const parsed = new URL(req.originalUrl, "http://localhost");
    if (parsed.pathname.startsWith("/api") || parsed.pathname.startsWith("/ws")) {
      return next();
    }
    res.sendFile(path.join(STATIC_DIR, "index.html"));
  });
  logger.info({ dir: STATIC_DIR }, "Serving static frontend");
} else {
  logger.warn({ dir: STATIC_DIR }, "Static frontend not found; API only");
}

export default app;
