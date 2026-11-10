/// <reference lib="webworker" />
import { AiRandom, chooseAction } from "@tcg/ai";
import type { AiRequest, AiResponse } from "./aiDriver.ts";

const rng = new AiRandom(Date.now() >>> 0);

self.onmessage = (e: MessageEvent<AiRequest>) => {
  const action = chooseAction(e.data.state, e.data.level, rng);
  self.postMessage({ id: e.data.id, action } satisfies AiResponse);
};
