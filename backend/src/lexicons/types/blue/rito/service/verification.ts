import type {} from "@atcute/lexicons";
import * as v from "@atcute/lexicons/validations";
import type {} from "@atcute/lexicons/ambient";
import * as BlueRitoFeedBookmark from "../feed/bookmark.js";

const _mainSchema = /*#__PURE__*/ v.record(
  /*#__PURE__*/ v.string(),
  /*#__PURE__*/ v.object({
    $type: /*#__PURE__*/ v.literal("blue.rito.service.verification"),
    createdAt: /*#__PURE__*/ v.datetimeString(),
    get subject() {
      return BlueRitoFeedBookmark.mainSchema;
    },
    uri: /*#__PURE__*/ v.genericUriString(),
  }),
);

type main$schematype = typeof _mainSchema;

export interface mainSchema extends main$schematype {}

export const mainSchema = _mainSchema as mainSchema;

export interface Main extends v.InferInput<typeof mainSchema> {}

declare module "@atcute/lexicons/ambient" {
  interface Records {
    "blue.rito.service.verification": mainSchema;
  }
}
