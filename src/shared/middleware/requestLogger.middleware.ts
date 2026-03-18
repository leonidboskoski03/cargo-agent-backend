import { pinoHttp } from "pino-http";
import { logger } from "../../config/logger.js";

export const requestLogger = pinoHttp({
  logger,
  customProps(req: { requestId?: string }) {
    return {
      requestId: req.requestId,
    };
  },
});
