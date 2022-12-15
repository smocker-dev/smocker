import {
  Box,
  HStack,
  Icon,
  Link,
  Spacer,
  Tag,
  Text,
  useClipboard,
  VStack
} from "@chakra-ui/react";
import dayjs from "dayjs";
import React from "react";
import { RiCheckFill, RiClipboardLine } from "react-icons/ri";
import { dateFormat, EntryRequestType } from "../../modules/types";
import { formatQueryParams, requestToCurl } from "../../modules/utils";
import { Code } from "../Code";
import { Headers } from "../Headers";

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

export const Request = ({ request }: { request: EntryRequestType }) => {
  const { onCopy, setValue, hasCopied } = useClipboard("");
  React.useEffect(() => {
    setValue(requestToCurl(request));
  }, [request]);
  const path = request.path + formatQueryParams(request.query_params);
  const contentType = request.headers?.["Content-Type"]?.join(",");
  return (
    <Box width="calc(50% - 1em)">
      <VStack align="stretch" spacing={3}>
        <HStack fontSize="sm">
          <HStack>
            <Tag variant="outline" colorScheme="blue">
              {request.method}
            </Tag>
            <Text noOfLines={1} title={path}>
              {path}
            </Text>
          </HStack>
          <Spacer />
          <Text fontWeight="bold" title={request.date} whiteSpace="nowrap">
            {dayjs(request.date).format(dateFormat)}
          </Text>
        </HStack>
        <Headers headers={request.headers} />
        <Body body={request.body} contentType={contentType} />
        <HStack>
          <Spacer />
          <Text fontSize="sm">
            Copy as curl &nbsp;
            <Link onClick={onCopy} colorScheme="blue">
              <Icon
                as={hasCopied ? RiCheckFill : RiClipboardLine}
                color={hasCopied ? "green" : undefined}
              />
            </Link>
          </Text>
        </HStack>
      </VStack>
    </Box>
  );
};
