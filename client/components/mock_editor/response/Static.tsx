import {
  Button,
  ButtonGroup,
  FormControl,
  FormLabel,
  HStack,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Text,
  VStack
} from "@chakra-ui/react";
import { getReasonPhrase } from "http-status-codes";
import React from "react";
import { MockResponseType } from "../../../modules/types";
import { Code, Language } from "../../Code";
import { Headers } from "./Headers";

const languages: { label: string; value: Language }[] = [
  { label: "JSON", value: "json" },
  { label: "YAML", value: "yaml" },
  { label: "XML", value: "xml" },
  { label: "Plain Text", value: "txt" }
];

const responseStatusText = (responseStatus: number) => {
  try {
    return getReasonPhrase(responseStatus);
  } catch {
    return "Unknown";
  }
};

const responseStatusColor = (responseStatus: number) => {
  const text = responseStatusText(responseStatus);
  if (text === "Unknown") {
    return "";
  }
  if (responseStatus < 300) {
    return "green";
  }
  if (responseStatus >= 300 && responseStatus < 400) {
    return "blue";
  }
  if (responseStatus >= 400 && responseStatus < 500) {
    return "orange";
  }
  return "red";
};

export const StaticEditor = ({
  response,
  onChange
}: {
  response: MockResponseType;
  onChange: (response: MockResponseType) => void;
}) => {
  const [status, setStatus] = React.useState(response.status);
  const [headers, setHeaders] = React.useState(response.headers || {});
  const [language, setLanguage] = React.useState<Language>("json");
  const [body, setBody] = React.useState((response.body as string) || "");

  React.useEffect(() => {
    onChange({ status, headers, body });
  }, [status, headers, body]);

  return (
    <HStack width="100%" alignItems="start" spacing={10}>
      <VStack flex="2" alignItems="start">
        <FormControl>
          <FormLabel htmlFor="status">HTTP Status:</FormLabel>
          <NumberInput
            id="status"
            value={status}
            onChange={e => setStatus(+e)}
            min={0}
            defaultValue={200}
          >
            <NumberInputField borderRadius="2px" />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
          <Text
            align="right"
            color={responseStatusColor(status)}
            whiteSpace="nowrap"
            fontWeight={500}
          >
            {responseStatusText(status)}
          </Text>
        </FormControl>
        <Headers
          name="Headers"
          headers={headers}
          onChange={h => setHeaders(h)}
        />
      </VStack>
      <VStack flex="3" alignItems="stretch" pt="2">
        <HStack alignItems="start">
          <Text fontWeight={500}>Body:</Text>
          <VStack alignItems="stretch" flex="1">
            <ButtonGroup isAttached variant="tabs" colorScheme="blue" size="sm">
              {languages.map(l => (
                <Button
                  key={l.value}
                  isActive={language === l.value}
                  onClick={() => setLanguage(l.value)}
                >
                  {l.label}
                </Button>
              ))}
            </ButtonGroup>
            <Code
              language={language}
              defaultValue={body}
              collapsible={false}
              onChange={v => setBody(v)}
            />
          </VStack>
        </HStack>
      </VStack>
    </HStack>
  );
};
