import type {
  ExtensionAPI,
  ExtensionCommandContext,
} from "@earendil-works/pi-coding-agent";
import type { AutocompleteItem } from "@earendil-works/pi-tui";
import { onSessionBeforeSwitch } from "./commands/models";
import { PROVIDER_NAME } from "./constants";
import { onModelSelect } from "./events";
import { CommandManager } from "./manager";

export default async function (pi: ExtensionAPI) {
  const manager = new CommandManager(pi);
  await manager.initialize();

  // Command: /models
  pi.registerCommand("models", {
    description: `Browse ${PROVIDER_NAME} models`,
    getArgumentCompletions: (prefix: string): AutocompleteItem[] | null => {
      const available = [
        {
          value: "info",
          label: "info",
          description: "Show information of all models",
        },
        {
          value: "unload",
          label: "unload",
          description: "Unload all models",
        },
      ];

      const filtered = available.filter((a) => a.value.startsWith(prefix));
      return filtered.length > 0 ? filtered : null;
    },
    handler: async (args: string, ctx: ExtensionCommandContext) =>
      await manager.run(args, ctx),
  });

  // Events registration
  pi.on("model_select", onModelSelect);
  pi.on("session_before_switch", onSessionBeforeSwitch);
}
