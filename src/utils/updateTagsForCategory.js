import { getCuratedTags } from "./curatedTagBank";

export function updateTagsForCategory(category) {
  return getCuratedTags(category);
}
