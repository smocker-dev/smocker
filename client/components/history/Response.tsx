import {
  Box,
  Button,
  HStack,
  Link,
  Spacer,
  Tag,
  Text,
  VStack
} from "@chakra-ui/react";
import dayjs from "dayjs";
import { getReasonPhrase } from "http-status-codes";
import { RiAddCircleLine } from "react-icons/ri";
import { Link as RouterLink } from "react-router-dom";
import {
  asStringArray,
  dateFormat,
  EntryContextType,
  EntryResponseType,
  ErrorType
} from "../../modules/types";
import { Code } from "../Code";
import { Headers } from "../Headers";

const Status = ({
  response,
  context
}: {
  response: EntryResponseType;
  context: EntryContextType;
}) => {
  const isProxy = context.mock_type === "proxy";
  let statusColor = "blue";
  if (response.status >= 600) {
    statusColor = "pink";
  } else if (isProxy) {
    if (response.status >= 500) {
      statusColor = "red";
    } else if (response.status >= 400) {
      statusColor = "orange";
    }
  }

  let title = "Unknown HTTP status code";
  try {
    title = getReasonPhrase(response.status);
  } catch {
    if (response.status >= 600) {
      title = "Smocker error";
    }
  }

  return (
    <HStack fontSize="sm">
      <HStack>
        {isProxy && <Tag variant="outline">Proxified</Tag>}
        <Tag variant="outline" colorScheme={statusColor} title={title}>
          {response.status}
        </Tag>
        {response.status >= 600 && (
          <Text color="pink.500" title={(response.body as ErrorType).message}>
            {(response.body as ErrorType).message}
          </Text>
        )}
        {context.mock_id && (
          <Link
            as={RouterLink}
            to={`/pages/mocks/${context.mock_id}`}
            colorScheme="blue"
          >
            Matched Mock
          </Link>
        )}
      </HStack>
      <Spacer />
      <Text fontWeight="bold" title={response.date} whiteSpace="nowrap">
        {dayjs(response.date).format(dateFormat)}
      </Text>
    </HStack>
  );
};

const Body = ({
  body,
  contentType
}: {
  body?: unknown;
  contentType?: string;
}) => {
  if (!body) {
    return <></>;
  }
  const language = contentType
    ? contentType.includes("yaml")
      ? "yaml"
      : contentType?.includes("xml")
      ? "xml"
      : "json"
    : "json";

  return (
    <Code
      defaultValue={
        (language === "json" && JSON.stringify(body, null, 2)) || `${body}`
      }
      language={language}
    />
  );
};

export const Response = ({
  response,
  context,
  onCreateMock
}: {
  response: EntryResponseType;
  context: EntryContextType;
  onCreateMock: () => void;
}) => {
  let contentType = response.headers?.["Content-Type"];
  if (contentType) {
    contentType = asStringArray(contentType).join(",");
  }
  return (
    <Box width="calc(50% - 1em)">
      <VStack align="stretch" spacing={3}>
        <Status response={response} context={context} />
        <Button
          leftIcon={<RiAddCircleLine />}
          colorScheme="blue"
          variant="outline"
          borderStyle="dashed"
          onClick={onCreateMock}
        >
          {response.status < 600
            ? "Create a new mock from entry"
            : "Create a new mock from request"}
        </Button>
        <Headers headers={response.headers} />
        <Body body={response.body} contentType={contentType} />
      </VStack>
    </Box>
  );
};
