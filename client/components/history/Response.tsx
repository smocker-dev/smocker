import { Box, HStack, Link, Spacer, Tag, Text, VStack } from "@chakra-ui/react";
import dayjs from "dayjs";
import { getReasonPhrase } from "http-status-codes";
import { Link as RouterLink } from "react-router-dom";
import {
  dateFormat,
  EntryContextType,
  EntryResponseType,
  ErrorType
} from "../../modules/types";
import { Code } from "../Code";
import { Headers } from "./Headers";

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
    <HStack>
      <HStack>
        {isProxy && (
          <Tag variant="subtle" borderRadius="2px" border="1px solid">
            Proxified
          </Tag>
        )}
        <Tag
          variant="subtle"
          colorScheme={statusColor}
          borderRadius="2px"
          border="1px solid"
          title={title}
        >
          {response.status}
        </Tag>
        {response.status >= 600 && (
          <Text
            color="pink"
            title={(response.body as ErrorType).message}
            fontSize="0.85em"
          >
            {(response.body as ErrorType).message}
          </Text>
        )}
        {context.mock_id && (
          <Link
            as={RouterLink}
            to={`/pages/mocks/${context.mock_id}`}
            fontSize="0.85em"
            color="blue"
          >
            Matched Mock
          </Link>
        )}
      </HStack>
      <Spacer />
      <Text fontSize="0.85em" fontWeight="bold" title={response.date}>
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
      value={
        (language === "json" && JSON.stringify(body, null, 2)) || `${body}`
      }
      language={language}
    />
  );
};

export const Response = ({
  response,
  context
}: {
  response: EntryResponseType;
  context: EntryContextType;
}) => {
  const contentType = response.headers?.["Content-Type"]?.join(",");
  return (
    <Box width="50%">
      <VStack align="stretch" spacing={3}>
        <Status response={response} context={context} />
        <Headers headers={response.headers} />
        <Body body={response.body} contentType={contentType} />
      </VStack>
    </Box>
  );
};
