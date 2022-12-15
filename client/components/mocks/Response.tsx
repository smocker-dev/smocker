import { HStack, Spacer, Tag, Text, VStack } from "@chakra-ui/react";
import {
  MockDynamicResponseType,
  MockResponseType,
  MockType
} from "../../modules/types";
import { Code, Language } from "../Code";
import { Headers } from "../Headers";

const Times = ({ count, expected }: { count: number; expected?: number }) => {
  if (!expected) {
    return <Text fontWeight="bold">{"Times: " + count}</Text>;
  }
  if (count > expected) {
    return (
      <HStack fontWeight="bold">
        <Text>Times:</Text>
        <HStack spacing={0}>
          <Text color="red.400">{count}</Text>
          <Text>/{expected}</Text>
        </HStack>
      </HStack>
    );
  }
  return <Text fontWeight="bold">{`Times: ${count}/${expected}`}</Text>;
};

const emptyResponse: unknown = {};

export const Response = ({ mock }: { mock: MockType }) => {
  const { response: resp, context, state } = mock;
  const response = resp ? resp : (emptyResponse as MockResponseType);

  const contentType = response.headers?.["Content-Type"]?.join(",");
  const language = contentType
    ? contentType.includes("yaml")
      ? "yaml"
      : contentType?.includes("xml")
      ? "xml"
      : "json"
    : "json";

  return (
    <VStack align="stretch" spacing={3}>
      <>
        <HStack fontSize="sm">
          <Tag variant="outline" colorScheme="blue">
            {response.status || 200}
          </Tag>
          <Spacer />
          <Times count={state.times_count} expected={context.times} />
        </HStack>
        <Headers headers={response.headers} />
        {response.body && (
          <Code value={(response.body as string).trim()} language={language} />
        )}
      </>
    </VStack>
  );
};

export const DynamicResponse = ({ mock }: { mock: MockType }) => {
  const { dynamic_response, context, state } = mock;
  const response = dynamic_response
    ? dynamic_response
    : (emptyResponse as MockDynamicResponseType);

  let language: Language = "txt";
  switch (dynamic_response?.engine) {
    case "lua":
      language = "lua"; // because lua mode doesn't handle fold
      break;

    case "go_template_json":
      language = "json";
      break;

    case "go_template":
    case "go_template_yaml":
      language = "yaml";
      break;
  }

  return (
    <VStack align="stretch" spacing={3}>
      <HStack fontSize="sm">
        <HStack spacing={2}>
          <Tag variant="outline" colorScheme="blue">
            Engine
          </Tag>
          <Text fontWeight="bold">{response.engine}</Text>
        </HStack>
        <Spacer />
        <Times count={state.times_count} expected={context.times} />
      </HStack>
      <Code value={response.script} language={language} />
    </VStack>
  );
};

export const ProxyResponse = ({ mock }: { mock: MockType }) => {
  const { proxy, context, state } = mock;
  const host = proxy ? proxy.host : "";
  return (
    <HStack fontSize="sm">
      <HStack spacing={2}>
        <Tag variant="outline" colorScheme="blue">
          Redirect To
        </Tag>
        <Text fontWeight="bold">{host}</Text>
      </HStack>
      <Spacer />
      <Times count={state.times_count} expected={context.times} />
    </HStack>
  );
};
