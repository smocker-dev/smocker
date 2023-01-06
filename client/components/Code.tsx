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

const CodeBox = React.forwardRef(
  (
    {
      value,
      language,
      editable
    }: {
      value?: string;
      language?: Language;
      editable?: boolean;
    },
    ref: any
  ) => {
    const [height, setHeight] = React.useState(20);

    const updateHeight = (editor: editor.IStandaloneCodeEditor) => {
      const contentHeight = Math.max(20, editor.getContentHeight());
      setHeight(contentHeight);
    };
    const onMount: OnMount = React.useCallback(editor => {
      if (ref) {
        ref.current = editor;
      }
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
          value={value}
          language={language}
          theme="vs-dark"
          options={editable ? editableOptions : readOnlyOptions}
        />
      </Box>
    );
  }
);

export const Code = React.forwardRef(
  (
    {
      value,
      language,
      collapsible = true,
      editable
    }: {
      value?: string;
      language?: Language;
      collapsible?: boolean;
      editable?: boolean;
    },
    ref: any
  ): JSX.Element => {
    if (collapsible && value && value.length > largeBodyLength) {
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
                ref={ref}
                value={value}
                language={language}
                editable={editable}
              />
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      );
    }
    return (
      <CodeBox
        ref={ref}
        value={value}
        language={language}
        editable={editable}
      />
    );
  }
);
