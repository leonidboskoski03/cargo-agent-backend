import { Router } from "express";
import { prisma } from "../shared/prisma/prismaClient.js";

export const healthRouter = Router();

healthRouter.get("/live", (_req, res) => {
  res.status(200).json({ success: true, data: { status: "live" } });
});

healthRouter.get("/ready", async (_req, res, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ success: true, data: { status: "ready" } });
  } catch (error) {
    next(error);
  }
});

