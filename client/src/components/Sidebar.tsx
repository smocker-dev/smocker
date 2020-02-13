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
  Typography
} from "antd";
import "./Sidebar.scss";
import { Sessions, Session } from "~modules/types";
import { usePoll } from "~utils";

const NewButton = ({ onValidate }: any) => {
  const [visible, setVisible] = React.useState(false);
  const [name, setName] = React.useState("");
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onValidate(name.trim());
    setName("");
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
              Start
            </Button>
          </Form.Item>
        </Form>
      }
      title="You can set a name for the new session"
      trigger="click"
    >
      <Row align="middle" justify="center" type="flex">
        <Button ghost type="primary" icon="plus" className="session-button">
          New Session
        </Button>
      </Row>
    </Popover>
  );
};

const EditableItem = ({ value, onValidate }: any) => {
  const [visible, setVisible] = React.useState(false);
  const [name, setName] = React.useState(value || "");
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onValidate(name.trim());
    setName("");
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
  newSession: (name: string) => void;
  updateSession: (session: Session) => void;
}

const SideBar = ({
  fetch,
  selected,
  sessions,
  loading,
  selectSession,
  updateSession,
  newSession
}: Props) => {
  const [, , setPolling] = usePoll(10000, fetch);
  if (!selected && sessions.length > 0) {
    selectSession(sessions[sessions.length - 1].id);
  }
  const selectedItem = selected ? [selected] : undefined;
  const onCollapse = (col: boolean) => setPolling(!col);
  const onNewSession = (name: string) => newSession(name);
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

  const title: any = (
    <Spin spinning={loading}>
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
    selected: state.sessions.selected
  }),
  (dispatch: Dispatch<Actions>) => ({
    fetch: () => dispatch(actions.fetchSessions.request()),
    selectSession: (sessionID: string) =>
      dispatch(actions.selectSession(sessionID)),
    newSession: (name: string) => dispatch(actions.newSession.request(name)),
    updateSession: (session: Session) =>
      dispatch(actions.updateSession.request(session))
  })
)(SideBar);
