import { HStack, VStack } from "@chakra-ui/react";
import React from "react";
import {
  MockRequestType,
  MultimapMatcherType,
  StringMatcherType
} from "../../../modules/types";
import { Endpoint } from "./Endpoint";
import { Matchers } from "./Matchers";

const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export const RequestEditor = ({
  request,
  onChange
}: {
  request: MockRequestType;
  onChange: (request: MockRequestType) => void;
}) => {
  const [method, setMethod] = React.useState<StringMatcherType>(request.method);
  const [path, setPath] = React.useState<StringMatcherType>(request.path);
  const [queryParams, setQueryParams] = React.useState<MultimapMatcherType>(
    request.query_params || {}
  );
  const [headers, setHeaders] = React.useState<MultimapMatcherType>(
    request.headers || {}
  );

  React.useEffect(() => {
    onChange({ method, path, query_params: queryParams, headers });
  }, [method, path, queryParams, headers]);
  return (
    <VStack alignItems="stretch" spacing={5}>
      <Endpoint
        method={method}
        path={path}
        onChange={e => {
          setMethod(e.method);
          setPath(e.path);
        }}
      />
      <HStack alignItems="stretch" spacing={5}>
        <Matchers
          multimap={queryParams}
          name="Query Parameters"
          onChange={m => setQueryParams(m)}
        />
        <Matchers
          multimap={headers}
          name="Headers"
          onChange={m => setHeaders(m)}
        />
      </HStack>
    </VStack>
  );
};
