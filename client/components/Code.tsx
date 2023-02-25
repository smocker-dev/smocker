import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Spinner
} from "@chakra-ui/react";
import Editor, { OnMount } from "@monaco-editor/react";
import { editor } from "monaco-editor";
import React from "react";

const largeBodyLength = 5000;

export type Language = "yaml" | "json" | "lua" | "xml" | "txt";

const readOnlyOptions: editor.IStandaloneEditorConstructionOptions = {
  minimap: {
    enabled: false // disable minimap
  },
  wordWrap: "on", // do not scroll on x
  scrollBeyondLastLine: false, // do not authorize to scroll over height
  scrollbar: {
    alwaysConsumeMouseWheel: false, // do not catch scroll event on page
    vertical: "hidden", // hidde vertical scrollbar
    horizontal: "hidden" // hidde horizontal scrollbar
  },
  renderLineHighlight: "none", // do not focus on selected line
  contextmenu: false, // do not display contextual menu on right click
  overviewRulerLanes: 0, // disable overview on the right
  readOnly: true,
  lineHeight: 12
};

const editableOptions: editor.IStandaloneEditorConstructionOptions = {
  wordWrap: "on", // do not scroll on x
  scrollBeyondLastLine: false, // do not authorize to scroll over height
  scrollbar: {
    alwaysConsumeMouseWheel: false, // do not catch scroll event on page
    vertical: "hidden", // hidde vertical scrollbar
    horizontal: "hidden" // hidde horizontal scrollbar
  },
  contextmenu: false // do not display contextual menu on right click
};

const CodeBox = ({
  defaultValue,
  language,
  onChange
}: {
  defaultValue?: string;
  language?: Language;
  onChange?: (value: string) => void;
}) => {
  const [content, setContent] = React.useState(defaultValue);
  const [height, setHeight] = React.useState(20);

  React.useEffect(() => {
    onChange?.(content || "");
  }, [content]);

  React.useEffect(() => {
    if (!onChange) {
      setContent(defaultValue);
    }
  }, [defaultValue, onChange]);

  const updateHeight = (editor: editor.IStandaloneCodeEditor) => {
    const contentHeight = Math.max(20, editor.getContentHeight());
    setHeight(contentHeight);
  };
  const onMount: OnMount = React.useCallback(editor => {
    editor.onDidContentSizeChange(() => {
      updateHeight(editor);
    });
  }, []);
  return (
    <Box p=".5em 0" bgColor="rgb(30, 30, 30)" borderRadius="2px">
      <Editor
        loading={<Spinner color="white" />}
        height={height}
        onMount={onMount}
        value={content}
        language={language}
        theme="vs-dark"
        options={onChange ? editableOptions : readOnlyOptions}
        onChange={v => setContent(v || "")}
      />
    </Box>
  );
};

export const Code = ({
  defaultValue,
  language,
  collapsible = true,
  onChange
}: {
  defaultValue?: string;
  language?: Language;
  collapsible?: boolean;
  onChange?: (value: string) => void;
}): JSX.Element => {
  if (collapsible && defaultValue && defaultValue.length > largeBodyLength) {
    return (
      <Accordion allowToggle reduceMotion>
        <AccordionItem borderWidth="1px" borderColor="sidebar.border">
          <AccordionButton bgColor="gray.50">
            <Box flex="1" textAlign="left">
              This payload is huge. Click to display it
            </Box>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel>
            <CodeBox
              defaultValue={defaultValue}
              language={language}
              onChange={onChange}
            />
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    );
  }
  return (
    <CodeBox
      defaultValue={defaultValue}
      language={language}
      onChange={onChange}
    />
  );
};
