import type { MediaCallContext } from "../../core/ai/providers/media/media.types.js";
import { mediaStudioService, type WhiteLabelRequest } from "../media-studio/media-studio.service.js";

export const whiteLabelConfiguratorService = {
  async preview(payload: WhiteLabelRequest, ctx: MediaCallContext) {
    const enriched: WhiteLabelRequest = {
      surfaces: ensureSurfaces(payload.surfaces),
      ...payload,
    };
    return mediaStudioService.productMockup(enriched, ctx);
  },

  async batch(payload: WhiteLabelRequest & { variants?: WhiteLabelRequest[] }, ctx: MediaCallContext) {
    const enriched: WhiteLabelRequest = {
      surfaces: ensureSurfaces(payload.surfaces),
      ...payload,
    };
    return mediaStudioService.whiteLabelBatch(enriched, ctx);
  },
};

function ensureSurfaces(surfaces?: string[]) {
  const required = ["front", "back", "side"];
  const provided = surfaces ?? [];
  const merged = [...required, ...provided];
  const seen = new Set<string>();
  return merged.filter((surface) => {
    if (seen.has(surface)) return false;
    seen.add(surface);
    return true;
  });
}
