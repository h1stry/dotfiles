import { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { PROVIDER_ID } from "./constants";
import { ModelSelectEvent } from "./interfaces/events";
import { listModels } from "./tools/retriever";

/**
 * Reacts to a new model event triggered by Pi
 * @param event Model selection event
 * @param ctx Pi context
 */
export const onModelSelect = async (
  event: ModelSelectEvent,
  ctx: ExtensionContext,
) => {
  if (event.model.provider !== PROVIDER_ID) return;

  const models = await listModels();
  const model = models.find((m) => m.id === event.model.id);
  if (!model) return;

  ctx.ui.notify(`Loading ${model.name}...`, "info");
  await model
    .load()
    .then(() => ctx.ui.notify(`Model ${model.name} ready`, "info"))
    .catch(() => ctx.ui.notify(`Failed to load model ${model.name}`, "error"));
};
