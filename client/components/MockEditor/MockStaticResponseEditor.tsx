import * as React from "react";
import {
  Col, Form, InputNumber,
  Radio,
  RadioChangeEvent,
  Row
} from "antd";
import { getReasonPhrase } from "http-status-codes";
import Code, { Language } from "../Code";
import { defaultResponseStatus } from "./utils";
import { KeyValueEditor } from "./KeyValueEditor";

export const MockStaticResponseEditor = (): JSX.Element => {
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
            }} />
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
              onChange={(e: RadioChangeEvent) => setBodyLanguage(e.target.value)}
              optionType="button"
              buttonStyle="solid"
              size="small"
              style={{ marginBottom: 5 }} />
            <Form.Item name={["response", "body"]} noStyle>
              <Code language={bodyLanguage} />
            </Form.Item>
          </Form.Item>
        </Col>
      </Row>
    </>
  );
};
