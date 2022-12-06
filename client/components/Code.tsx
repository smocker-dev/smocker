import { Box, Spinner } from "@chakra-ui/react";
import Editor, { OnMount } from "@monaco-editor/react";
import { editor } from "monaco-editor";
import React from "react";

const largeBodyLength = 5000;

export type Language = "yaml" | "json" | "lua" | "xml" | "txt";

export const Code = ({
  value,
  language,
  onChange,
  collapsible = true
}: {
  value?: string;
  language: Language;
  collapsible?: boolean;
  onChange?: (value: string) => unknown;
}): JSX.Element => {
  const [height, setHeight] = React.useState(20);

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
    <Box p="1em 0" bgColor="rgb(30, 30, 30)" borderRadius="2px">
      <Editor
        loading={<Spinner color="white" />}
        height={height}
        onMount={onMount}
        value={value}
        language={language}
        theme="vs-dark"
        options={{
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
        }}
      />
    </Box>
  );
};
