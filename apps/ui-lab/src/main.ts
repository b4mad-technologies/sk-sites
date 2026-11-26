import "@fontsource-variable/newsreader";
import "./app.css";

import { mount } from "svelte";
import App from "./App.svelte";

const target = document.getElementById("app");
if (!target) throw new Error("ui-lab mount target #app is missing");
mount(App, { target });
