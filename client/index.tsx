import * as React from "react";
import { render } from "react-dom";
import App from "~components/App";

render(<App />, document.getElementById("root"));

const m = module;
if (m.hot) {
  m.hot.accept();
}
