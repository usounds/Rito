import type {} from "@atcute/lexicons";
import * as v from "@atcute/lexicons/validations";
import type {} from "@atcute/lexicons/ambient";

const _mainSchema = /*#__PURE__*/ v.record(
  /*#__PURE__*/ v.nsidString(),
  /*#__PURE__*/ v.object({
    $type: /*#__PURE__*/ v.literal("blue.rito.service.schema"),
    /**
     * The AppView URL for the NSID. For example, if the NSID is uk.skyblur.post, the URL should be https://skyblur.uk/post/{did}/{rkey}
     */
    schema: /*#__PURE__*/ v.genericUriString(),
  }),
);

type main$schematype = typeof _mainSchema;

export interface mainSchema extends main$schematype {}

export const mainSchema = _mainSchema as mainSchema;

export interface Main extends v.InferInput<typeof mainSchema> {}

declare module "@atcute/lexicons/ambient" {
  interface Records {
    "blue.rito.service.schema": mainSchema;
  }
}
