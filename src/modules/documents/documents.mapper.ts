import type { DocumentListItemDto } from "./documents.dto.js";

export function mapToDocumentListItem(data: {
  id: string;
  name: string;
  type: string;
  createdAt: Date;
}): DocumentListItemDto {
  return {
    id: data.id,
    name: data.name,
    type: data.type,
    createdAt: data.createdAt.toISOString(),
  };
}

