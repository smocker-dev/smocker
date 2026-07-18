import { Alert, App, Button, Drawer, Form, Tabs } from "antd";
import * as React from "react";
import { useAddMocks, useUpdateMock } from "../modules/api";
import {
  parseYamlForVisualEditor,
  validateMocksForSave,
} from "../modules/mockValidation";
import Code from "./Code";
import type { MockEditorForm } from "./MockEditor/convert";
import MockEditor from "./MockEditor/MockEditor";
import "./NewMock.scss";

// Mock creation/edition drawer, self-contained (owns the editor value and the mutation) so it can
// be dropped onto any page. The YAML string is the single source of truth: the Visual Editor
// writes to it continuously, and switching back to it re-hydrates from that YAML — but only if the
// YAML is a single mock valid against the schema (otherwise the switch is blocked with an error).
// When editId is set the drawer edits an existing mock (PUT) instead of creating one (POST).
export const NewMock = ({
  defaultValue = "",
  editId,
  sessionId,
  onClose,
}: {
  defaultValue?: string;
  editId?: string;
  sessionId?: string;
  onClose: () => void;
}): React.JSX.Element => {
  const { message } = App.useApp();
  const addMocksMut = useAddMocks();
  const updateMockMut = useUpdateMock();
  const isEdit = editId !== undefined;
  const saving = addMocksMut.isPending || updateMockMut.isPending;
  const [mock, setMock] = React.useState(defaultValue);
  const [view, setView] = React.useState<"visual" | "raw">(
    defaultValue.trim() === "" ? "visual" : "raw",
  );
  // Bumped to remount MockEditor with a fresh initial form when switching in from YAML.
  const [formSeed, setFormSeed] = React.useState(0);
  const [initialForm, setInitialForm] = React.useState<
    MockEditorForm | undefined
  >(undefined);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = () => {
    // Validate against the schema first so obvious mistakes don't require rewriting the mock.
    const check = validateMocksForSave(mock);
    if (!check.ok) {
      setError(`Can't save — ${check.error}`);
      setView("raw");
      return;
    }
    // Keep the drawer open on failure (e.g. a server-side error) so the mock isn't lost.
    const opts = {
      onSuccess: () => {
        message.success(isEdit ? "Mock updated" : "Mock saved");
        onClose();
      },
      onError: (e: unknown) => {
        setError(`Can't save — ${(e as Error).message}`);
        setView("raw");
      },
    };
    if (isEdit) {
      updateMockMut.mutate({ sessionID: sessionId, id: editId, mock }, opts);
    } else {
      addMocksMut.mutate(mock, opts);
    }
  };

  const onChangeView = (key: string) => {
    if (key !== "visual") {
      setError(null);
      setView("raw");
      return;
    }
    // Empty editor: just open a blank visual form.
    if (!mock.trim()) {
      setInitialForm(undefined);
      setFormSeed((s) => s + 1);
      setError(null);
      setView("visual");
      return;
    }
    const parsed = parseYamlForVisualEditor(mock);
    if (!parsed.ok) {
      // Block the switch and keep the user on the raw editor with an explanation.
      setError(`Can't open the visual editor — ${parsed.error}`);
      return;
    }
    setInitialForm(parsed.form);
    setFormSeed((s) => s + 1);
    setError(null);
    setView("visual");
  };

  return (
    <Drawer
      title={isEdit ? "Edit mock" : "Add mocks"}
      placement="right"
      className="drawer"
      closable={false}
      onClose={onClose}
      open
      width="70vw"
      footer={
        <div className="action buttons">
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} type="primary" loading={saving}>
            Save
          </Button>
        </div>
      }
    >
      <Tabs
        activeKey={view}
        onChange={onChangeView}
        items={[
          {
            key: "visual",
            label: "Visual Editor",
            children: (
              <MockEditor
                key={formSeed}
                initialForm={initialForm}
                onChange={setMock}
              />
            ),
          },
          {
            key: "raw",
            label: "Raw YAML Editor",
            children: (
              <>
                {error && (
                  <Alert
                    type="error"
                    showIcon
                    closable
                    onClose={() => setError(null)}
                    message={error}
                    className="new-mock-error"
                  />
                )}
                <Form className="form">
                  <Code
                    value={mock}
                    language="yaml"
                    onChange={setMock}
                    collapsible={false}
                  />
                </Form>
              </>
            ),
          },
        ]}
      />
    </Drawer>
  );
};

export default NewMock;
