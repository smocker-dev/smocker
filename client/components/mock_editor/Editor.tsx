import { VStack } from "@chakra-ui/react";
import yaml from "js-yaml";
import * as React from "react";
import {
  MockContextType,
  MockDynamicResponseType,
  MockProxyType,
  MockRequestType,
  MockResponseType,
  MockType
} from "../../modules/types";
import { trimMock } from "../../modules/utils";
import { Code } from "../Code";
import { ContextEditor } from "./Context";
import { FormDivider } from "./FormDivider";
import { RequestEditor } from "./request/Request";
import { ResponseEditor } from "./response/Response";

interface MockEditorProps {
  initMock: MockType;
  onChange?: (value: MockType) => unknown;
}

const MockEditor = ({ initMock, onChange }: MockEditorProps): JSX.Element => {
  const [mock, setMock] = React.useState(trimMock(initMock));
  const [mockString, setMockString] = React.useState<string>("");
  const [request, setRequest] = React.useState<MockRequestType>(
    initMock.request
  );
  const [staticResponse, setStaticResponse] = React.useState<
    MockResponseType | undefined
  >(initMock.response);
  const [dynamicResponse, setDynamicResponse] = React.useState<
    MockDynamicResponseType | undefined
  >(initMock.dynamic_response);
  const [proxyResponse, setProxyResponse] = React.useState<
    MockProxyType | undefined
  >(initMock.proxy);
  const [context, setContext] = React.useState<MockContextType | undefined>();
  const responseBody = React.useMemo(
    () => ({ staticResponse, dynamicResponse, proxyResponse }),
    [staticResponse, dynamicResponse, proxyResponse]
  );
  React.useEffect(() => {
    setMock(
      trimMock({
        request,
        context,
        response: staticResponse,
        dynamic_response: dynamicResponse,
        proxy: proxyResponse
      } as MockType)
    );
  }, [request, context, responseBody]);

  React.useEffect(() => {
    setMockString(yaml.dump([mock], { skipInvalid: true }));
    onChange?.(mock);
  }, [mock]);

  return (
    <form>
      <VStack alignItems="stretch" spacing={5}>
        <FormDivider text="Request" />
        <RequestEditor request={request} onChange={r => setRequest(r)} />
        <FormDivider text="Response" />
        <ResponseEditor
          response={responseBody}
          onChange={r => {
            setStaticResponse(r.staticResponse);
            setDynamicResponse(r.dynamicResponse);
            setProxyResponse(r.proxyResponse);
          }}
        />
        <FormDivider text="Context" />
        <ContextEditor context={context} onChange={c => setContext(c)} />
        <FormDivider text="Preview" />
        <p>
          This preview is <u>readonly</u>. To modify it manually, you can
          copy-paste it to the Raw YAML Editor.
        </p>
        <Code language="yaml" defaultValue={mockString} collapsible={false} />
      </VStack>
    </form>
  );
};

export default MockEditor;
