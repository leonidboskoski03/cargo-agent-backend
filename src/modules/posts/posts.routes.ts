import { Router } from "express";
import { asyncRoute } from "../../shared/http/asyncRoute.js";
import { enforceUsageLimit } from "../../shared/middleware/enforceUsageLimit.middleware.js";
import { requireAuth } from "../../shared/middleware/auth.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import {
  changePostStatus,
  createPost,
  deletePost,
  getPostById,
  listPosts,
  restorePost,
  updatePost,
} from "./posts.controller.js";
import {
  changePostStatusSchema,
  createPostSchema,
  deletePostSchema,
  getPostByIdSchema,
  listPostsSchema,
  restorePostSchema,
  updatePostSchema,
} from "./posts.validator.js";

export const postsRouter = Router();

postsRouter.get("/", requireAuth, validate(listPostsSchema), asyncRoute(listPosts));
postsRouter.get("/:postId", requireAuth, validate(getPostByIdSchema), asyncRoute(getPostById));
postsRouter.post("/", requireAuth, enforceUsageLimit("ACTIVE_POSTS"), validate(createPostSchema), asyncRoute(createPost));
postsRouter.patch("/:postId", requireAuth, validate(updatePostSchema), asyncRoute(updatePost));
postsRouter.patch("/:postId/status", requireAuth, validate(changePostStatusSchema), asyncRoute(changePostStatus));
postsRouter.delete("/:postId", requireAuth, validate(deletePostSchema), asyncRoute(deletePost));
postsRouter.post("/:postId/restore", requireAuth, validate(restorePostSchema), asyncRoute(restorePost));
