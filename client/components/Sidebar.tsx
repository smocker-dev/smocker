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
import type { MenuProps } from "antd";
import * as React from "react";
import { useLocation } from "react-router-dom";
import {
  useNewSession,
  useReset,
  useSessionsSummary,
  useUpdateSession,
  useUploadSessions,
} from "../modules/api";
import { useSession } from "../modules/session";
import { Session, Sessions } from "../modules/types";
import { useQueryParams } from "../modules/utils";
import "./Sidebar.scss";

const EditableItem = ({
  value,
  onValidate,
}: {
  value?: string;
  onValidate: (name: string) => unknown;
}) => {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(value || "");
  const onSubmit = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
    event.preventDefault();
    onValidate(name.trim());
    setOpen(false);
  };
  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };
  return (
    <Popover
      placement="right"
      open={open}
      onOpenChange={setOpen}
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

const SideBar = (): React.JSX.Element => {
  const { selected, setSelected } = useSession();
  const [queryParams, setQueryParams] = useQueryParams();
  const [polling, setPolling] = React.useState(false);
  const [fileUploading, setFileUploading] = React.useState(false);

  const sessionsQuery = useSessionsSummary({
    refetchInterval: polling ? 10000 : false,
  });
  const sessions: Sessions = sessionsQuery.data ?? [];
  const loading = sessionsQuery.isFetching;

  const newSessionMut = useNewSession();
  const updateSessionMut = useUpdateSession();
  const uploadSessionsMut = useUploadSessions();
  const resetMut = useReset();
  const uploading = uploadSessionsMut.isPending;

  const querySessionID = queryParams.get("session");
  // Only write the ?session param when we're on an actual page route. On the unmatched root the
  // "*" → /pages/history redirect is still settling; navigating (even query-only) from there
  // clobbers it and strands the app on a blank root. Once redirected, this effect re-runs on the
  // /pages route and syncs the session there.
  const { pathname } = useLocation();
  const onPageRoute = pathname.startsWith("/pages/");

  const handleSelectSession = (sessionID: string) => {
    if (onPageRoute) {
      setQueryParams({ session: sessionID });
    }
    setSelected(sessionID);
  };

  React.useEffect(() => {
    if (loading) {
      return;
    }
    if (!selected && sessions.length > 0) {
      if (
        !querySessionID ||
        sessions.filter((session) => session.id === querySessionID).length === 0
      ) {
        handleSelectSession(sessions[sessions.length - 1].id);
      } else {
        handleSelectSession(querySessionID);
      }
    } else if (selected) {
      if (
        sessions.length > 0 &&
        sessions.filter((session) => session.id === selected).length === 0
      ) {
        setSelected("");
      } else if (!querySessionID && onPageRoute) {
        // Re-annotate the current URL with the active session (URL normalization, not a
        // navigation) — replace so it never adds a history entry that would trap the back button.
        setQueryParams({ session: selected }, true);
      }
    }
  }, [loading, selected, sessions, querySessionID, onPageRoute]);

  const selectedItem = selected ? [selected] : undefined;
  const onCollapse = (col: boolean) => setPolling(!col);
  const onSelect: MenuProps["onClick"] = ({ key }) => {
    if (key !== "new" && key !== "reset") {
      handleSelectSession(key);
    } else {
      setQueryParams({ session: "" });
    }
  };
  const onChangeSessionName = (index: number) => (name: string) => {
    const session = sessions[index];
    updateSessionMut.mutate(
      { ...session, name },
      { onSuccess: (updated) => setSelected(updated.id) }
    );
  };
  const handleNewSession = () =>
    newSessionMut.mutate(undefined, {
      onSuccess: (session) => setSelected(session.id),
    });
  const handleReset = () =>
    resetMut.mutate(undefined, { onSuccess: () => setSelected("") });

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
        const sessionToUpload: Session[] = JSON.parse(
          ev.target?.result as string
        );
        uploadSessionsMut.mutate(sessionToUpload);
        setFileUploading(false);
      } catch (e) {
        console.error(e);
      }
    };
    reader.readAsText(file);
  };

  const title: React.JSX.Element =
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

  const sessionItems: NonNullable<MenuProps["items"]> = sessions.map(
    (session: Session, index: number) => ({
      key: session.id,
      label: (
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
      ),
    })
  );

  const items: MenuProps["items"] = [
    {
      type: "group",
      key: "sessions-group",
      className: "group",
      label: title,
      children: [
        ...sessionItems,
        {
          key: "new",
          className: "menu-button",
          label: (
            <Button
              ghost
              type="primary"
              icon={<PlusOutlined />}
              className="session-button"
              onClick={handleNewSession}
            >
              New Session
            </Button>
          ),
        },
      ],
    },
    {
      key: "reset",
      className: "menu-button",
      label: (
        <Button
          danger
          icon={<DeleteOutlined />}
          className="reset-button"
          onClick={handleReset}
        >
          Reset Sessions
        </Button>
      ),
    },
  ];

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
        items={items}
      />
    </Layout.Sider>
  );
};

export default SideBar;
