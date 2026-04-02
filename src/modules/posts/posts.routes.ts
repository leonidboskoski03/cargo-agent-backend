import { Router } from "express";
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

postsRouter.get("/", requireAuth, validate(listPostsSchema), listPosts);
postsRouter.get("/:postId", requireAuth, validate(getPostByIdSchema), getPostById);
postsRouter.post("/", requireAuth, enforceUsageLimit("ACTIVE_POSTS"), validate(createPostSchema), createPost);
postsRouter.patch("/:postId", requireAuth, validate(updatePostSchema), updatePost);
postsRouter.patch("/:postId/status", requireAuth, validate(changePostStatusSchema), changePostStatus);
postsRouter.delete("/:postId", requireAuth, validate(deletePostSchema), deletePost);
postsRouter.post("/:postId/restore", requireAuth, validate(restorePostSchema), restorePost);
