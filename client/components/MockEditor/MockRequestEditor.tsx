import * as React from "react";
import { Col, Form, Input, Radio, Row, Select, Switch } from "antd";
import Code from "../Code";
import { BodyMatcherEditor } from "./BodyMatcherEditor";
import { KeyValueEditor } from "./KeyValueEditor";
import classNames from "classnames";

export const MockRequestEditor = (): JSX.Element => {
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
    <Form.Item name={["request", "path_regex"]} noStyle>
      <Switch checkedChildren="Regex" unCheckedChildren="Raw" />
    </Form.Item>
  );

  // TODO: handle YAML and XML
  const languages = [
    { label: "JSON", value: "json" },
    { label: "Default", value: "txt" },
  ];

  const fallbackMatchers = [
    { label: "ShouldEqual", value: "ShouldEqual" },
    { label: "ShouldMatch", value: "ShouldMatch" },
    { label: "ShouldEqualJSON", value: "ShouldEqualJSON" },
    { label: "ShouldContainSubstring", value: "ShouldContainSubstring" },
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
            <div style={{ width: "80%", margin: "auto" }}>
              Body:
              <Form.Item name={["request", "body_type"]}>
                <Radio.Group
                  options={languages}
                  optionType="button"
                  buttonStyle="solid"
                  size="small"
                  style={{
                    display: "block",
                    textAlign: "center",
                    marginBottom: 5,
                  }}
                />
              </Form.Item>
              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) =>
                  prevValues?.request?.body_type !==
                  currentValues?.request?.body_type
                }
              >
                {({ getFieldValue }) => (
                  <>
                    {/* Use divs with display to make sure the form components render */}
                    <div
                      className={classNames({
                        "display-none":
                          getFieldValue(["request", "body_type"]) !== "json",
                      })}
                    >
                      <BodyMatcherEditor name={["request", "body_json"]} />
                    </div>
                    <div
                      className={classNames({
                        "display-none":
                          getFieldValue(["request", "body_type"]) !== "txt",
                      })}
                    >
                      <Form.Item name={["request", "body_txt_matcher"]} noStyle>
                        <Radio.Group
                          options={fallbackMatchers}
                          optionType="button"
                          size="small"
                          style={{
                            display: "block",
                            textAlign: "center",
                            marginBottom: 5,
                          }}
                        />
                      </Form.Item>
                      <Form.Item name={["request", "body_txt_value"]} noStyle>
                        <Code language="txt" />
                      </Form.Item>
                    </div>
                  </>
                )}
              </Form.Item>
            </div>
          )
        }
      </Form.Item>
    </>
  );
};
