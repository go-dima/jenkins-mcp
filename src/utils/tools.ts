import extraDescriptions from "../assets/extraDescriptions.json" with { type: "json" };

export const extendDescription = (
  toolId: keyof typeof extraDescriptions,
  baseDescription: string,
): string => {
  const { description: extra } = extraDescriptions[toolId];
  return `${baseDescription}\n\n${extra}`;
}
