import type {} from "@atcute/lexicons";
import * as v from "@atcute/lexicons/validations";
import type {} from "@atcute/lexicons/ambient";

const _localeSchema = /*#__PURE__*/ v.object({
  $type: /*#__PURE__*/ v.optional(
    /*#__PURE__*/ v.literal("blue.rito.feed.bookmark#locale"),
  ),
  comment: /*#__PURE__*/ v.optional(
    /*#__PURE__*/ v.constrain(/*#__PURE__*/ v.string(), [
      /*#__PURE__*/ v.stringLength(0, 20000),
      /*#__PURE__*/ v.stringGraphemes(0, 2000),
    ]),
  ),
  lang: /*#__PURE__*/ v.literalEnum(["en", "ja"]),
  title: /*#__PURE__*/ v.constrain(/*#__PURE__*/ v.string(), [
    /*#__PURE__*/ v.stringLength(0, 500),
    /*#__PURE__*/ v.stringGraphemes(0, 50),
  ]),
});
const _mainSchema = /*#__PURE__*/ v.record(
  /*#__PURE__*/ v.tidString(),
  /*#__PURE__*/ v.object({
    $type: /*#__PURE__*/ v.literal("blue.rito.feed.bookmark"),
    createdAt: /*#__PURE__*/ v.datetimeString(),
    get resolvers() {
      return /*#__PURE__*/ v.optional(/*#__PURE__*/ v.array(nsidSchema));
    },
    subject: /*#__PURE__*/ v.optional(/*#__PURE__*/ v.genericUriString()),
    tags: /*#__PURE__*/ v.optional(
      /*#__PURE__*/ v.constrain(
        /*#__PURE__*/ v.array(
          /*#__PURE__*/ v.constrain(/*#__PURE__*/ v.string(), [
            /*#__PURE__*/ v.stringLength(1, 200),
            /*#__PURE__*/ v.stringGraphemes(1, 20),
          ]),
        ),
        [/*#__PURE__*/ v.arrayLength(0, 10)],
      ),
    ),
    get titles() {
      return /*#__PURE__*/ v.constrain(/*#__PURE__*/ v.array(localeSchema), [
        /*#__PURE__*/ v.arrayLength(1),
      ]);
    },
  }),
);
const _nsidSchema = /*#__PURE__*/ v.object({
  $type: /*#__PURE__*/ v.optional(
    /*#__PURE__*/ v.literal("blue.rito.feed.bookmark#nsid"),
  ),
  nsid: /*#__PURE__*/ v.string(),
  urlSchema: /*#__PURE__*/ v.string(),
});

type locale$schematype = typeof _localeSchema;
type main$schematype = typeof _mainSchema;
type nsid$schematype = typeof _nsidSchema;

export interface localeSchema extends locale$schematype {}
export interface mainSchema extends main$schematype {}
export interface nsidSchema extends nsid$schematype {}

export const localeSchema = _localeSchema as localeSchema;
export const mainSchema = _mainSchema as mainSchema;
export const nsidSchema = _nsidSchema as nsidSchema;

export interface Locale extends v.InferInput<typeof localeSchema> {}
export interface Main extends v.InferInput<typeof mainSchema> {}
export interface Nsid extends v.InferInput<typeof nsidSchema> {}

declare module "@atcute/lexicons/ambient" {
  interface Records {
    "blue.rito.feed.bookmark": mainSchema;
  }
}
