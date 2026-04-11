import type {} from "@atcute/lexicons";
import * as v from "@atcute/lexicons/validations";
import type {} from "@atcute/lexicons/ambient";

const _localeSchema = /*#__PURE__*/ v.object({
  $type: /*#__PURE__*/ v.optional(
    /*#__PURE__*/ v.literal("blue.rito.feed.bookmark#locale"),
  ),
  /**
   * URI's comment. It can use GitHub Flavored Markdown.
   * @maxLength 100000
   * @maxGraphemes 10000
   */
  comment: /*#__PURE__*/ v.optional(
    /*#__PURE__*/ v.constrain(/*#__PURE__*/ v.string(), [
      /*#__PURE__*/ v.stringLength(0, 100000),
      /*#__PURE__*/ v.stringGraphemes(0, 10000),
    ]),
  ),
  /**
   * Comments Language
   * @maxLength 6
   */
  lang: /*#__PURE__*/ v.literalEnum(["en", "ja"]),
  /**
   * URI's title
   * @maxLength 500
   * @maxGraphemes 50
   */
  title: /*#__PURE__*/ v.constrain(/*#__PURE__*/ v.string(), [
    /*#__PURE__*/ v.stringLength(0, 500),
    /*#__PURE__*/ v.stringGraphemes(0, 50),
  ]),
});
const _mainSchema = /*#__PURE__*/ v.record(
  /*#__PURE__*/ v.tidString(),
  /*#__PURE__*/ v.object({
    $type: /*#__PURE__*/ v.literal("blue.rito.feed.bookmark"),
    /**
     * Title and comment in different languages.
     * @minLength 1
     */
    get comments() {
      return /*#__PURE__*/ v.constrain(/*#__PURE__*/ v.array(localeSchema), [
        /*#__PURE__*/ v.arrayLength(1),
      ]);
    },
    createdAt: /*#__PURE__*/ v.datetimeString(),
    /**
     * OGP Description
     */
    ogpDescription: /*#__PURE__*/ v.optional(/*#__PURE__*/ v.string()),
    /**
     * OGP Image Uri
     */
    ogpImage: /*#__PURE__*/ v.optional(/*#__PURE__*/ v.genericUriString()),
    /**
     * OGP Title
     */
    ogpTitle: /*#__PURE__*/ v.optional(/*#__PURE__*/ v.string()),
    subject: /*#__PURE__*/ v.genericUriString(),
    /**
     * Tags describing the uri's description (max 10 tags, 25 charactors)
     * @maxLength 10
     */
    tags: /*#__PURE__*/ v.optional(
      /*#__PURE__*/ v.constrain(
        /*#__PURE__*/ v.array(
          /*#__PURE__*/ v.constrain(/*#__PURE__*/ v.string(), [
            /*#__PURE__*/ v.stringLength(1, 250),
            /*#__PURE__*/ v.stringGraphemes(1, 25),
          ]),
        ),
        [/*#__PURE__*/ v.arrayLength(0, 10)],
      ),
    ),
  }),
);

type locale$schematype = typeof _localeSchema;
type main$schematype = typeof _mainSchema;

export interface localeSchema extends locale$schematype {}
export interface mainSchema extends main$schematype {}

export const localeSchema = _localeSchema as localeSchema;
export const mainSchema = _mainSchema as mainSchema;

export interface Locale extends v.InferInput<typeof localeSchema> {}
export interface Main extends v.InferInput<typeof mainSchema> {}

declare module "@atcute/lexicons/ambient" {
  interface Records {
    "blue.rito.feed.bookmark": mainSchema;
  }
}
