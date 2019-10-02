// index.js

import { Elm } from './elm/Main.elm'
import 'bulma/css/bulma.css'

Elm.Main.init({
  node: document.querySelector('main'),
  flags: { basePath: basePath, version: version },
})
