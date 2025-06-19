-- Create a secure function to get top saved restaurants
-- This aggregates data without exposing personal user information

CREATE OR REPLACE FUNCTION get_top_saved_restaurants(min_saves INTEGER DEFAULT 1)
RETURNS TABLE (
  id UUID,
  name TEXT,
  address TEXT,
  latitude FLOAT8,
  longitude FLOAT8,
  rating FLOAT4,
  price_level INTEGER,
  save_count BIGINT,
  popular_tags TEXT[]
) 
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    r.id,
    r.name,
    r.address,
    r.latitude,
    r.longitude,
    r.rating,
    r.price_level,
    COUNT(DISTINCT sr.user_id) as save_count,
    ARRAY(
      SELECT DISTINCT unnest(sr_inner.tags) 
      FROM saved_recs sr_inner 
      WHERE sr_inner.restaurant_id = r.id 
      AND sr_inner.tags IS NOT NULL
      LIMIT 10
    ) as popular_tags
  FROM restaurants r
  INNER JOIN saved_recs sr ON r.id = sr.restaurant_id
  GROUP BY r.id, r.name, r.address, r.latitude, r.longitude, r.rating, r.price_level
  HAVING COUNT(DISTINCT sr.user_id) >= min_saves
  ORDER BY save_count DESC, r.rating DESC NULLS LAST
  LIMIT 50;
$$;

-- Grant execution permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_top_saved_restaurants(INTEGER) TO authenticated;

-- Create a view for easier access (optional)
CREATE OR REPLACE VIEW public_top_saved AS
SELECT 
  r.id,
  r.name,
  r.address,
  r.latitude,
  r.longitude,
  r.rating,
  r.price_level,
  COUNT(DISTINCT sr.user_id) as save_count,
  ARRAY(
    SELECT DISTINCT unnest(sr_inner.tags) 
    FROM saved_recs sr_inner 
    WHERE sr_inner.restaurant_id = r.id 
    AND sr_inner.tags IS NOT NULL
    LIMIT 10
  ) as popular_tags
FROM restaurants r
INNER JOIN saved_recs sr ON r.id = sr.restaurant_id
GROUP BY r.id, r.name, r.address, r.latitude, r.longitude, r.rating, r.price_level
HAVING COUNT(DISTINCT sr.user_id) >= 1
ORDER BY save_count DESC, r.rating DESC NULLS LAST
LIMIT 50;

-- Grant read access to the view
GRANT SELECT ON public_top_saved TO authenticated;

-- Example usage:
-- SELECT * FROM get_top_saved_restaurants(2); -- Get places saved by 2+ users
-- SELECT * FROM public_top_saved; -- Use the view directly 