import { Router } from "express";
import { validate } from "../../shared/middleware/validate.middleware.js";
import { listDocuments } from "./documents.controller.js";
import { listDocumentsSchema } from "./documents.validator.js";

export const documentsRouter = Router();

documentsRouter.get("/", validate(listDocumentsSchema), listDocuments);
