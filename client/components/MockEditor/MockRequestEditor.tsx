import * as React from "react";
import {
  Col, Form,
  Input, Radio,
  RadioChangeEvent,
  Row,
  Select, Switch
} from "antd";
import { Language } from "../Code";
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

  const languages = [
    { label: "JSON", value: "json" },
    { label: "YAML", value: "yaml" },
    { label: "XML", value: "xml" },
    { label: "Plain Text", value: "txt" },
  ];

  return (
    <>
      <Form.Item label="Endpoint" name={["request", "path"]}>
        <Input
          addonBefore={methodSelector}
          addonAfter={regexToggle}
          placeholder="/example" />
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
        shouldUpdate={(prevValues, currentValues) => prevValues?.request?.method !== currentValues?.request?.method}
      >
        {({ getFieldValue }) => getFieldValue(["request", "method"]) !== "GET" && (
          <Form.Item label="Body">
            <Radio.Group
              options={languages}
              value={bodyLanguage}
              onChange={(e: RadioChangeEvent) => setBodyLanguage(e.target.value)}
              optionType="button"
              buttonStyle="solid"
              size="small"
              style={{ marginBottom: 5 }} />
            <BodyMatcherEditor name={["request", "body"]} />
          </Form.Item>
        )}
      </Form.Item>
    </>
  );
};
