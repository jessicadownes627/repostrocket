import { analyzeImagesSmart } from "./aiImageEngine";
import { parseTitleSmart } from "./titleParserV2";
import { buildDescriptionPro } from "./descriptionEnginePro";
import { mergeAIResults } from "./mergeAIResults";

export async function runMagicFill(listing) {
  const images = listing.photos || [];
  const title = listing.title || "";
  const userDesc = listing.description || "";

  const imageHints = images.length ? await analyzeImagesSmart(images) : {};
  const parsedTitle = await parseTitleSmart(title);
  const merged = mergeAIResults(parsedTitle, imageHints);
  const description = await buildDescriptionPro({
    parsed: merged,
    userDesc,
    imageHints,
  });

  return {
    ...listing,
    ...merged,
    description,
  };
}
