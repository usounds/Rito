import type {} from "@atcute/lexicons";
import * as v from "@atcute/lexicons/validations";
import type {} from "@atcute/lexicons/ambient";

const _mainSchema = /*#__PURE__*/ v.query(
  "blue.rito.preference.getPreference",
  {
    params: null,
    output: {
      type: "lex",
      schema: /*#__PURE__*/ v.object({
        /**
         * Whether to automatically collect Bluesky posts to Rito bookmarks.
         */
        enableAutoGenerateBookmark: /*#__PURE__*/ v.boolean(),
        /**
         * User's preferred language for Auto Generate Bookmark.
         */
        langForAutoGenertateBookmark: /*#__PURE__*/ v.string(),
        /**
         * Moderation categories that should not be blurred.
         */
        unblurModerationCategories: /*#__PURE__*/ v.optional(
          /*#__PURE__*/ v.array(/*#__PURE__*/ v.string()),
        ),
      }),
    },
  },
);

type main$schematype = typeof _mainSchema;

export interface mainSchema extends main$schematype {}

export const mainSchema = _mainSchema as mainSchema;

export interface $params {}
export interface $output extends v.InferXRPCBodyInput<mainSchema["output"]> {}

declare module "@atcute/lexicons/ambient" {
  interface XRPCQueries {
    "blue.rito.preference.getPreference": mainSchema;
  }
}
