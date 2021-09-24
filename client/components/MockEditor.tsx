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
} from "antd";
import { getReasonPhrase } from "http-status-codes";
import { NamePath } from "rc-field-form/lib/interface";
import Code, { Language } from "./Code";
import yaml from "js-yaml";
import { defaultMatcher } from "~modules/types";

const defaultResponseStatus = 200;

// This type is juste used in Antd's onFinish/onValuesChange callbacks, it's not very useful but nice to have
interface MockEditorForm {
  request: {
    method: string;
    path: string;
    query_parameters?: {
      key?: string;
      matcher: string;
      value?: string;
    }[];
    headers?: {
      key: string;
      matcher: string;
      value: string;
    }[];
  };
  response_type: "static" | "dynamic" | "proxy";
  response?: {
    status: number;
    headers?: {
      key?: string;
      value?: string;
    }[];
    body?: string;
  };
  dynamic_response?: {
    engine: "go_template_yaml" | "go_template_json" | "lua";
    script?: string;
  };
  proxy?: {
    host?: string;
    headers?: {
      key?: string;
      value?: string;
    }[];
    follow_redirect?: boolean;
    skip_verify_tls?: boolean;
    keep_host?: boolean;
  };
  context?: {
    times?: number;
  };
}

const MockEditorFormToMock = (mockEditorForm: MockEditorForm): unknown => {
  return {
    request: {
      method: mockEditorForm.request.method,
      path: mockEditorForm.request.path,
      query_params: mockEditorForm.request?.query_parameters
        ?.filter((item) => item.key && item.value)
        .reduce(
          (acc, item) => ({
            ...acc,
            [item?.key ?? ""]:
              item.matcher === defaultMatcher
                ? item.value
                : { matcher: item.matcher, value: item.value },
          }),
          {}
        ),
      headers: mockEditorForm.request?.headers
        ?.filter((item) => item.key && item.value)
        .reduce(
          (acc, item) => ({
            ...acc,
            [item?.key ?? ""]:
              item.matcher === defaultMatcher
                ? item.value
                : { matcher: item.matcher, value: item.value },
          }),
          {}
        ),
    },

    response:
      mockEditorForm.response_type === "static"
        ? {
            status: mockEditorForm?.response?.status,
            body: mockEditorForm?.response?.body ?? "",
            headers: mockEditorForm.response?.headers
              ?.filter((item) => item.key && item.value)
              .reduce(
                (acc, item) => ({
                  ...acc,
                  [item?.key ?? ""]: item.value,
                }),
                {}
              ),
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
        console.log(values);
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
            {getFieldValue("response_type") === "static" && (
              <MockStaticResponseEditor />
            )}
            {getFieldValue("response_type") === "dynamic" && (
              <MockDynamicResponseEditor />
            )}
            {getFieldValue("response_type") === "proxy" && (
              <MockProxyResponseEditor />
            )}
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

  return (
    <>
      <Form.Item label="Endpoint" name={["request", "path"]}>
        <Input addonBefore={methodSelector} placeholder="/example" />
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
  <Form.Item
    label="Limit this mock to be called"
    shouldUpdate={(prevValues, currentValues) =>
      prevValues?.context?.times !== currentValues?.context?.times
    }
  >
    {({ getFieldValue }) => (
      <>
        <Form.Item name={["context", "times"]} noStyle>
          <InputNumber min={1} />
        </Form.Item>
        {getFieldValue(["context", "times"]) <= 1 ? (
          <span> time</span>
        ) : (
          <span> times</span>
        )}
      </>
    )}
  </Form.Item>
);

interface KeyValueEditorProps {
  name: NamePath;
  withMatchers?: boolean;
}

const KeyValueEditor = ({
  name,
  withMatchers,
}: KeyValueEditorProps): JSX.Element => (
  <Form.List name={name}>
    {(fields, { add, remove }) => (
      <>
        {fields.map(({ key, name, fieldKey, ...restField }) => (
          <Space key={key} style={{ display: "flex" }} align="baseline">
            <Form.Item
              {...restField}
              name={[name, "key"]}
              fieldKey={[fieldKey, "key"]}
            >
              <Input placeholder="Key" />
            </Form.Item>

            {withMatchers && (
              <Form.Item
                {...restField}
                name={[name, "matcher"]}
                fieldKey={[fieldKey, "matcher"]}
              >
                <Select>
                  <Select.OptGroup label="Positive">
                    <Select.Option value="ShouldEqual">
                      ShouldEqual
                    </Select.Option>
                    <Select.Option value="ShouldMatch">
                      ShouldMatch
                    </Select.Option>
                    <Select.Option value="ShouldBeEmpty">
                      ShouldBeEmpty
                    </Select.Option>
                    <Select.Option value="ShouldContainSubstring">
                      ShouldContainSubstring
                    </Select.Option>
                    <Select.Option value="ShouldStartWith">
                      ShouldStartWith
                    </Select.Option>
                    <Select.Option value="ShouldEndWith">
                      ShouldEndWith
                    </Select.Option>
                  </Select.OptGroup>
                  <Select.OptGroup label="Negative">
                    <Select.Option value="ShouldNotEqual">
                      ShouldNotEqual
                    </Select.Option>
                    <Select.Option value="ShouldNotMatch">
                      ShouldNotMatch
                    </Select.Option>
                    <Select.Option value="ShouldNotBeEmpty">
                      ShouldNotBeEmpty
                    </Select.Option>
                    <Select.Option value="ShouldNotContainSubstring">
                      ShouldNotContainSubstring
                    </Select.Option>
                    <Select.Option value="ShouldNotStartWith">
                      ShouldNotStartWith
                    </Select.Option>
                    <Select.Option value="ShouldNotEndWith">
                      ShouldNotEndWith
                    </Select.Option>
                  </Select.OptGroup>
                </Select>
              </Form.Item>
            )}

            <Form.Item
              {...restField}
              name={[name, "value"]}
              fieldKey={[fieldKey, "value"]}
            >
              <Input placeholder="Value" />
            </Form.Item>
            <MinusCircleOutlined onClick={() => remove(name)} />
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

export default MockEditor;
