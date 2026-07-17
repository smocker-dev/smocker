import { json } from "@codemirror/lang-json";
import { xml } from "@codemirror/lang-xml";
import { yaml } from "@codemirror/lang-yaml";
import { StreamLanguage } from "@codemirror/language";
import { lua } from "@codemirror/legacy-modes/mode/lua";
import { Diagnostic, linter, lintGutter } from "@codemirror/lint";
import { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { Collapse } from "antd";
import { load } from "js-yaml";
import * as React from "react";
import "./Code.scss";

const largeBodyLength = 5000;

export type Language =
  | "go_template"
  | "go_template_yaml"
  | "yaml"
  | "go_template_json"
  | "json"
  | "lua"
  | "xml"
  | "txt";

interface Props {
  value?: string;
  language: Language;
  collapsible?: boolean;
  onChange?: (value: string) => unknown;
}

const yamlLinter = linter((view: EditorView): Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  const contents = view.state.doc.toString();
  if (!contents.trim()) {
    return diagnostics;
  }
  try {
    load(contents);
  } catch (error) {
    const mark = (error as { mark?: { position?: number } }).mark;
    const position =
      mark && typeof mark.position === "number"
        ? Math.min(mark.position, contents.length)
        : 0;
    diagnostics.push({
      from: position,
      to: position,
      severity: "error",
      message: (error as Error).message,
    });
  }
  return diagnostics;
});

const languageExtensions = (language: Language): Extension[] => {
  switch (language) {
    case "json":
    case "go_template_json":
      return [json()];
    case "yaml":
    case "go_template":
    case "go_template_yaml":
      return [yaml(), yamlLinter, lintGutter()];
    case "xml":
      return [xml()];
    case "lua":
      return [StreamLanguage.define(lua)];
    default:
      return [];
  }
};

const baseExtensions: Extension[] = [EditorView.lineWrapping];

const Code = ({
  value,
  language,
  onChange,
  collapsible = true,
}: Props): React.JSX.Element => {
  const readOnly = !onChange;
  const extensions = React.useMemo(
    () => [...baseExtensions, ...languageExtensions(language)],
    [language]
  );

  // Keep parity with the legacy editor: readonly previews (no onChange) had no
  // line numbers, editable instances did.
  const body = (
    <CodeMirror
      className="code-editor"
      value={value || ""}
      theme="dark"
      editable={!readOnly}
      readOnly={readOnly}
      extensions={extensions}
      basicSetup={{
        lineNumbers: !readOnly,
        foldGutter: true,
        highlightActiveLine: !readOnly,
        highlightActiveLineGutter: !readOnly,
        indentOnInput: true,
      }}
      indentWithTab={false}
      onChange={(newValue) => {
        if (onChange) {
          onChange(newValue);
        }
      }}
    />
  );

  if (collapsible && value && value.length > largeBodyLength) {
    return (
      <Collapse
        items={[
          {
            key: "1",
            label: "This payload is huge. Click to display it",
            children: body,
          },
        ]}
      />
    );
  }
  return body;
};

export default Code;
