import { mount } from "svelte";
import App from "./ui/App.svelte";
import "./ui/global.css";

const target = document.getElementById("app")!;
if (location.hash === "#carte-hd") {
  // Preview of the painted HD cards (graphics plan, phase 1).
  void import("./ui/CardPreview.svelte").then((m) => mount(m.default, { target }));
} else {
  mount(App, { target });
}
