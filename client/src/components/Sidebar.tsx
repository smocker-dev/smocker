import * as React from "react";
import { connect } from "react-redux";
import { AppState } from "~modules/reducers";
import { Dispatch } from "redux";
import { Actions, actions } from "~modules/actions";
import {
  Button,
  Form,
  Icon,
  Input,
  Layout,
  Menu,
  Popover,
  Row,
  Spin,
  Typography,
  Tooltip,
} from "antd";
import "./Sidebar.scss";
import { Sessions, Session } from "~modules/types";
import { usePoll } from "~utils";

const NewButton = ({ onValidate }: any) => {
  const onClick = (event: React.MouseEvent) => {
    event.preventDefault();
    onValidate();
  };
  return (
    <Row align="middle" justify="center" type="flex">
      <Button
        ghost
        type="primary"
        icon="plus"
        className="session-button"
        onClick={onClick}
      >
        New Session
      </Button>
    </Row>
  );
};

const EditableItem = ({ value, onValidate }: any) => {
  const [visible, setVisible] = React.useState(false);
  const [name, setName] = React.useState(value || "");
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
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
        <Form layout="inline" onSubmit={onSubmit}>
          <Form.Item>
            <Input value={name} onChange={onChange} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Save
            </Button>
          </Form.Item>
        </Form>
      }
      title="Edit session's name"
      trigger="click"
    >
      <Icon type="edit" />
    </Popover>
  );
};

interface Props {
  sessions: Sessions;
  loading: boolean;
  selected: string;
  fetch: () => void;
  selectSession: (sessionID: string) => void;
  newSession: () => void;
  updateSession: (session: Session) => void;
  uploadSessions: (sessions: any[]) => void;
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
  const [, , setPolling] = usePoll(10000, fetch);
  if (!selected && sessions.length > 0) {
    selectSession(sessions[sessions.length - 1].id);
  }
  const selectedItem = selected ? [selected] : undefined;
  const onCollapse = (col: boolean) => setPolling(!col);
  const onNewSession = () => newSession();
  const onClick = ({ key }: { key: string }) => selectSession(key);
  const onChangeSessionName = (index: number) => (name: string) => {
    updateSession({ ...sessions[index], name });
  };
  const items = sessions.map((session: Session, index: number) => (
    <Menu.Item key={session.id}>
      <Row type="flex" justify="space-between" align="middle">
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

  const onFileUpload = (event: any) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (ev: any) => {
      try {
        const sessionToUpload = JSON.parse(ev.target.result);
        uploadSessions(sessionToUpload);
      } catch (e) {
        console.error(e);
      }
    };
    reader.readAsText(file);
  };

  const title: any = (
    <Spin spinning={loading}>
      <Tooltip
        title="Upload a session file"
        placement="right"
        mouseEnterDelay={0.5}
      >
        <label>
          <input type="file" onChange={onFileUpload} />
          <a>
            <Icon type="upload" />
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
