import {
  Box,
  HStack,
  ListItem,
  Tag,
  Text,
  UnorderedList,
  VStack
} from "@chakra-ui/react";
import {
  BodyMatcherType,
  defaultMatcher,
  MockRequestType,
  StringMatcherMapType,
  StringMatcherType
} from "../../modules/types";
import {
  bodyToString,
  formatQueryParams,
  isStringMatcher
} from "../../modules/utils";
import { Code } from "../Code";
import { Headers } from "../Headers";

const Body = ({ body }: { body?: BodyMatcherType }) => {
  if (!body) {
    return <></>;
  }

  const isBodyStringMatcher = isStringMatcher(body);
  if (isBodyStringMatcher) {
    const bodyString = bodyToString(body);
    return (
      <VStack alignItems="stretch">
        <HStack fontSize="sm" fontWeight="bold">
          <Text>Body</Text>
          <Text>{`${body["matcher"]}`}</Text>
        </HStack>
        {bodyString && <Code value={bodyString} language="yaml" />}
      </VStack>
    );
  }

  return (
    <VStack alignItems="stretch">
      <Text fontSize="sm" fontWeight="bold">
        {"In Body"}
      </Text>
      <UnorderedList>
        {Object.entries<StringMatcherType>(body as StringMatcherMapType).map(
          ([key, value]) => (
            <ListItem key={key}>
              <Text fontWeight="bold">{`${key}`}</Text>
              <Text>{`: ${value.matcher} "${value.value}"`}</Text>
            </ListItem>
          )
        )}
      </UnorderedList>
    </VStack>
  );
};

export const Request = ({ request }: { request: MockRequestType }) => {
  const showMethodMatcher = request.method.matcher !== defaultMatcher;
  const showPathMatcher = request.path.matcher !== defaultMatcher;
  const path =
    (showPathMatcher
      ? `Path ${request.path.matcher}: "${request.path.value}"`
      : request.path.value) + formatQueryParams(request.query_params);
  return (
    <Box width="calc(50% - 1em)" pt={1}>
      <VStack align="stretch" spacing={3}>
        <HStack fontSize="sm">
          <Tag variant="outline" colorScheme="blue">
            {showMethodMatcher
              ? `Method: ${request.method.matcher} "${request.method.value}"`
              : request.method.value}
          </Tag>
          <Text noOfLines={1} title={path} fontWeight="bold">
            {path}
          </Text>
        </HStack>
        <Headers headers={request.headers} />
        <Body body={request.body} />
      </VStack>
    </Box>
  );
};
