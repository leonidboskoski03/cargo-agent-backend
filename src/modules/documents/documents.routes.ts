import { Router } from "express";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import {
  createDocument,
  deleteDocument,
  getDocumentById,
  listDocuments,
  restoreDocument,
} from "./documents.controller.js";
import {
  createDocumentSchema,
  deleteDocumentSchema,
  getDocumentByIdSchema,
  listDocumentsSchema,
  restoreDocumentSchema,
} from "./documents.validator.js";

export const documentsRouter = Router();

documentsRouter.get("/", requireAuth, validate(listDocumentsSchema), listDocuments);
documentsRouter.get("/:documentId", requireAuth, validate(getDocumentByIdSchema), getDocumentById);
documentsRouter.post("/", requireAuth, validate(createDocumentSchema), createDocument);
documentsRouter.delete("/:documentId", requireAuth, validate(deleteDocumentSchema), deleteDocument);
documentsRouter.post("/:documentId/restore", requireAuth, validate(restoreDocumentSchema), restoreDocument);
