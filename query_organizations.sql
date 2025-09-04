SELECT 
  id,
  code,
  name,
  level,
  "parentId",
  "sortOrder",
  "isActive"
FROM organizations 
ORDER BY level, "sortOrder", name;