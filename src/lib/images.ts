import "server-only";
import fs from "node:fs";
import path from "node:path";

const RASTER = [
  { ext: "png", mime: "image/png" },
  { ext: "jpg", mime: "image/jpeg" },
  { ext: "webp", mime: "image/webp" },
] as const;

/** AI 로 미리 만든 그림 파일(png/jpg/webp)이 있으면 그 경로와 형식을 돌려줍니다. */
export function generatedImage(id: string): { file: string; ext: string; mime: string } | null {
  for (const r of RASTER) {
    const file = path.join(process.cwd(), "public", "challenges", `${id}.${r.ext}`);
    if (fs.existsSync(file)) return { file, ext: r.ext, mime: r.mime };
  }
  return null;
}

/** AI 로 미리 만든 그림이 있으면 그것을, 없으면 기본 SVG 그림을 씁니다. */
export function challengeImageUrl(id: string): string {
  const g = generatedImage(id);
  return g ? `/challenges/${id}.${g.ext}` : `/challenges/${id}.svg`;
}
