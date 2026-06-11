import { Router } from "express";
import { asyncRoute } from "../../shared/http/asyncRoute.js";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import {
  createDocument,
  deleteDocument,
  getDocumentById,
  listDocuments,
  restoreDocument,
  uploadDocument,
} from "./documents.controller.js";
import {
  createDocumentSchema,
  deleteDocumentSchema,
  getDocumentByIdSchema,
  listDocumentsSchema,
  restoreDocumentSchema,
  uploadDocumentSchema,
} from "./documents.validator.js";

export const documentsRouter = Router();

documentsRouter.get("/", requireAuth, validate(listDocumentsSchema), asyncRoute(listDocuments));
documentsRouter.post("/upload", requireAuth, validate(uploadDocumentSchema), asyncRoute(uploadDocument));
documentsRouter.get("/:documentId", requireAuth, validate(getDocumentByIdSchema), asyncRoute(getDocumentById));
documentsRouter.post("/", requireAuth, validate(createDocumentSchema), asyncRoute(createDocument));
documentsRouter.delete("/:documentId", requireAuth, validate(deleteDocumentSchema), asyncRoute(deleteDocument));
documentsRouter.post("/:documentId/restore", requireAuth, validate(restoreDocumentSchema), asyncRoute(restoreDocument));
