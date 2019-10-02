// index.js

import {
  Elm
} from './elm/Main.elm'
import './main.scss'

Elm.Main.init({
  node: document.querySelector('main'),
  flags: {
    basePath: basePath,
    version: version
  },
})
