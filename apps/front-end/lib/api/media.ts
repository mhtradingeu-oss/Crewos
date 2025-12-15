import { api } from "./client.ts";

type ApiEnvelope<T> = { success?: boolean; data: T };

export type MediaEngine = {
  id: string;
  label: string;
  description?: string;
  isFree: boolean;
  requiresApiKey: boolean;
  enabledByDefault: boolean;
  envVarKeys?: string[];
  available?: boolean;
  missingKeys?: string[];
};

export type ImageGeneratePayload = {
  prompt: string;
  negativePrompt?: string;
  engineId?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfgScale?: number;
  seed?: number;
  stylePreset?: string;
  format?: "png" | "jpg" | "webp";
};

export type VideoGeneratePayload = {
  prompt: string;
  engineId?: string;
  durationSeconds?: number;
  fps?: number;
  aspectRatio?: string;
  seed?: number;
  stylePreset?: string;
};

export type MediaGeneratePayload =
  | (ImageGeneratePayload & { type: "image"; resolution?: string })
  | (VideoGeneratePayload & { type: "video" });

export type MediaAsset = {
  url: string;
  provider: string;
  kind: "image" | "video";
  width?: number;
  height?: number;
  previewImageUrl?: string;
  meta?: Record<string, unknown>;
  riskLevel?: string;
  runId?: string;
};

export async function listImageEngines() {
  const { data } = await api.get<ApiEnvelope<MediaEngine[]>>("/media/engines/images");
  return data.data;
}

export async function listVideoEngines() {
  const { data } = await api.get<ApiEnvelope<MediaEngine[]>>("/media/engines/videos");
  return data.data;
}

export async function generateImage(payload: ImageGeneratePayload) {
  const { data } = await api.post<ApiEnvelope<any>>("/media/generate/image", payload);
  return data.data;
}

export async function generateVideo(payload: VideoGeneratePayload) {
  const { data } = await api.post<ApiEnvelope<any>>("/media/generate/video", payload);
  return data.data;
}

export async function generateMedia(payload: MediaGeneratePayload): Promise<MediaAsset> {
  const { type, resolution, ...rest } = payload as MediaGeneratePayload & { resolution?: string };
  const endpoint = type === "video" ? "/media/generate/video" : "/media/generate/image";
  const body: Record<string, unknown> = { ...rest };

  if (type === "image" && resolution) {
    const [w, h] = resolution.split("x").map((value: string) => Number(value));
    if (Number.isFinite(w)) body.width = w;
    if (Number.isFinite(h)) body.height = h;
  }

  const { data } = await api.post<ApiEnvelope<any>>(endpoint, body);
  const asset = data.data ?? {};
  return {
    url: asset.url,
    provider: asset.provider,
    previewImageUrl: asset.previewImageUrl ?? asset.meta?.previewImageUrl,
    width: asset.width,
    height: asset.height,
    meta: asset.meta,
    kind: type,
    riskLevel: asset.riskLevel,
    runId: asset.runId,
  } as MediaAsset;
}
