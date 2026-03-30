import { Router } from "express";
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

usersRouter.get("/", requireAuth, validate(listUsersSchema), listUsers);
usersRouter.get("/me", requireAuth, validate(getMeSchema), getMyUser);
usersRouter.get("/me/profile-completion", requireAuth, validate(getMyProfileCompletionSchema), getMyProfileCompletion);
usersRouter.get("/:userId", requireAuth, validate(getUserByIdSchema), getUserById);
usersRouter.patch("/me", requireAuth, validate(updateMyProfileSchema), updateMyUser);
usersRouter.patch("/:userId/membership", requireAuth, validate(updateUserMembershipSchema), updateUserMembership);
usersRouter.delete("/:userId", requireAuth, validate(deleteUserSchema), deleteUser);
usersRouter.post("/:userId/restore", requireAuth, validate(restoreUserSchema), restoreUser);

