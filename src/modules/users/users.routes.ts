import { Router } from "express";
import { asyncRoute } from "../../shared/http/asyncRoute.js";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import {
  deleteUser,
  getMyProfileCompletion,
  getMyUser,
  getUserById,
  listUsers,
  restoreUser,
  updateMyUser,
  updateUserMembership,
} from "./users.controller.js";
import {
  deleteUserSchema,
  getMeSchema,
  getMyProfileCompletionSchema,
  getUserByIdSchema,
  listUsersSchema,
  restoreUserSchema,
  updateMyProfileSchema,
  updateUserMembershipSchema,
} from "./users.validator.js";

export const usersRouter = Router();

usersRouter.get("/", requireAuth, validate(listUsersSchema), asyncRoute(listUsers));
usersRouter.get("/me", requireAuth, validate(getMeSchema), asyncRoute(getMyUser));
usersRouter.get("/me/profile-completion", requireAuth, validate(getMyProfileCompletionSchema), asyncRoute(getMyProfileCompletion));
usersRouter.get("/:userId", requireAuth, validate(getUserByIdSchema), asyncRoute(getUserById));
usersRouter.patch("/me", requireAuth, validate(updateMyProfileSchema), asyncRoute(updateMyUser));
usersRouter.patch("/:userId/membership", requireAuth, validate(updateUserMembershipSchema), asyncRoute(updateUserMembership));
usersRouter.delete("/:userId", requireAuth, validate(deleteUserSchema), asyncRoute(deleteUser));
usersRouter.post("/:userId/restore", requireAuth, validate(restoreUserSchema), asyncRoute(restoreUser));

