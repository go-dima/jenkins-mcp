import tailoredDescriptions from "../assets/tailoredDescriptions.json" with { type: "json" };

export function extendDescription(
  toolId: keyof typeof tailoredDescriptions,
  description: string,
): string {
  const { description: tailoredDescription } = tailoredDescriptions[toolId];
  return `${description}\n\n${tailoredDescription}`;
}
