import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Spinner,
  VStack
} from "@chakra-ui/react";
import mermaidAPI from "mermaid";
import * as React from "react";
import { useDebounce } from "../modules/hooks";
import { ImageViewer } from "./ImageViewer";

export const Mermaid = ({
  name,
  chart,
  loading,
  onChange
}: {
  name: string;
  chart: string;
  loading?: boolean;
  onChange?: (svg: string) => unknown;
}): JSX.Element => {
  const [diagram, setDiagram] = React.useState("");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    setTimeout(() => {
      try {
        mermaidAPI.parse(chart);
        mermaidAPI.initialize({ startOnLoad: false });
        mermaidAPI.render(name, chart).then(({ svg }) => {
          setDiagram(svg);
          setError("");
          onChange && onChange(svg);
        });
      } catch (e) {
        setDiagram("");
        console.error(e);
        setError((e as any).str || `${e}`);
      }
    }, 1);
  }, [name, chart]);

  const base64data = btoa(diagram);
  const showLoader = useDebounce(loading || !diagram.length, 1000);
  return (
    <VStack alignItems="stretch" justifyContent="start" width="100%">
      <Box bgColor={"white"} p="4" position="relative" overflow="hidden">
        {showLoader && (
          <VStack flex="1" alignItems="center">
            <Spinner
              thickness="4px"
              emptyColor="gray.200"
              color="blue.500"
              size="xl"
            />
          </VStack>
        )}
        {!showLoader && (
          <ImageViewer
            image={`data:image/svg+xml;base64,${base64data}`}
            alt="Sequence graph"
          />
        )}
      </Box>
      {error && (
        <Alert status="error">
          <AlertIcon />
          <Box>
            <AlertTitle>Unable to render</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Box>
        </Alert>
      )}
    </VStack>
  );
};
