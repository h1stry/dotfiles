import { Mode } from "../enums/mode";
import { ModelsEndpoint } from "../interfaces/endpoints/models";
import { rpc } from "../tools/retriever";
import { BaseModel } from "./baseModel";

export class SingleModel extends BaseModel {
  get mode(): Mode {
    return Mode.SINGLE;
  }

  async getCapabilities(): Promise<("text" | "image")[]> {
    const { models } = await rpc<ModelsEndpoint>(`/models`);
    const [model] = models!;

    const hasImage = model.capabilities.includes("multimodal");
    return hasImage ? ["text", "image"] : ["text"];
  }
}
