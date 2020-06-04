import { EditOutlined, PlusOutlined, UploadOutlined } from "@ant-design/icons";
import {
  Button,
  Form,
  Input,
  Layout,
  Menu,
  Popover,
  Row,
  Spin,
  Tooltip,
  Typography,
} from "antd";
import * as React from "react";
import { connect } from "react-redux";
import { Dispatch } from "redux";
import { Actions, actions } from "~modules/actions";
import { AppState } from "~modules/reducers";
import { Session, Sessions } from "~modules/types";
import { usePoll } from "~utils";
import "./Sidebar.scss";

const NewButton = ({ onValidate }: { onValidate: () => unknown }) => {
  const onClick = (event: React.MouseEvent) => {
    event.preventDefault();
    onValidate();
  };
  return (
    <Row align="middle" justify="center">
      <Button
        ghost
        type="primary"
        icon={<PlusOutlined />}
        className="session-button"
        onClick={onClick}
      >
        New Session
      </Button>
    </Row>
  );
};

const EditableItem = ({
  value,
  onValidate,
}: {
  value?: string;
  onValidate: (name: string) => unknown;
}) => {
  const [visible, setVisible] = React.useState(false);
  const [name, setName] = React.useState(value || "");
  const onSubmit = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
    event.preventDefault();
    onValidate(name.trim());
    setVisible(false);
  };
  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };
  return (
    <Popover
      placement="right"
      visible={visible}
      onVisibleChange={setVisible}
      content={
        <Form layout="inline">
          <Form.Item>
            <Input value={name} onChange={onChange} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" onClick={onSubmit}>
              Save
            </Button>
          </Form.Item>
        </Form>
      }
      title="Edit session's name"
      trigger="click"
    >
      <EditOutlined />
    </Popover>
  );
};

interface Props {
  sessions: Sessions;
  loading: boolean;
  selected: string;
  fetch: () => unknown;
  selectSession: (sessionID: string) => unknown;
  newSession: () => unknown;
  updateSession: (session: Session) => unknown;
  uploadSessions: (sessions: Session[]) => unknown;
}

const SideBar = ({
  fetch,
  selected,
  sessions,
  loading,
  selectSession,
  updateSession,
  newSession,
  uploadSessions,
}: Props) => {
  const [, , setPolling] = usePoll(10000, fetch, undefined);
  const selectedItem = selected ? [selected] : undefined;
  const onCollapse = (col: boolean) => setPolling(!col);
  const onNewSession = () => newSession();
  const onClick = ({ key }: { key: string }) => selectSession(key);
  const onChangeSessionName = (index: number) => (name: string) => {
    updateSession({ ...sessions[index], name });
  };
  const items = sessions.map((session: Session, index: number) => (
    <Menu.Item key={session.id}>
      <Row
        justify="space-between"
        align="middle"
        title={session.name || session.id}
      >
        <Typography.Text ellipsis className="menu-item">
          {session.name || session.id}
        </Typography.Text>
        <EditableItem
          value={session.name}
          onValidate={onChangeSessionName(index)}
        />
      </Row>
    </Menu.Item>
  ));

  const onFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) {
      return;
    }
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (ev: ProgressEvent<FileReader>) => {
      try {
        const sessionToUpload = JSON.parse(ev.target?.result as string);
        uploadSessions(sessionToUpload);
      } catch (e) {
        console.error(e);
      }
    };
    reader.readAsText(file);
  };

  const title: JSX.Element = (
    <Spin spinning={loading}>
      <Tooltip
        title="Upload a session file"
        placement="right"
        mouseEnterDelay={0.5}
      >
        <label>
          <input type="file" onChange={onFileUpload} />
          <a>
            <UploadOutlined />
          </a>
        </label>
      </Tooltip>
      <span>Sessions</span>
    </Spin>
  );
  return (
    <Layout.Sider
      className="sidebar"
      collapsible
      defaultCollapsed
      breakpoint="xl"
      collapsedWidth="0"
      theme="light"
      onCollapse={onCollapse}
    >
      <Menu
        className="menu"
        onClick={onClick}
        mode="inline"
        selectedKeys={selectedItem}
      >
        <Menu.ItemGroup title={title} className="group">
          {items}
          <NewButton onValidate={onNewSession} />
        </Menu.ItemGroup>
      </Menu>
    </Layout.Sider>
  );
};

export default connect(
  (state: AppState) => ({
    sessions: state.sessions.list,
    loading: state.sessions.loading,
    selected: state.sessions.selected,
  }),
  (dispatch: Dispatch<Actions>) => ({
    fetch: () => dispatch(actions.fetchSessions.request()),
    selectSession: (sessionID: string) =>
      dispatch(actions.selectSession(sessionID)),
    newSession: () => dispatch(actions.newSession.request()),
    updateSession: (session: Session) =>
      dispatch(actions.updateSession.request(session)),
    uploadSessions: (sessions: Sessions) =>
      dispatch(actions.uploadSessions.request(sessions)),
  })
)(SideBar);
