import * as React from "react";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import {
  Button,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Radio,
  RadioChangeEvent,
  Row,
  Select,
  Space,
  Switch,
  Tooltip,
} from "antd";
import { getReasonPhrase } from "http-status-codes";
import Code, { Language } from "./Code";
import yaml from "js-yaml";
import { defaultMatcher } from "~modules/types";
import "./MockEditor.scss";
import classNames from "classnames";

const defaultResponseStatus = 200;

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

const unaryMatchers = ["ShouldBeEmpty", "ShouldNotBeEmpty"];
const positiveMatchers = [
  "ShouldEqual",
  "ShouldMatch",
  "ShouldBeEmpty",
  "ShouldContainSubstring",
  "ShouldStartWith",
  "ShouldEndWith",
];
const negativeMatchers = [
  "ShouldNotEqual",
  "ShouldNotMatch",
  "ShouldNotBeEmpty",
  "ShouldNotContainSubstring",
  "ShouldNotStartWith",
  "ShouldNotEndWith",
];

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

const MockEditor = (): JSX.Element => {
  const initialValues: MockEditorForm = {
    request: {
      method: "GET",
      path_regex: false,
      path: "",
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
      <Code language="yaml" value={mockString} />
    </Form>
  );
};

const MockRequestEditor = (): JSX.Element => {
  const [bodyLanguage, setBodyLanguage] = React.useState<Language>("json");

  const methodSelector = (
    <Form.Item name={["request", "method"]} noStyle>
      <Select>
        <Select.Option value="GET">GET</Select.Option>
        <Select.Option value="POST">POST</Select.Option>
        <Select.Option value="PUT">PUT</Select.Option>
        <Select.Option value="PATCH">PATCH</Select.Option>
        <Select.Option value="DELETE">DELETE</Select.Option>
      </Select>
    </Form.Item>
  );

  const regexToggle = (
    <Tooltip title="Use Golang Regular Expression" placement="left">
      <Form.Item name={["request", "path_regex"]} noStyle>
        <Switch checkedChildren="Regex" unCheckedChildren="Raw" />
      </Form.Item>
    </Tooltip>
  );

  const languages = [
    { label: "JSON", value: "json" },
    { label: "XML", value: "xml" },
    { label: "YAML", value: "yaml" },
    { label: "Plain Text", value: "txt" },
  ];

  return (
    <>
      <Form.Item label="Endpoint" name={["request", "path"]}>
        <Input
          addonBefore={methodSelector}
          addonAfter={regexToggle}
          placeholder="/example"
        />
      </Form.Item>

      <Row gutter={24}>
        <Col span={12}>
          Query parameters:
          <KeyValueEditor name={["request", "query_parameters"]} withMatchers />
        </Col>

        <Col span={12}>
          Headers:
          <KeyValueEditor name={["request", "headers"]} withMatchers />
        </Col>
      </Row>

      <Form.Item
        noStyle
        shouldUpdate={(prevValues, currentValues) =>
          prevValues?.request?.method !== currentValues?.request?.method
        }
      >
        {({ getFieldValue }) =>
          getFieldValue(["request", "method"]) !== "GET" && (
            <Form.Item label="Body">
              <Radio.Group
                options={languages}
                value={bodyLanguage}
                onChange={(e: RadioChangeEvent) =>
                  setBodyLanguage(e.target.value)
                }
                optionType="button"
                buttonStyle="solid"
                size="small"
                style={{ marginBottom: 5 }}
              />
              <BodyMatcherEditor name={["request", "body"]} />
            </Form.Item>
          )
        }
      </Form.Item>
    </>
  );
};

const MockStaticResponseEditor = (): JSX.Element => {
  const [bodyLanguage, setBodyLanguage] = React.useState<Language>("json");
  const [responseStatus, setResponseStatus] = React.useState(
    defaultResponseStatus
  );

  const responseStatusText = () => {
    try {
      return getReasonPhrase(responseStatus);
    } catch {
      return "Unknown";
    }
  };

  const languages = [
    { label: "JSON", value: "json" },
    { label: "XML", value: "xml" },
    { label: "YAML", value: "yaml" },
    { label: "Plain Text", value: "txt" },
  ];

  return (
    <>
      <Form.Item label="HTTP status">
        <Form.Item name={["response", "status"]} noStyle>
          <InputNumber
            min={100}
            max={599}
            onChange={(value?: string | number) => {
              setResponseStatus(typeof value === "number" ? value : NaN);
            }}
          />
        </Form.Item>
        <span> {responseStatusText()}</span>
      </Form.Item>

      <Row gutter={24}>
        <Col span={10}>
          Headers:
          <KeyValueEditor name={["response", "headers"]} />
        </Col>

        <Col span={14}>
          <Form.Item label="Body">
            <Radio.Group
              options={languages}
              value={bodyLanguage}
              onChange={(e: RadioChangeEvent) =>
                setBodyLanguage(e.target.value)
              }
              optionType="button"
              buttonStyle="solid"
              size="small"
              style={{ marginBottom: 5 }}
            />
            <Form.Item name={["response", "body"]} noStyle>
              <Code language={bodyLanguage} />
            </Form.Item>
          </Form.Item>
        </Col>
      </Row>
    </>
  );
};

const MockDynamicResponseEditor = (): JSX.Element => (
  <>
    <Form.Item label="Engine" name={["dynamic_response", "engine"]}>
      <Select>
        <Select.Option value="go_template_yaml">
          Go Template (YAML)
        </Select.Option>
        <Select.Option value="go_template_json">
          Go Template (JSON)
        </Select.Option>
        <Select.Option value="lua">Lua</Select.Option>
      </Select>
    </Form.Item>

    <Form.Item
      noStyle
      shouldUpdate={(prevValues, currentValues) =>
        prevValues?.dynamic_response?.engine !==
        currentValues?.dynamic_response?.engine
      }
    >
      {({ getFieldValue }) => (
        <Form.Item label="Script" name={["dynamic_response", "script"]}>
          <Code language={getFieldValue(["dynamic_response", "engine"])} />
        </Form.Item>
      )}
    </Form.Item>
  </>
);

const MockProxyResponseEditor = (): JSX.Element => (
  <Row gutter={24}>
    <Col span={12}>
      <Form.Item label="Host" name={["proxy", "host"]}>
        <Input placeholder="http://example.com" />
      </Form.Item>
      Additional Headers:
      <KeyValueEditor name={["proxy", "headers"]} />
    </Col>

    <Col span={12}>
      <Form.Item
        label="Follow HTTP Redirections"
        name={["proxy", "follow_redirect"]}
        labelAlign="right"
      >
        <Switch />
      </Form.Item>

      <Form.Item
        label="Skip TLS Verification"
        name={["proxy", "skip_verify_tls"]}
        tooltip="Useful is the host uses a self-signed certificate"
      >
        <Switch />
      </Form.Item>

      <Form.Item
        label="Forward Client Host Header"
        name={["proxy", "keep_host"]}
      >
        <Switch />
      </Form.Item>
    </Col>
  </Row>
);

const MockContextEditor = (): JSX.Element => (
  <div className="inline-form-items">
    <Form.Item name={["context", "times_enabled"]} noStyle>
      <Switch size="small" />
    </Form.Item>

    <Form.Item
      label="Limit this mock to be called"
      shouldUpdate={(prevValues, currentValues) =>
        prevValues?.context?.times_enabled !==
          currentValues?.context?.times_enabled ||
        prevValues?.context?.times !== currentValues?.context?.times
      }
      style={{ marginBottom: 0, paddingLeft: "5px" }}
    >
      {({ getFieldValue }) => (
        <>
          <Form.Item name={["context", "times"]} noStyle>
            <InputNumber
              min={1}
              disabled={!getFieldValue(["context", "times_enabled"])}
            />
          </Form.Item>
          {getFieldValue(["context", "times"]) <= 1 ? (
            <span> time</span>
          ) : (
            <span> times</span>
          )}
        </>
      )}
    </Form.Item>
  </div>
);

interface KeyValueEditorProps {
  name: string[];
  withMatchers?: boolean;
}

const KeyValueEditor = ({
  name,
  withMatchers,
}: KeyValueEditorProps): JSX.Element => (
  <Form.List name={name}>
    {(fields, { add, remove }) => (
      <>
        {fields.map(({ key, name: fieldName, fieldKey, ...restField }) => (
          <Space key={key} style={{ display: "flex" }} align="baseline">
            <Form.Item
              {...restField}
              name={[fieldName, "key"]}
              fieldKey={[fieldKey, "key"]}
            >
              <Input placeholder="Key" />
            </Form.Item>

            {withMatchers && (
              <Form.Item
                {...restField}
                name={[fieldName, "matcher"]}
                fieldKey={[fieldKey, "matcher"]}
              >
                <Select>
                  <Select.OptGroup label="Positive">
                    {positiveMatchers.map((matcher) => (
                      <Select.Option key={matcher} value={matcher}>
                        {matcher}
                      </Select.Option>
                    ))}
                  </Select.OptGroup>
                  <Select.OptGroup label="Negative">
                    {negativeMatchers.map((matcher) => (
                      <Select.Option key={matcher} value={matcher}>
                        {matcher}
                      </Select.Option>
                    ))}
                  </Select.OptGroup>
                </Select>
              </Form.Item>
            )}

            <Form.Item
              noStyle
              shouldUpdate
              // shouldUpdate={(prevValues, currentValues) =>
              //   // FIXME: handle matcher change
              //   // prevValues?.response_type !== currentValues?.response_type
              //   true
              // }
            >
              {({ getFieldValue }) => (
                <Form.Item
                  {...restField}
                  name={[fieldName, "value"]}
                  fieldKey={[fieldKey, "value"]}
                  className={classNames({
                    hidden: unaryMatchers.includes(
                      getFieldValue([...name, fieldKey, "matcher"])
                    ),
                  })}
                >
                  <Input placeholder="Value" />
                </Form.Item>
              )}
            </Form.Item>

            <MinusCircleOutlined onClick={() => remove(fieldName)} />
          </Space>
        ))}

        <Form.Item>
          <Button
            type="dashed"
            onClick={() => add({ matcher: defaultMatcher })}
            style={{ width: "100%" }}
            icon={<PlusOutlined />}
          >
            Add field
          </Button>
        </Form.Item>
      </>
    )}
  </Form.List>
);

const BodyMatcherEditor = ({ name }: KeyValueEditorProps): JSX.Element => {
  const [initialized, setInitialized] = React.useState(false);
  const [rawJSON, setRawJSON] = React.useState("");
  return (
    <Form.List name={name}>
      {(fields, { add, remove }) =>
        !initialized ? (
          <>
            <p>
              Please paste a JSON payload below in order to generate the
              corresponding body matcher. For better results, only keep the JSON
              fields you want to match upon.
            </p>
            <Code
              language="json"
              value={rawJSON}
              onChange={(value) => setRawJSON(value)}
            />
            <Button
              onClick={() => {
                const json = JSON.parse(rawJSON);
                // TODO: generate objx keys
                Object.entries(json).map(([key, value]) => {
                  add({ key, matcher: "ShouldEqual", value });
                });
                setInitialized(true);
              }}
            >
              Generate Body Matcher
            </Button>
          </>
        ) : (
          <>
            {/* TODO: factorize this with KeyValueEditor */}
            {fields.map(({ key, name: fieldName, fieldKey, ...restField }) => (
              <Space key={key} style={{ display: "flex" }} align="baseline">
                <Form.Item
                  {...restField}
                  name={[fieldName, "key"]}
                  fieldKey={[fieldKey, "key"]}
                >
                  <Input placeholder="Key" />
                </Form.Item>

                <Form.Item
                  {...restField}
                  name={[fieldName, "matcher"]}
                  fieldKey={[fieldKey, "matcher"]}
                >
                  <Select>
                    <Select.OptGroup label="Positive">
                      {positiveMatchers.map((matcher) => (
                        <Select.Option key={matcher} value={matcher}>
                          {matcher}
                        </Select.Option>
                      ))}
                    </Select.OptGroup>
                    <Select.OptGroup label="Negative">
                      {negativeMatchers.map((matcher) => (
                        <Select.Option key={matcher} value={matcher}>
                          {matcher}
                        </Select.Option>
                      ))}
                    </Select.OptGroup>
                  </Select>
                </Form.Item>

                <Form.Item
                  noStyle
                  shouldUpdate
                  // shouldUpdate={(prevValues, currentValues) =>
                  //   // FIXME: handle matcher change
                  //   // prevValues?.response_type !== currentValues?.response_type
                  //   true
                  // }
                >
                  {({ getFieldValue }) => (
                    <Form.Item
                      {...restField}
                      name={[fieldName, "value"]}
                      fieldKey={[fieldKey, "value"]}
                      className={classNames({
                        hidden: unaryMatchers.includes(
                          getFieldValue([...name, fieldKey, "matcher"])
                        ),
                      })}
                    >
                      <Input placeholder="Value" />
                    </Form.Item>
                  )}
                </Form.Item>

                <MinusCircleOutlined onClick={() => remove(fieldName)} />
              </Space>
            ))}

            <Form.Item>
              <Button
                type="dashed"
                onClick={() => add({ matcher: defaultMatcher })}
                style={{ width: "100%" }}
                icon={<PlusOutlined />}
              >
                Add field
              </Button>
            </Form.Item>
          </>
        )
      }
    </Form.List>
  );
};

export default MockEditor;
