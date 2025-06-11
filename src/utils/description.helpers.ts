import extraDescriptions from "../assets/extraDescriptions.json" with { type: "json" };

export const extendDescription = (
  toolId: keyof typeof extraDescriptions,
  baseDescription: string,
): string => {
  const { description: extra } = extraDescriptions[toolId];
  const joinedExtra = joinDescription(extra);
  return [baseDescription, joinedExtra].join("\n\n");
};

export const joinDescription = (description: string | string[]): string => {
  return Array.isArray(description) ? description.join("\n\n") : description;
};