// index.js

import { Elm } from './Main.elm'
import 'bulma/css/bulma.css'

const app = Elm.Main.init({
  node: document.querySelector('main'),
  flags: { basePath: basePath, version: version },
})

app.ports.title.subscribe(function (title) {
  document.title = title;
});
