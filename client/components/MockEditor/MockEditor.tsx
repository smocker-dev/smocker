import * as React from "react";
import { Divider, Form, Radio } from "antd";
import Code from "../Code";
import yaml from "js-yaml";
import { defaultMatcher } from "../../modules/types";
import "./MockEditor.scss";
import classNames from "classnames";
import { MockRequestEditor } from "./MockRequestEditor";
import { MockStaticResponseEditor } from "./MockStaticResponseEditor";
import { MockDynamicResponseEditor } from "./MockDynamicResponseEditor";
import { MockProxyResponseEditor } from "./MockProxyResponseEditor";
import { MockContextEditor } from "./MockContextEditor";
import { defaultResponseStatus, unaryMatchers } from "./utils";

interface MockEditorProps {
  onChange?: (value: string) => unknown;
}

const MockEditor = ({ onChange }: MockEditorProps): JSX.Element => {
  const initialValues: MockEditorForm = {
    request: {
      method: "GET",
      path_regex: false,
      path: "",
      body_type: "json",
      body_txt_matcher: "ShouldEqual",
    },
    response_type: "static",
    response: {
      status: defaultResponseStatus,
    },
    dynamic_response: {
      engine: "go_template_yaml",
    },
    context: {
      times_enabled: false,
      times: 1,
    },
  };

  const [form] = Form.useForm<MockEditorForm>();
  const [mockString, setMockString] = React.useState(
    yaml.safeDump(MockEditorFormToMock(initialValues), { skipInvalid: true })
  );

  const responseTypes = [
    { label: "Static", value: "static" },
    { label: "Dynamic", value: "dynamic" },
    { label: "Proxy", value: "proxy" },
  ];

  return (
    <Form
      form={form}
      initialValues={initialValues}
      onValuesChange={(_, values) => {
        setMockString(
          yaml.safeDump(MockEditorFormToMock(values), { skipInvalid: true })
        );
        if (onChange) {
          onChange(
            yaml.safeDump([MockEditorFormToMock(values)], { skipInvalid: true })
          );
        }
      }}
    >
      <Divider>Request</Divider>
      <MockRequestEditor />

      <Divider>Response</Divider>
      <Form.Item name="response_type" style={{ textAlign: "center" }}>
        <Radio.Group
          options={responseTypes}
          optionType="button"
          buttonStyle="solid"
        />
      </Form.Item>

      <Form.Item
        noStyle
        shouldUpdate={(prevValues, currentValues) =>
          prevValues?.response_type !== currentValues?.response_type
        }
      >
        {({ getFieldValue }) => (
          <>
            {/* Use divs with display to make sure the form components render */}
            <div
              className={classNames({
                "display-none": getFieldValue("response_type") !== "static",
              })}
            >
              <MockStaticResponseEditor />
            </div>
            <div
              className={classNames({
                "display-none": getFieldValue("response_type") !== "dynamic",
              })}
            >
              <MockDynamicResponseEditor />
            </div>
            <div
              className={classNames({
                "display-none": getFieldValue("response_type") !== "proxy",
              })}
            >
              <MockProxyResponseEditor />
            </div>
          </>
        )}
      </Form.Item>

      <Divider>Context</Divider>
      <MockContextEditor />

      <Divider>Preview</Divider>
      <p>
        This preview is <u>readonly</u>. To modify it manually, you can
        copy-paste it to the Raw YAML Editor.
      </p>
      <Code language="yaml" value={mockString} />
    </Form>
  );
};

interface KeyValueMatcher {
  key?: string;
  matcher: string;
  value?: string;
}

interface KeyValue {
  key?: string;
  value?: string;
}

// This type is just used in Antd's onFinish/onValuesChange callbacks, it's not very useful but nice to have
interface MockEditorForm {
  request: {
    method: string;
    path_regex: boolean;
    path: string;
    query_parameters?: KeyValueMatcher[];
    headers?: KeyValueMatcher[];
    body_type: "json" | "txt";
    body_json?: KeyValueMatcher[];
    body_txt_matcher: string;
    body_txt_value?: string;
  };
  response_type: "static" | "dynamic" | "proxy";
  response?: {
    status: number;
    headers?: KeyValue[];
    body?: string;
  };
  dynamic_response?: {
    engine: "go_template_yaml" | "go_template_json" | "lua";
    script?: string;
  };
  proxy?: {
    host?: string;
    headers?: KeyValue[];
    follow_redirect?: boolean;
    skip_verify_tls?: boolean;
    keep_host?: boolean;
  };
  context?: {
    times_enabled: boolean;
    times?: number;
  };
}

const matcherReducer = (acc = {}, item: KeyValueMatcher) => ({
  ...acc,
  [item?.key ?? ""]:
    item.matcher === defaultMatcher
      ? item.value
      : { matcher: item.matcher, value: item.value },
});

const keyValueReducer = (acc = {}, item: KeyValue) => ({
  ...acc,
  [item?.key ?? ""]: item.value,
});

const MockEditorFormToMock = (mockEditorForm: MockEditorForm): unknown => {
  const requestQueryParams =
    mockEditorForm.request?.query_parameters
      ?.filter((item) =>
        unaryMatchers.includes(item.matcher) ? item.key : item.key && item.value
      )
      .map((item) =>
        unaryMatchers.includes(item.matcher)
          ? { ...item, value: undefined }
          : item
      ) || [];

  const requestHeaders =
    mockEditorForm.request?.headers
      ?.filter((item) =>
        unaryMatchers.includes(item.matcher) ? item.key : item.key && item.value
      )
      .map((item) =>
        unaryMatchers.includes(item.matcher)
          ? { ...item, value: undefined }
          : item
      ) || [];

  let requestBody;
  if (mockEditorForm.request?.body_type) {
    switch (mockEditorForm.request.body_type) {
      case "json":
        requestBody =
          mockEditorForm.request?.body_json
            ?.filter((item) =>
              unaryMatchers.includes(item.matcher)
                ? item.key
                : item.key && item.value
            )
            .map((item) =>
              unaryMatchers.includes(item.matcher)
                ? { ...item, value: undefined }
                : item
            ) || [];

        requestBody =
          requestBody.length > 0
            ? requestBody.reduce(matcherReducer, {})
            : undefined;
        break;
      case "txt":
        requestBody =
          mockEditorForm.request.body_txt_matcher === "ShouldEqual"
            ? mockEditorForm.request.body_txt_value
            : {
                matcher: mockEditorForm.request.body_txt_matcher,
                value: mockEditorForm.request.body_txt_value,
              };
        break;
    }
  }

  return {
    request: {
      method: mockEditorForm.request.method,
      path: mockEditorForm.request.path_regex
        ? {
            matcher: "ShouldMatch",
            value: mockEditorForm.request.path,
          }
        : mockEditorForm.request.path,
      query_params:
        requestQueryParams.length > 0
          ? requestQueryParams.reduce(matcherReducer, {})
          : undefined,
      headers:
        requestHeaders.length > 0
          ? requestHeaders.reduce(matcherReducer, {})
          : undefined,
      body: requestBody,
    },

    context: mockEditorForm.context?.times_enabled
      ? {
          times: mockEditorForm.context?.times,
        }
      : undefined,

    response:
      mockEditorForm.response_type === "static"
        ? {
            status: mockEditorForm?.response?.status,
            body: mockEditorForm?.response?.body,
            headers: mockEditorForm.response?.headers
              ?.filter((item) => item.key && item.value)
              .reduce(keyValueReducer, {}),
          }
        : undefined,

    dynamic_response:
      mockEditorForm.response_type === "dynamic"
        ? {
            engine: mockEditorForm?.dynamic_response?.engine,
            script: mockEditorForm?.dynamic_response?.script,
          }
        : undefined,

    proxy:
      mockEditorForm.response_type === "proxy"
        ? {
            host: mockEditorForm?.proxy?.host,
            headers: mockEditorForm.proxy?.headers
              ?.filter((item) => item.key && item.value)
              .reduce(
                (acc, item) => ({
                  ...acc,
                  [item?.key ?? ""]: item.value,
                }),
                {}
              ),
            follow_redirect:
              Boolean(mockEditorForm.proxy?.follow_redirect) || undefined,
            skip_verify_tls:
              Boolean(mockEditorForm.proxy?.skip_verify_tls) || undefined,
            keep_host: Boolean(mockEditorForm.proxy?.keep_host) || undefined,
          }
        : undefined,
  };
};

export default MockEditor;
