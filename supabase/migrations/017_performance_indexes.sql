SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'individuals',
    'families',
    'locations'
  )
ORDER BY tablename, indexname;