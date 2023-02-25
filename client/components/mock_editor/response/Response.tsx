import { Button, ButtonGroup, VStack } from "@chakra-ui/react";
import React from "react";
import {
  MockDynamicResponseType,
  MockProxyType,
  MockResponseType
} from "../../../modules/types";
import { DynamicEditor } from "./Dynamic";
import { ProxyEditor } from "./Proxy";
import { StaticEditor } from "./Static";

const responseTypes = [
  { label: "Static", value: "static" },
  { label: "Dynamic", value: "dynamic" },
  { label: "Proxy", value: "proxy" }
] as const;

type ReponseType = typeof responseTypes[number]["value"];

interface ReponseBodyType {
  staticResponse?: MockResponseType;
  dynamicResponse?: MockDynamicResponseType;
  proxyResponse?: MockProxyType;
}

export const ResponseEditor = ({
  response,
  onChange
}: {
  response: ReponseBodyType;
  onChange: (response: ReponseBodyType) => void;
}) => {
  const [responseType, setResponseType] = React.useState<ReponseType>("static");
  const [staticResponse, setStaticResponse] = React.useState(
    response.staticResponse
  );
  const [dynamicResponse, setDynamicResponse] = React.useState(
    response.dynamicResponse
  );
  const [proxyResponse, setProxyResponse] = React.useState(
    response.proxyResponse
  );

  React.useEffect(() => {
    setStaticResponse(undefined);
    setDynamicResponse(undefined);
    setProxyResponse(undefined);
  }, [responseType]);

  React.useEffect(() => {
    onChange({ staticResponse, dynamicResponse, proxyResponse });
  }, [staticResponse, dynamicResponse, proxyResponse]);

  return (
    <VStack alignItems="stretch" spacing={5}>
      <VStack alignItems="center" spacing={5}>
        <ButtonGroup isAttached variant="tabs" colorScheme="blue">
          {responseTypes.map(rt => (
            <Button
              key={rt.value}
              isActive={responseType === rt.value}
              onClick={() => setResponseType(rt.value)}
            >
              {rt.label}
            </Button>
          ))}
        </ButtonGroup>
        {responseType === "static" && (
          <StaticEditor
            response={staticResponse || { status: 200 }}
            onChange={r => setStaticResponse(r)}
          />
        )}
        {responseType === "dynamic" && (
          <DynamicEditor
            response={
              dynamicResponse || { engine: "go_template_yaml", script: "" }
            }
            onChange={r => setDynamicResponse(r)}
          />
        )}
        {responseType === "proxy" && (
          <ProxyEditor
            response={proxyResponse || { host: "" }}
            onChange={r => setProxyResponse(r)}
          />
        )}
      </VStack>
    </VStack>
  );
};
