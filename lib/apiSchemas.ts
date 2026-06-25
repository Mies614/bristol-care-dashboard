import { z } from "zod";

export const VALID_CONTENT_TYPES = ["note", "album", "memory"] as const;
export const VALID_INTERACTION_TYPES = ["like", "reaction", "miss_you", "goodnight"] as const;
export const VALID_REACTIONS = ["heart", "smile", "cry", "fire", "clap"] as const;

export const MAX_COMMENT_LENGTH = 500;
export const MAX_NOTE_CONTENT_LENGTH = 5000;
export const MAX_NOTE_TITLE_LENGTH = 200;
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
export const MAX_AUDIO_SIZE = 20 * 1024 * 1024;

export const spaceCodeSchema = z.string().min(1).max(100);
export const contentIdSchema = z.string().min(1).max(200);
export const identitySchema = z.string().min(1).max(50);
export const contentTypeSchema = z.enum(VALID_CONTENT_TYPES);

export const postCommentSchema = z.object({
  spaceCode: spaceCodeSchema.optional(),
  code: spaceCodeSchema.optional(),
  contentType: contentTypeSchema,
  contentId: contentIdSchema,
  body: z.string().trim().min(1, "评论内容不能为空").max(MAX_COMMENT_LENGTH),
  identity: identitySchema.optional(),
});

export const deleteCommentSchema = z.object({
  spaceCode: spaceCodeSchema.optional(),
  code: spaceCodeSchema.optional(),
  commentId: z.string().min(1),
  identity: identitySchema.optional(),
});

export const postInteractionSchema = z.object({
  spaceCode: spaceCodeSchema.optional(),
  code: spaceCodeSchema.optional(),
  contentType: contentTypeSchema,
  contentId: contentIdSchema,
  interactionType: z.enum(VALID_INTERACTION_TYPES),
  reaction: z.enum(VALID_REACTIONS).optional(),
  identity: identitySchema.optional(),
}).refine(
  (data) => data.interactionType !== "reaction" || !!data.reaction,
  { message: "reaction 类型需要提供 reaction 值", path: ["reaction"] }
);

export const deleteInteractionSchema = z.object({
  spaceCode: spaceCodeSchema.optional(),
  code: spaceCodeSchema.optional(),
  contentType: contentTypeSchema,
  contentId: contentIdSchema,
  interactionType: z.string().min(1),
  identity: identitySchema.optional(),
});

export const postNoteSchema = z.object({
  spaceCode: spaceCodeSchema.optional(),
  code: spaceCodeSchema.optional(),
  content: z.string().max(MAX_NOTE_CONTENT_LENGTH).optional(),
  title: z.string().max(MAX_NOTE_TITLE_LENGTH).optional(),
  authorIdentity: identitySchema.optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  videoUrl: z.string().url().optional().or(z.literal("")),
  audioUrl: z.string().url().optional().or(z.literal("")),
  isSoftDeleted: z.boolean().optional(),
});

export const postMissYouSchema = z.object({
  spaceCode: spaceCodeSchema.optional(),
  code: spaceCodeSchema.optional(),
  actionType: z.enum(["miss_you", "goodnight", "morning"]),
  identity: identitySchema.optional(),
  localDate: z.string().max(10).optional(),
});

export const adminLoginSchema = z.object({
  password: z.string().min(1).max(200),
});

export const backupExportSchema = z.object({
  password: z.string().min(1),
  code: spaceCodeSchema.optional(),
});

export type PostCommentInput = z.infer<typeof postCommentSchema>;
export type DeleteCommentInput = z.infer<typeof deleteCommentSchema>;
export type PostInteractionInput = z.infer<typeof postInteractionSchema>;
export type DeleteInteractionInput = z.infer<typeof deleteInteractionSchema>;
export type PostNoteInput = z.infer<typeof postNoteSchema>;
export type PostMissYouInput = z.infer<typeof postMissYouSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

export function safeParseBody<T>(schema: z.ZodSchema<T>, body: unknown) {
  const result = schema.safeParse(body);
  if (!result.success) {
    return { ok: false as const, error: result.error.issues[0]?.message || "请求内容不符合要求" };
  }
  return { ok: true as const, data: result.data };
}
