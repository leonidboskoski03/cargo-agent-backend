import type { ParsedQs } from "qs";
import { DocumentsRepository } from "./documents.repository.js";

export class DocumentsService {
  private readonly repository = new DocumentsRepository();

  async list(_query: ParsedQs) {
    return this.repository.list();
  }
}

