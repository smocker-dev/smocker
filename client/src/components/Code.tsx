import * as React from "react";

import { UnControlled, Controlled } from "react-codemirror2";
import "codemirror/addon/fold/brace-fold";
import "codemirror/addon/fold/foldcode";
import "codemirror/addon/fold/foldgutter";
import "codemirror/addon/fold/foldgutter.css";
import "codemirror/lib/codemirror.css";
import "codemirror/mode/javascript/javascript";
import "codemirror/theme/material.css";
import "codemirror/addon/lint/lint.css";
import "codemirror/mode/yaml/yaml";
import "codemirror/mode/ruby/ruby";
import "codemirror/addon/fold/indent-fold";
import "codemirror/addon/fold/comment-fold";
import "codemirror/addon/lint/lint";
import "codemirror/addon/lint/yaml-lint";

import "./Code.scss";

interface Props {
  value: string;
  language:
    | "go_template"
    | "go_template_yaml"
    | "yaml"
    | "go_template_json"
    | "json"
    | "lua";
  editable?: boolean;
  onBeforeChange?: (value: string) => void;
}

const codeMirrorOptions = {
  theme: "material",
  lineWrapping: true,
  readOnly: true,
  viewportMargin: Infinity,
  foldGutter: true,
  gutters: ["CodeMirror-foldgutter"]
};

const Code = ({ value, language, editable = false, onBeforeChange }: Props) => {
  let mode: string = language;
  if (mode === "lua") {
    mode = "ruby"; // because lua mode doesn't handle fold
  } else if (mode === "json" || mode === "go_template_json") {
    mode = "application/json";
  } else if (mode === "go_template" || mode === "go_template_yaml") {
    mode = "yaml";
  }

  if (!editable) {
    return (
      <UnControlled
        value={value}
        options={{
          ...codeMirrorOptions,
          mode
        }}
      />
    );
  }

  if (!onBeforeChange) {
    throw Error("onBeforeChange must be set in editable mode");
  }

  const onBeforeChangeWrapper = (_: any, __: any, newValue: string) => {
    onBeforeChange(newValue);
  };
  return (
    <Controlled
      value={value}
      options={{
        ...codeMirrorOptions,
        mode,
        readOnly: false,
        lineNumbers: true,
        lint: true,
        gutters: [
          ...codeMirrorOptions.gutters,
          "CodeMirror-lint-markers",
          "CodeMirror-linenumbers"
        ]
      }}
      onBeforeChange={onBeforeChangeWrapper}
    />
  );
};

export default Code;
