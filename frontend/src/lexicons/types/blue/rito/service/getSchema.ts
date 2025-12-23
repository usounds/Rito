import type {} from "@atcute/lexicons";
import * as v from "@atcute/lexicons/validations";
import type {} from "@atcute/lexicons/ambient";

const _langsSchema = /*#__PURE__*/ v.object({
  $type: /*#__PURE__*/ v.optional(
    /*#__PURE__*/ v.literal("blue.rito.service.getSchema#langs"),
  ),
  comment: /*#__PURE__*/ v.optional(/*#__PURE__*/ v.string()),
  lang: /*#__PURE__*/ v.string(),
  moderation: /*#__PURE__*/ v.array(/*#__PURE__*/ v.string()),
  title: /*#__PURE__*/ v.string(),
});
const _mainSchema = /*#__PURE__*/ v.procedure("blue.rito.service.getSchema", {
  params: null,
  input: {
    type: "lex",
    schema: /*#__PURE__*/ v.object({
      nsid: /*#__PURE__*/ v.string(),
    }),
  },
  output: {
    type: "lex",
    schema: /*#__PURE__*/ v.object({
      /**
       * Comments with titles, content, and moderation in multiple languages.
       * @minLength 1
       */
      get comments() {
        return /*#__PURE__*/ v.constrain(/*#__PURE__*/ v.array(langsSchema), [
          /*#__PURE__*/ v.arrayLength(1),
        ]);
      },
      /**
       * Moderation result for OGP title and description
       */
      moderations: /*#__PURE__*/ v.array(/*#__PURE__*/ v.string()),
      /**
       * Namespace ID of the service or application (e.g., 'uk.skyblur.post').
       */
      nsid: /*#__PURE__*/ v.string(),
      /**
       * The Open Graph Protocol (OGP) description for the bookmark.
       */
      ogpDescription: /*#__PURE__*/ v.optional(/*#__PURE__*/ v.string()),
      /**
       * The Open Graph Protocol (OGP) image URL for the bookmark.
       */
      ogpImage: /*#__PURE__*/ v.optional(/*#__PURE__*/ v.genericUriString()),
      /**
       * The Open Graph Protocol (OGP) title for the bookmark.
       */
      ogpTitle: /*#__PURE__*/ v.optional(/*#__PURE__*/ v.string()),
      /**
       * The schema URL pattern associated with this NSID (e.g., 'https://skyblur.uk/post/{did}/{rkey}').
       */
      schema: /*#__PURE__*/ v.string(),
      /**
       * This field contains tags. If registered by the owner, it may include 'Verified'.
       */
      tags: /*#__PURE__*/ v.optional(
        /*#__PURE__*/ v.array(/*#__PURE__*/ v.string()),
      ),
      /**
       * If this comment registed by owner, this field should be true.
       */
      verified: /*#__PURE__*/ v.boolean(),
    }),
  },
});

type langs$schematype = typeof _langsSchema;
type main$schematype = typeof _mainSchema;

export interface langsSchema extends langs$schematype {}
export interface mainSchema extends main$schematype {}

export const langsSchema = _langsSchema as langsSchema;
export const mainSchema = _mainSchema as mainSchema;

export interface Langs extends v.InferInput<typeof langsSchema> {}

export interface $params {}
export interface $input extends v.InferXRPCBodyInput<mainSchema["input"]> {}
export interface $output extends v.InferXRPCBodyInput<mainSchema["output"]> {}

declare module "@atcute/lexicons/ambient" {
  interface XRPCProcedures {
    "blue.rito.service.getSchema": mainSchema;
  }
}
