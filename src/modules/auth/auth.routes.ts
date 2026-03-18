import { Router } from "express";
import { z } from "zod";
import { validate } from "../../shared/middleware/validate.middleware.js";
import { ok } from "../../shared/http/apiResponse.js";

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
  }),
  params: z.object({}),
  query: z.object({}),
});

export const authRouter = Router();

authRouter.get("/", (_req, res) => ok(res, { module: "auth", status: "ready" }));
authRouter.post("/login", validate(loginSchema), (_req, res) => ok(res, { message: "Login flow pending implementation" }));
authRouter.post("/logout", (_req, res) => ok(res, { message: "Logout flow pending implementation" }));

