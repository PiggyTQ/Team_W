-- Avemly original synthetic teaching case; counts are registration records, not people.
WITH latest AS (
 SELECT *, ROW_NUMBER() OVER (
  PARTITION BY registration_id ORDER BY updated_at DESC
 ) AS revision_rank
 FROM registrations
), valid AS (
 SELECT registration_id, channel, substr(registered_at,1,7) AS month
 FROM latest
 WHERE revision_rank = 1 AND is_test = 0 AND status = 'active'
   AND registered_at >= '2026-04-01' AND registered_at < '2026-06-01'
)
SELECT channel,
 SUM(CASE WHEN month='2026-04' THEN 1 ELSE 0 END) AS april,
 SUM(CASE WHEN month='2026-05' THEN 1 ELSE 0 END) AS may
FROM valid GROUP BY channel ORDER BY channel;
