export function mergeAIResults(titleData = {}, photoData = {}) {
  const merged = { ...titleData };

  if (!merged.color && photoData.color) merged.color = photoData.color;
  if (!merged.size && photoData.size) merged.size = photoData.size;
  if (!merged.category && photoData.category) merged.category = photoData.category;

  if (photoData.material) merged.material = photoData.material;
  if (photoData.style) merged.style = photoData.style;
  if (photoData.pattern) merged.pattern = photoData.pattern;
  if (photoData.grade) merged.grade = photoData.grade;
  if (photoData.year) merged.year = photoData.year;
  if (photoData.team) merged.team = photoData.team;

  return merged;
}
