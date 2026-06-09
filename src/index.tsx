import React from "react";
// @ts-ignore: allow importing from react-dom/client in this prototype
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./store";
import App from "./App";
// @ts-ignore: CSS module types omitted for rapid prototype
import "./styles/globals.module.css";

const container = document.getElementById("root")!;
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
);
