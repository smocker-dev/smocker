// index.js

import {
  Elm
} from './elm/Main.elm'
import './main.scss'
import './flex.scss'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'

const app = Elm.Main.init({
  node: document.querySelector('main'),
  flags: {
    basePath: basePath,
    version: version
  },
})

app.ports.highlight.subscribe(function () {
  document.querySelectorAll('pre code').forEach((block) => {
    hljs.highlightBlock(block);
  });
});
