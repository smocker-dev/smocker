import * as React from "react";
import { Divider, Form, Radio } from "antd";
import { dump } from "js-yaml";
import { defaultMatcher } from "../../modules/types";
import "./MockEditor.scss";
import classNames from "classnames";
import { MockRequestEditor } from "./MockRequestEditor";
import { MockStaticResponseEditor } from "./MockStaticResponseEditor";
import { MockDynamicResponseEditor } from "./MockDynamicResponseEditor";
import { MockProxyResponseEditor } from "./MockProxyResponseEditor";
import { MockContextEditor } from "./MockContextEditor";
import { defaultResponseStatus } from "./utils";
import { MockEditorForm, MockEditorFormToMock } from "./convert";

interface MockEditorProps {
  onChange?: (value: string) => unknown;
  // Pre-fill the form (e.g. when switching in from the Raw YAML editor). Defaults to a blank mock.
  initialForm?: MockEditorForm;
}

const MockEditor = ({
  onChange,
  initialForm,
}: MockEditorProps): React.JSX.Element => {
  const initialValues: MockEditorForm = initialForm ?? {
    request: {
      method: "GET",
      method_matcher: defaultMatcher,
      path_matcher: defaultMatcher,
      path: "",
      body_type: "json",
      body_txt_matcher: defaultMatcher,
    },
    response_type: "static",
    response: {
      status: defaultResponseStatus,
      delay_mode: "none",
    },
    dynamic_response: {
      engine: "go_template_yaml",
    },
    proxy: {
      delay_mode: "none",
    },
    context: {
      times_enabled: false,
      times: 1,
    },
  };

  const [form] = Form.useForm<MockEditorForm>();

  // Emit the initial mock on mount so the parent's YAML stays in sync even before the first edit
  // (and reflects the pre-filled form after hydrating from the raw editor).
  React.useEffect(() => {
    onChange?.(dump([MockEditorFormToMock(initialValues)], { skipInvalid: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        if (onChange) {
          onChange(dump([MockEditorFormToMock(values)], { skipInvalid: true }));
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
    </Form>
  );
};

export default MockEditor;
