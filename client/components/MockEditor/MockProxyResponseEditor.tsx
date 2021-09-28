import * as React from "react";
import {
  Col, Form,
  Input, Row, Switch
} from "antd";
import { KeyValueEditor } from "./KeyValueEditor";

export const MockProxyResponseEditor = (): JSX.Element => (
  <Row gutter={24}>
    <Col span={12}>
      <Form.Item label="Host" name={["proxy", "host"]}>
        <Input placeholder="https://example.com" />
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
