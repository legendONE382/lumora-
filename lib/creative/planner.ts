import { Scene } from "@/types";

export function planVideoFromCreativePlan(plan: any): {
  scenes: (Scene & { imageUrl: string })[];
  totalDuration: number;
} {
  const scenes: (Scene & { imageUrl: string })[] = plan.scenes.map(
    (scene: any) => ({
      ...scene,
      imageUrl: "",
    })
  );

  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);

  return { scenes, totalDuration };
}
