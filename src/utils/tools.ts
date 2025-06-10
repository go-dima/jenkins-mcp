import { TOOL_TAILORED_DESCRIPTIONS } from "../assets/tailoredDescriptions.js";
import { TOOL_DESCRIPTIONS } from "../assets/toolDescriptions.js";

export function getToolDescription(
  toolId: keyof typeof TOOL_DESCRIPTIONS
): string {
  const { description } = TOOL_DESCRIPTIONS[toolId];
  const { description: tailoredDescription } =
    TOOL_TAILORED_DESCRIPTIONS[toolId];

  return `${description}\n\n${tailoredDescription}`;
}
