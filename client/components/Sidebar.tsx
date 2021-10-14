import {
  DeleteOutlined,
  EditOutlined,
  LoadingOutlined,
  PlusOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import {
  Button,
  Form,
  Input,
  Layout,
  Menu,
  Popover,
  Row,
  Tooltip,
  Typography,
} from "antd";
import * as React from "react";
import { connect } from "react-redux";
import { Dispatch } from "redux";
import { Actions, actions } from "../modules/actions";
import { AppState } from "../modules/reducers";
import { Session, Sessions } from "../modules/types";
import { usePoll, useQueryParams } from "../modules/utils";
import "./Sidebar.scss";

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
      title="Rename session"
      trigger="click"
    >
      <EditOutlined />
    </Popover>
  );
};

interface Props {
  sessions: Sessions;
  loading: boolean;
  uploading: boolean;
  selected: string;
  fetch: () => unknown;
  selectSession: (sessionID: string) => unknown;
  newSession: () => unknown;
  updateSession: (session: Session) => unknown;
  uploadSessions: (sessions: Session[]) => unknown;
  resetSessions: () => unknown;
}

const SideBar = ({
  fetch,
  selected,
  sessions,
  loading,
  uploading,
  selectSession,
  updateSession,
  newSession,
  uploadSessions,
  resetSessions,
}: Props) => {
  const [queryParams, setQueryParams] = useQueryParams();
  const [, , setPolling] = usePoll(10000, fetch, undefined);
  const [fileUploading, setFileUploading] = React.useState(false);

  const querySessionID = queryParams.get("session");

  const handleSelectSession = (sessionID: string) => {
    setQueryParams({ session: sessionID });
    selectSession(sessionID);
  };

  React.useEffect(() => {
    if (!loading && !selected && sessions.length > 0) {
      if (
        !querySessionID ||
        sessions.filter((session) => session.id === querySessionID).length === 0
      ) {
        handleSelectSession(sessions[sessions.length - 1].id);
      } else {
        querySessionID && handleSelectSession(querySessionID);
      }
    }
    if (!loading && selected && !querySessionID) {
      setQueryParams({ session: selected });
    }
  }, [loading, selected, sessions, querySessionID]);

  const selectedItem = selected ? [selected] : undefined;
  const onCollapse = (col: boolean) => setPolling(!col);
  const onSelect = ({ key }: { key: string }) => {
    if (key !== "new" && key !== "reset") {
      handleSelectSession(key);
    } else {
      setQueryParams({ session: "" });
    }
  };
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
        <Typography.Text ellipsis className="session-name">
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
    setFileUploading(true);
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
        setFileUploading(false);
      } catch (e) {
        console.error(e);
      }
    };
    reader.readAsText(file);
  };

  const title: JSX.Element =
    fileUploading || uploading ? (
      <>
        <label>
          <a>
            <LoadingOutlined />
          </a>
        </label>
        <span>Sessions</span>
      </>
    ) : (
      <>
        <Tooltip
          title="Load a session from a file"
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
      </>
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
        onClick={onSelect}
        mode="inline"
        selectedKeys={selectedItem}
      >
        <Menu.ItemGroup title={title} className="group">
          {items}
          <Menu.Item key="new" className="menu-button">
            <Button
              ghost
              type="primary"
              icon={<PlusOutlined />}
              className="session-button"
              onClick={newSession}
            >
              New Session
            </Button>
          </Menu.Item>
        </Menu.ItemGroup>
        <Menu.Item key="reset" className="menu-button">
          <Button
            danger
            icon={<DeleteOutlined />}
            className="reset-button"
            onClick={resetSessions}
          >
            Reset Sessions
          </Button>
        </Menu.Item>
      </Menu>
    </Layout.Sider>
  );
};

export default connect(
  (state: AppState) => ({
    sessions: state.sessions.list,
    loading: state.sessions.loading,
    uploading: state.sessions.uploading,
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
    resetSessions: () => dispatch(actions.reset.request()),
  })
)(SideBar);
