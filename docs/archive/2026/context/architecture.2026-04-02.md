# Architecture Notes

- Modular monolith with feature-first folders under `src/modules`.
- Shared cross-cutting concerns under `src/shared`.
- Versioned APIs under `src/routes/v1.ts`.
- New scaling modules included: `documents`, `notifications`, `auditLogs`.
- Keep business logic in services, Prisma access in repositories, and request validation in Zod validators.


