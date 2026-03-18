import type { ParsedQs } from "qs";
import { NotificationsRepository } from "./notifications.repository.js";

export class NotificationsService {
  private readonly repository = new NotificationsRepository();

  async list(_query: ParsedQs) {
    return this.repository.list();
  }
}

