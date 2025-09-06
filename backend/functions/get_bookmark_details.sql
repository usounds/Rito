-- FUNCTION: public.get_bookmark_details(text)

-- DROP FUNCTION IF EXISTS public.get_bookmark_details(text);

CREATE OR REPLACE FUNCTION public.get_bookmark_details(
	p_uri text)
    RETURNS TABLE(uri text, subject text, ogp_title text, ogp_description text, ogp_image text, created_at timestamp without time zone, indexed_at timestamp without time zone, verified boolean, comments jsonb, tags jsonb) 
    LANGUAGE 'plpgsql'
    COST 100
    STABLE PARALLEL UNSAFE
    ROWS 1000

AS $BODY$
BEGIN
  RETURN QUERY
  SELECT
    b.uri,
    b.subject,
    b.ogp_title,
    b.ogp_description,
    b.ogp_image,
    b.created_at,
    b.indexed_at,
    b.verified,
    COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
      'lang', c.lang,
      'title', c.title,
      'comment', c.comment
    )) FILTER (WHERE c.id IS NOT NULL), '[]'::jsonb) AS comments,
    COALESCE(jsonb_agg(DISTINCT t.name) FILTER (WHERE t.id IS NOT NULL), '[]'::jsonb) AS tags
  FROM "Bookmark" b
  LEFT JOIN "Comment" c ON c.bookmark_uri = b.uri
  LEFT JOIN "BookmarkTag" bt ON bt.bookmark_uri = b.uri
  LEFT JOIN "Tag" t ON t.id = bt.tag_id
  WHERE b.uri = p_uri
  GROUP BY b.uri, b.subject, b.ogp_title, b.ogp_description, b.ogp_image, b.created_at, b.indexed_at, b.verified;
END;
$BODY$;

ALTER FUNCTION public.get_bookmark_details(text)
    OWNER TO rito;

GRANT EXECUTE ON FUNCTION public.get_bookmark_details(text) TO PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_bookmark_details(text) TO rito;

GRANT EXECUTE ON FUNCTION public.get_bookmark_details(text) TO web_anon;

