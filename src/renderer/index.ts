import { createRoot } from "react-dom/client";
import { createApp } from "./App";
import "./css_reset.css";
import "./index.css";

const container = document.getElementById("renderer");

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const root = createRoot(container!);

root.render(createApp());
