import * as React from "react";
import {
  Col,
  Form,
  Input,
  Radio,
  RadioChangeEvent,
  Row,
  Select,
  Switch,
} from "antd";
import Code, { Language } from "../Code";
import { BodyMatcherEditor } from "./BodyMatcherEditor";
import { KeyValueEditor } from "./KeyValueEditor";

export const MockRequestEditor = (): JSX.Element => {
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
                style={{
                  display: "block",
                  textAlign: "center",
                  marginBottom: 5,
                }}
              />
              {bodyLanguage === "json" && (
                <BodyMatcherEditor name={["request", "body"]} />
              )}
              {bodyLanguage === "txt" && (
                <div>
                  <Radio.Group
                    options={fallbackMatchers}
                    optionType="button"
                    defaultValue="ShouldEqual"
                    size="small"
                    style={{
                      display: "block",
                      textAlign: "center",
                      marginBottom: 5,
                    }}
                  />
                  <Form.Item noStyle>
                    <Code language={bodyLanguage} />
                  </Form.Item>
                </div>
              )}
            </Form.Item>
          )
        }
      </Form.Item>
    </>
  );
};
