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
  asMatcher,
  BodyMatcherType,
  bodyToString,
  defaultMatcher,
  isStringMatcher,
  MatcherType,
  MockRequestType,
  StringMatcherMapType,
  StringMatcherType
} from "../../modules/types";
import { formatQueryParams } from "../../modules/utils";
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
          <Text>{`${(body as MatcherType)["matcher"]}`}</Text>
        </HStack>
        {bodyString && <Code defaultValue={bodyString} language="yaml" />}
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
          ([key, value]) => {
            const matcher = asMatcher(value);
            return (
              <ListItem key={key}>
                <Text fontWeight="bold">{`${key}`}</Text>
                <Text>{`: ${matcher.matcher} "${matcher.value}"`}</Text>
              </ListItem>
            );
          }
        )}
      </UnorderedList>
    </VStack>
  );
};

export const Request = ({ request }: { request: MockRequestType }) => {
  const methodMatcher = asMatcher(request.method);
  const pathMatcher = asMatcher(request.path);
  const showMethodMatcher = methodMatcher.matcher !== defaultMatcher;
  const showPathMatcher = pathMatcher.matcher !== defaultMatcher;
  const path =
    (showPathMatcher
      ? `Path ${pathMatcher.matcher}: "${pathMatcher.value}"`
      : pathMatcher.value) + formatQueryParams(request.query_params);
  return (
    <Box width="calc(50% - 1em)" pt={1}>
      <VStack align="stretch" spacing={3}>
        <HStack fontSize="sm">
          <Tag variant="outline" colorScheme="blue">
            {showMethodMatcher
              ? `Method: ${methodMatcher.matcher} "${methodMatcher.value}"`
              : methodMatcher.value}
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
