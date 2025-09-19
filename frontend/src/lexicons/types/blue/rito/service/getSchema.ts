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
      get comments() {
        return /*#__PURE__*/ v.array(langsSchema);
      },
      moderations: /*#__PURE__*/ v.array(/*#__PURE__*/ v.string()),
      nsid: /*#__PURE__*/ v.string(),
      ogpDescription: /*#__PURE__*/ v.optional(/*#__PURE__*/ v.string()),
      ogpImage: /*#__PURE__*/ v.optional(/*#__PURE__*/ v.genericUriString()),
      ogpTitle: /*#__PURE__*/ v.optional(/*#__PURE__*/ v.string()),
      schema: /*#__PURE__*/ v.string(),
      tags: /*#__PURE__*/ v.optional(
        /*#__PURE__*/ v.array(/*#__PURE__*/ v.string()),
      ),
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
