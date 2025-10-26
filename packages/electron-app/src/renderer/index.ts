import { createRoot } from "react-dom/client";
import { createApp } from "./App";
import "./css_reset.css";
import "./index.css";

const container = document.getElementById("renderer");

const root = createRoot(container!);

root.render(createApp());
