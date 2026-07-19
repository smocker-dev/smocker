import * as React from "react";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";
import {
  Button,
  Form,
  FormListFieldData,
  FormListOperation,
  Input,
  Select,
  Space,
} from "antd";
import { defaultMatcher } from "../../modules/types";
import { matcherOptions, unaryMatchers } from "./utils";

export interface KeyValueEditorProps {
  name: string[];
  withMatchers?: boolean;
}

export const KeyValueEditor = ({
  name,
  withMatchers,
}: KeyValueEditorProps): React.JSX.Element => (
  <Form.List name={name}>
    {(fields, actions) => (
      <KeyValueEditorEngine
        name={name}
        withMatchers={withMatchers}
        fields={fields}
        actions={actions}
      />
    )}
  </Form.List>
);

export interface KeyValueEditorEngineProps extends KeyValueEditorProps {
  fields: FormListFieldData[];
  actions: FormListOperation;
}

export const KeyValueEditorEngine = ({
  name,
  withMatchers,
  fields,
  actions,
}: KeyValueEditorEngineProps): React.JSX.Element => (
  <div style={{ margin: "auto" }}>
    {fields.map(({ key, name: fieldName, ...restField }) => (
      <Space
        key={key}
        style={{ display: "flex", justifyContent: "center" }}
        align="baseline"
      >
        <MinusCircleOutlined onClick={() => actions.remove(fieldName)} />

        <Form.Item {...restField} name={[fieldName, "key"]}>
          <Input placeholder="Key" />
        </Form.Item>

        {withMatchers && (
          <Form.Item {...restField} name={[fieldName, "matcher"]}>
            <Select style={{ width: 210 }} options={matcherOptions} />
          </Form.Item>
        )}

        <Form.Item noStyle shouldUpdate>
          {({ getFieldValue }) => (
            <Form.Item
              {...restField}
              name={[fieldName, "value"]}
              hidden={unaryMatchers.includes(
                getFieldValue([...name, fieldName, "matcher"]),
              )}
            >
              <Input placeholder="Value" />
            </Form.Item>
          )}
        </Form.Item>
      </Space>
    ))}

    <Form.Item>
      <Button
        type="dashed"
        onClick={() => actions.add({ matcher: defaultMatcher })}
        style={{ width: "100%" }}
        icon={<PlusOutlined />}
      >
        Add field
      </Button>
    </Form.Item>
  </div>
);
