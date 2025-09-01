import type {} from "@atcute/lexicons";
import * as v from "@atcute/lexicons/validations";
import type {} from "@atcute/lexicons/ambient";

const _mainSchema = /*#__PURE__*/ v.record(
  /*#__PURE__*/ v.tidString(),
  /*#__PURE__*/ v.object({
    $type: /*#__PURE__*/ v.literal("blue.rito.feed.bookmark"),
    createdAt: /*#__PURE__*/ v.datetimeString(),
    publicComment: /*#__PURE__*/ v.optional(
      /*#__PURE__*/ v.constrain(/*#__PURE__*/ v.string(), [
        /*#__PURE__*/ v.stringLength(0, 20000),
        /*#__PURE__*/ v.stringGraphemes(0, 2000),
      ]),
    ),
    get resolvers() {
      return /*#__PURE__*/ v.optional(/*#__PURE__*/ v.array(nsidSchema));
    },
    subject: /*#__PURE__*/ v.genericUriString(),
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
    title: /*#__PURE__*/ v.constrain(/*#__PURE__*/ v.string(), [
      /*#__PURE__*/ v.stringLength(0, 500),
      /*#__PURE__*/ v.stringGraphemes(0, 50),
    ]),
  }),
);
const _nsidSchema = /*#__PURE__*/ v.object({
  $type: /*#__PURE__*/ v.optional(
    /*#__PURE__*/ v.literal("blue.rito.feed.bookmark#nsid"),
  ),
  nsid: /*#__PURE__*/ v.string(),
  urlSchema: /*#__PURE__*/ v.string(),
});

type main$schematype = typeof _mainSchema;
type nsid$schematype = typeof _nsidSchema;

export interface mainSchema extends main$schematype {}
export interface nsidSchema extends nsid$schematype {}

export const mainSchema = _mainSchema as mainSchema;
export const nsidSchema = _nsidSchema as nsidSchema;

export interface Main extends v.InferInput<typeof mainSchema> {}
export interface Nsid extends v.InferInput<typeof nsidSchema> {}

declare module "@atcute/lexicons/ambient" {
  interface Records {
    "blue.rito.feed.bookmark": mainSchema;
  }
}
