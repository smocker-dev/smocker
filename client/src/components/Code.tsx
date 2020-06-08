import { Collapse } from "antd";
import "codemirror/addon/fold/brace-fold";
import "codemirror/addon/fold/comment-fold";
import "codemirror/addon/fold/foldcode";
import "codemirror/addon/fold/foldgutter";
import "codemirror/addon/fold/foldgutter.css";
import "codemirror/addon/fold/indent-fold";
import "codemirror/addon/lint/lint";
import "codemirror/addon/lint/lint.css";
import "codemirror/addon/lint/yaml-lint";
import "codemirror/lib/codemirror.css";
import "codemirror/mode/javascript/javascript";
import "codemirror/mode/ruby/ruby";
import "codemirror/mode/yaml/yaml";
import "codemirror/theme/material.css";
import jsyaml from "js-yaml";
import * as React from "react";
import { Controlled, UnControlled } from "react-codemirror2";
import "./Code.scss";

window.jsyaml = jsyaml;

const largeBodyLength = 5000;

interface Props {
  value: string;
  language:
    | "go_template"
    | "go_template_yaml"
    | "yaml"
    | "go_template_json"
    | "json"
    | "lua"
    | "txt";
  collapsible?: boolean;
  onBeforeChange?: (value: string) => unknown;
}

const codeMirrorOptions = {
  theme: "material",
  lineWrapping: true,
  readOnly: true,
  viewportMargin: Infinity,
  foldGutter: true,
  gutters: ["CodeMirror-foldgutter"],
};

const Code = ({
  value,
  language,
  onBeforeChange,
  collapsible = true,
}: Props): JSX.Element => {
  let mode: string = language;
  switch (mode) {
    case "lua":
      mode = "ruby"; // because lua mode doesn't handle fold
      break;

    case "json":
    case "go_template_json":
      mode = "application/json";
      break;

    case "go_template":
    case "go_template_yaml":
      mode = "yaml";
      break;
  }

  let body = null;
  if (!onBeforeChange) {
    body = (
      <UnControlled
        className="code-editor"
        value={value}
        options={{
          ...codeMirrorOptions,
          mode,
        }}
      />
    );
  }

  const onBeforeChangeWrapper = (_: unknown, __: unknown, newValue: string) => {
    if (onBeforeChange) {
      onBeforeChange(newValue);
    }
  };
  body = (
    <Controlled
      className="code-editor"
      value={value}
      options={{
        ...codeMirrorOptions,
        mode,
        readOnly: false,
        lineNumbers: true,
        lint: true,
        gutters: [
          ...codeMirrorOptions.gutters,
          "CodeMirror-linenumbers",
          "CodeMirror-lint-markers",
        ],
      }}
      onBeforeChange={onBeforeChangeWrapper}
    />
  );

  if (collapsible && value.length > largeBodyLength) {
    return (
      <Collapse>
        <Collapse.Panel
          header="This payload is huge. Click to display it"
          key="1"
        >
          {body}
        </Collapse.Panel>
      </Collapse>
    );
  }
  return body;
};

export default Code;
