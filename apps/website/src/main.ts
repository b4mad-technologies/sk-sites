import "./styles.css";

import { mount } from "svelte";
import App from "./App.svelte";

const target = document.getElementById("app");
if (!target) {
	throw new Error("website mount target #app is missing");
}
mount(App, { target });
