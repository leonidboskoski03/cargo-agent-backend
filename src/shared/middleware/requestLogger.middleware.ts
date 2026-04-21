import { pinoHttp } from "pino-http";
import { logger } from "../../config/logger.js";

export const requestLogger = pinoHttp({
  logger,
  genReqId(req) {
    return (req as any).requestId;
  },
  customProps(req) {
    const request = req as any;
    return {
      requestId: request.requestId,
      userId: request.auth?.sub,
      companyId: request.auth?.companyId,
      sessionId: request.auth?.sid,
    };
  },
});
