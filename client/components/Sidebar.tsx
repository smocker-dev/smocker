import {
  DeleteOutlined,
  EditOutlined,
  LoadingOutlined,
  PlusOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Form,
  Input,
  Layout,
  Menu,
  Popconfirm,
  Popover,
  Row,
  Tooltip,
  Typography,
} from "antd";
import type { MenuProps } from "antd";
import { orderBy } from "es-toolkit";
import * as React from "react";
import { useLocation } from "react-router-dom";
import { useLocalStorage } from "usehooks-ts";
import {
  useDeleteSession,
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
  onDelete,
}: {
  value?: string;
  onValidate: (name: string) => unknown;
  onDelete: () => unknown;
}) => {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(value || "");
  const onSubmit = (event: React.SyntheticEvent) => {
    event.preventDefault();
    onValidate(name.trim());
    setOpen(false);
  };
  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setName(event.target.value);
  };
  const handleDelete = () => {
    setOpen(false);
    onDelete();
  };
  return (
    <Tooltip title="Edit this session">
      <Popover
        placement="right"
        open={open}
        onOpenChange={setOpen}
        content={
          <div className="session-edit">
            <Form layout="inline">
              <Form.Item>
                <Input
                  value={name}
                  onChange={onChange}
                  onPressEnter={onSubmit}
                />
              </Form.Item>
              <Form.Item>
                <Button type="primary" onClick={onSubmit}>
                  Save
                </Button>
              </Form.Item>
            </Form>
            <Popconfirm
              title="Delete this session?"
              description="Its mocks and history will be removed."
              okText="Delete"
              okButtonProps={{ danger: true }}
              placement="bottom"
              onConfirm={handleDelete}
            >
              <Button danger block icon={<DeleteOutlined />}>
                Delete session
              </Button>
            </Popconfirm>
          </div>
        }
        title="Edit session"
        trigger="click"
      >
        <EditOutlined aria-label="Edit this session" />
      </Popover>
    </Tooltip>
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

  // The API returns sessions in creation order; the last one is the latest (the session the mock
  // server serves and the only editable one). Keep that identity here so display sorting below
  // never changes which session counts as "latest".
  const latestSessionID =
    sessions.length > 0 ? sessions[sessions.length - 1].id : undefined;
  const [sortDesc, setSortDesc] = useLocalStorage("sessions.sort.desc", true);
  const sortedSessions = orderBy(
    sessions,
    [(session) => new Date(session.date).getTime()],
    [sortDesc ? "desc" : "asc"],
  );

  const { message } = App.useApp();
  const newSessionMut = useNewSession();
  const updateSessionMut = useUpdateSession();
  const deleteSessionMut = useDeleteSession();
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
  const onChangeSessionName = (session: Session) => (name: string) => {
    updateSessionMut.mutate(
      { ...session, name },
      { onSuccess: (updated) => setSelected(updated.id) },
    );
  };
  const onDeleteSession = (session: Session) => () => {
    deleteSessionMut.mutate(session.id, {
      onSuccess: () => {
        // Drop the selection; the effect above re-selects the latest remaining session.
        if (selected === session.id) {
          setSelected("");
        }
        message.success("Session deleted");
      },
      onError: (e) =>
        message.error(`Can't delete the session — ${(e as Error).message}`),
    });
  };
  const handleNewSession = () =>
    newSessionMut.mutate(undefined, {
      onSuccess: (session) => setSelected(session.id),
    });
  const handleReset = () =>
    resetMut.mutate(undefined, { onSuccess: () => setSelected("") });

  const onFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    setFileUploading(true);
    // Reset the input so selecting the same file again re-triggers onChange, and clear the
    // reading/loading state in every outcome so a failure never leaves the spinner stuck.
    const done = () => {
      setFileUploading(false);
      input.value = "";
    };
    const reader = new FileReader();
    reader.onerror = () => {
      done();
      message.error("Could not read the file.");
    };
    reader.onload = (ev: ProgressEvent<FileReader>) => {
      let sessionsToUpload: Session[];
      try {
        sessionsToUpload = JSON.parse(ev.target?.result as string);
      } catch {
        done();
        message.error("Import failed: the file is not valid JSON.");
        return;
      }
      uploadSessionsMut.mutate(sessionsToUpload, {
        onSuccess: () => {
          done();
          message.success("Sessions imported");
        },
        onError: (e) => {
          done();
          message.error(`Import failed — ${(e as Error).message}`);
        },
      });
    };
    reader.readAsText(file);
  };

  const sortToggle = (
    <Tooltip
      title={`Sort by date (${sortDesc ? "newest" : "oldest"} first)`}
      placement="right"
      mouseEnterDelay={0.5}
    >
      <a
        className="sort-toggle"
        aria-label="Sort sessions by date"
        onClick={(e) => {
          e.stopPropagation();
          setSortDesc((v) => !v);
        }}
      >
        {sortDesc ? <SortDescendingOutlined /> : <SortAscendingOutlined />}
      </a>
    </Tooltip>
  );

  const uploadControl =
    fileUploading || uploading ? (
      <label>
        <a>
          <LoadingOutlined />
        </a>
      </label>
    ) : (
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
    );
  const title: React.JSX.Element = (
    <div className="sessions-title">
      <span className="left">
        {uploadControl}
        <span>Sessions</span>
      </span>
      {sortToggle}
    </div>
  );

  const sessionItems: NonNullable<MenuProps["items"]> = sortedSessions.map(
    (session: Session) => {
      // Only the latest session is editable; the others are shown dimmed to signal their
      // read-only state (they can still be selected to inspect their mocks/history).
      const isLatest = session.id === latestSessionID;
      return {
        key: session.id,
        label: (
          <Row
            justify="space-between"
            align="middle"
            title={
              isLatest
                ? session.name || session.id
                : `${session.name || session.id} — read-only (not the latest session)`
            }
          >
            <Typography.Text
              ellipsis
              className={isLatest ? "session-name" : "session-name not-latest"}
            >
              {session.name || session.id}
            </Typography.Text>
            <EditableItem
              value={session.name}
              onValidate={onChangeSessionName(session)}
              onDelete={onDeleteSession(session)}
            />
          </Row>
        ),
      };
    },
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
      // Grow with the viewport (wider screens get a roomier sidebar) within sensible bounds.
      width="clamp(200px, 20vw, 360px)"
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
