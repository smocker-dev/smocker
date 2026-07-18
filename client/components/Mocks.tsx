import {
  CodeOutlined,
  DeleteOutlined,
  EditOutlined,
  LockFilled,
  PauseCircleFilled,
  PlayCircleFilled,
  PlusOutlined,
  ProfileOutlined,
  SearchOutlined,
  UnlockFilled,
} from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  Empty,
  Input,
  Pagination,
  Popconfirm,
  Row,
  Spin,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { dump } from "js-yaml";
import * as React from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  useDeleteHistory,
  useDeleteMock,
  useHistory,
  useLockMocks,
  useMocks,
  useSessionsSummary,
  useUnlockMocks,
} from "../modules/api";
import { useSession } from "../modules/session";
import {
  dateFormat,
  defaultMatcher,
  Mock,
  MockDynamicResponse,
  MockRequest,
  MockResponse,
  StringMatcher,
  StringMatcherMap,
} from "../modules/types";
import {
  bodyToString,
  formatHeaderValue,
  formatQueryParams,
  isStringMatcher,
  scrollToPage,
  useQueryParams,
} from "../modules/utils";
import Code from "./Code";
import NewMock from "./NewMock";
import "./Mocks.scss";
import PageHeader from "./PageHeader";

const renderTimes = (count: number, expected?: number) => {
  if (!expected) {
    return <strong>{"Times: " + count}</strong>;
  }
  if (count > expected) {
    return (
      <strong>
        {"Times: "}
        <strong className="wrong">{count}</strong>/{expected}
      </strong>
    );
  }
  return <strong>{`Times: ${count}/${expected}`}</strong>;
};

const emptyResponse: unknown = {};

// Lowercased, whitespace-joined view of a mock's searchable fields, used by the filter box.
const mockHaystack = (mock: Mock): string =>
  [
    mock.state.id,
    mock.request?.method?.value,
    mock.request?.path?.value,
    typeof mock.response?.body === "string" ? mock.response.body : "",
    mock.dynamic_response?.engine,
    mock.proxy?.host,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const MockResponseComponent = ({ mock }: { mock: Mock }) => {
  const { response: resp, context, state } = mock;
  const response = resp ? resp : (emptyResponse as MockResponse);

  return (
    <div className="response">
      <div className="details">
        <Tag color="blue">{response.status || 200}</Tag>
        {renderTimes(state.times_count, context.times)}
      </div>
      {response.headers && (
        <table>
          <tbody>
            {Object.entries(response.headers).map(([key, values]) => (
              <tr key={key}>
                <td>{key}</td>
                <td>{values.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {response.body ? (
        <Code value={(response.body as string).trim()} language="json" />
      ) : null}
    </div>
  );
};

const MockDynamicResponseComponent = ({ mock }: { mock: Mock }) => {
  const { dynamic_response, context, state } = mock;
  const response = dynamic_response
    ? dynamic_response
    : (emptyResponse as MockDynamicResponse);

  return (
    <div className="response">
      <div className="details">
        <div className="group">
          <Tag color="blue">Engine</Tag>
          <span>
            <strong>{response.engine}</strong>
          </span>
        </div>
        {renderTimes(state.times_count, context.times)}
      </div>
      <Code value={response.script} language={response.engine} />
    </div>
  );
};

const MockProxyComponent = ({ mock }: { mock: Mock }) => {
  const { proxy, context, state } = mock;
  const host = proxy ? proxy.host : "";
  return (
    <div className="response">
      <div className="details">
        <div className="group">
          <Tag color="blue">Redirect To</Tag>
          <span>
            <strong>{host}</strong>
          </span>
        </div>
        {renderTimes(state.times_count, context.times)}
      </div>
    </div>
  );
};

const MockRequestComponent = ({ request }: { request: MockRequest }) => {
  const showMethodMatcher = request.method.matcher !== defaultMatcher;
  const showPathMatcher = request.path.matcher !== defaultMatcher;
  const isBodyStringMatcher = isStringMatcher(request.body);
  const showBody = isBodyStringMatcher && bodyToString(request.body);
  const path =
    (showPathMatcher
      ? `Path: ${request.path.matcher} "${request.path.value}"`
      : request.path.value) + formatQueryParams(request.query_params);
  return (
    <div className="request">
      <div className="details">
        <div className="group">
          <Tag color="blue">
            {showMethodMatcher
              ? `Method: ${request.method.matcher} "${request.method.value}"`
              : request.method.value}
          </Tag>
          <Typography.Text className="path" ellipsis title={path}>
            {path}
          </Typography.Text>
        </div>
      </div>
      {request.headers && (
        <table>
          <tbody>
            {Object.entries(request.headers).map(([key, sliceMatcher]) => (
              <tr key={key}>
                <td>{key}</td>
                <td>{formatHeaderValue(sliceMatcher)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {request.body && isBodyStringMatcher && (
        <>
          <strong className="body-matcher">
            {`Body ${request.body["matcher"]}`}
          </strong>
          {showBody && (
            <Code value={bodyToString(request.body)} language="json" />
          )}
        </>
      )}
      {request.body && !isBodyStringMatcher && (
        <>
          <strong className="body-matcher">{"In Body"}</strong>
          <ul>
            {Object.entries<StringMatcher>(
              request.body as StringMatcherMap,
            ).map(([key, value]) => (
              <li key={key}>
                <strong>{`${key}`}</strong>
                {`: ${value.matcher} "${value.value}"`}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

const MockComponent = ({
  mock,
  canPoll,
  loading,
  lockMock,
  unlockMock,
  editable,
  readOnlyHint,
  deleting,
  onEdit,
  onDelete,
}: {
  mock: Mock;
  canPoll: boolean;
  loading: boolean;
  lockMock: (mockID: string) => unknown;
  unlockMock: (mockID: string) => unknown;
  // A mock can be edited or deleted only while the session has received no calls yet.
  editable: boolean;
  // Why editing is disabled, shown as the tooltip on the read-only controls.
  readOnlyHint: string;
  deleting: boolean;
  onEdit: (mock: Mock) => unknown;
  onDelete: (mockID: string) => unknown;
}) => {
  const onLockMock = () => lockMock(mock.state.id);
  const onUnlockMock = () => unlockMock(mock.state.id);
  const [showYaml, setShowYaml] = React.useState(false);
  // Keep the current query string (notably ?session) so navigating to a single mock stays in
  // the same session and the browser back button returns to the full list.
  const { search } = useLocation();
  return (
    <div className="mock">
      <div className="meta">
        <div>
          {mock.state.locked ? (
            <Tooltip title={canPoll ? "Unlock this mock" : readOnlyHint}>
              {/* span wrapper so the tooltip still shows when the button is disabled */}
              <span className="lock-wrap">
                <Button
                  danger
                  type="link"
                  icon={<LockFilled />}
                  loading={loading}
                  aria-label="Unlock this mock"
                  disabled={!canPoll}
                  onClick={onUnlockMock}
                />
              </span>
            </Tooltip>
          ) : (
            <Tooltip title={canPoll ? "Lock this mock" : readOnlyHint}>
              <span className="lock-wrap">
                <Button
                  type="link"
                  icon={<UnlockFilled />}
                  loading={loading}
                  aria-label="Lock this mock"
                  disabled={!canPoll}
                  onClick={onLockMock}
                />
              </span>
            </Tooltip>
          )}
          <span className="label">ID:</span>
          <Link to={{ pathname: `/pages/mocks/${mock.state.id}`, search }}>
            {mock.state.id}
          </Link>
        </div>
        <div className="actions">
          {/* Viewing the raw YAML is always available (not gated by editability). */}
          <span className="mock-buttons">
            <Tooltip title={showYaml ? "View formatted" : "View as YAML"}>
              <Button
                type="link"
                icon={showYaml ? <ProfileOutlined /> : <CodeOutlined />}
                aria-label={showYaml ? "View formatted" : "View as YAML"}
                onClick={() => setShowYaml((v) => !v)}
              />
            </Tooltip>
          </span>
          {editable ? (
            <span className="mock-buttons">
              <Tooltip title="Edit this mock">
                <Button
                  type="link"
                  icon={<EditOutlined />}
                  aria-label="Edit this mock"
                  onClick={() => onEdit(mock)}
                />
              </Tooltip>
              <Tooltip title="Delete this mock">
                <Popconfirm
                  title="Delete this mock?"
                  okText="Delete"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => onDelete(mock.state.id)}
                >
                  <Button
                    type="link"
                    danger
                    icon={<DeleteOutlined />}
                    loading={deleting}
                    aria-label="Delete this mock"
                  />
                </Popconfirm>
              </Tooltip>
            </span>
          ) : (
            // Not editable: keep the controls visible but disabled, with a tooltip stating why
            // (either this isn't the latest session, or the session has calls in its history).
            <Tooltip title={readOnlyHint}>
              <span className="mock-buttons">
                <Button
                  type="link"
                  icon={<EditOutlined />}
                  aria-label="Edit this mock"
                  disabled
                />
                <Button
                  type="link"
                  danger
                  icon={<DeleteOutlined />}
                  aria-label="Delete this mock"
                  disabled
                />
              </span>
            </Tooltip>
          )}
          <span className="date">
            {dayjs(mock.state.creation_date).format(dateFormat)}
          </span>
        </div>
      </div>
      {showYaml ? (
        <div className="content yaml">
          <Code value={dump([mock])} language="yaml" collapsible={false} />
        </div>
      ) : (
        <div className="content">
          <MockRequestComponent request={mock.request} />
          {mock.response && <MockResponseComponent mock={mock} />}
          {mock.dynamic_response && (
            <MockDynamicResponseComponent mock={mock} />
          )}
          {mock.proxy && <MockProxyComponent mock={mock} />}
        </div>
      )}
    </div>
  );
};

interface RouteProps {
  mock_id?: string;
  [key: string]: string | undefined;
}

const MocksComponent = (): React.JSX.Element => {
  const minPageSize = 10;

  React.useEffect(() => {
    document.title = "Mocks | Smocker";
  });
  const { mock_id } = useParams<RouteProps>();
  const location = useLocation();
  const { selected: sessionID, setSelected } = useSession();
  const { data: sessions = [] } = useSessionsSummary();
  const latestSession =
    sessions.length > 0 ? sessions[sessions.length - 1] : undefined;
  // Only the latest session is editable: it is the one the mock server actually serves, and
  // locking/adding/editing operate on it. Editing an older session's mocks would have no effect.
  const canPoll = !sessionID || sessionID === latestSession?.id;

  // Pagination and search — kept in the URL query (?page, ?page-size, ?search) so a given view
  // is shareable.
  const [queryParams, setQueryParams] = useQueryParams();
  const page = Math.max(1, Number(queryParams.get("page")) || 1);
  const pageSize = Number(queryParams.get("page-size")) || minPageSize;
  const search = queryParams.get("search") ?? "";
  const setPage = (p: number) => setQueryParams({ page: String(p) });
  const setPageAndSize = (p: number, ps: number) =>
    setQueryParams({ page: String(p), "page-size": String(ps) });
  // Store the query in the URL and reset to the first page. Replace (not push) so typing doesn't
  // flood the browser history with a stack of one-character-apart entries.
  const onSearch = (value: string) =>
    setQueryParams({ search: value, page: "1" }, true);
  const [polling, setPolling] = React.useState(false);

  const mocksQuery = useMocks(sessionID, {
    refetchInterval: polling ? 10000 : false,
  });
  const mocks = mocksQuery.data ?? [];
  const loading = mocksQuery.isFetching;
  const error = mocksQuery.error;

  // A mock may be edited/deleted only while the session has received no calls (empty history),
  // matching the append-only guarantee the history relies on. Require the history query to have
  // resolved first, so the controls don't flash on sessions that actually have calls.
  const historyQuery = useHistory(sessionID);
  const hasCalls = historyQuery.isSuccess && historyQuery.data.length > 0;
  const editable = canPoll && historyQuery.isSuccess && !hasCalls;
  // The two reasons a mock can be read-only, in priority order. Reused for the notice banner and
  // the disabled controls' tooltips so the UI always states *why* editing is blocked.
  const notLatestReason =
    "Only the latest session can be edited — it's the one the mock server serves.";
  const hasCallsReason =
    "This session has calls in its history, so its mocks are read-only.";
  const readOnlyHint = !canPoll ? notLatestReason : hasCallsReason;

  const { message } = App.useApp();
  const lockMocksMut = useLockMocks();
  const unlockMocksMut = useUnlockMocks();
  const deleteMockMut = useDeleteMock();
  const clearHistoryMut = useDeleteHistory();

  const initialNewMock = (location.state as { newMock?: string } | null)
    ?.newMock;
  // Value of the mock creation/edition drawer, or null when it is closed. editMockId is set when
  // the drawer edits an existing mock (PUT) rather than creating a new one (POST).
  const [newMockValue, setNewMockValue] = React.useState<string | null>(
    initialNewMock ?? null,
  );
  const [editMockId, setEditMockId] = React.useState<string | null>(null);

  const togglePolling = () => setPolling((p) => !p);
  const ref = React.useRef<HTMLDivElement>(null);
  const prevPageRef = React.useRef(page);
  const prevPageSizeRef = React.useRef(pageSize);
  React.useLayoutEffect(() => {
    const sizeChanged = pageSize !== prevPageSizeRef.current;
    const goingBack = !sizeChanged && page < prevPageRef.current;
    prevPageRef.current = page;
    prevPageSizeRef.current = pageSize;
    return scrollToPage(ref.current, goingBack);
  }, [page, pageSize]);
  // Open the drawer pre-filled with the mock (without its server-managed state) in edit mode.
  const handleEditMock = (mock: Mock) => {
    const { state: _state, ...definition } = mock;
    setEditMockId(mock.state.id);
    setNewMockValue(dump([definition]));
  };
  const handleDeleteMock = (mockID: string) =>
    deleteMockMut.mutate(
      { sessionID, id: mockID },
      {
        onSuccess: () => message.success("Mock deleted"),
        onError: (e) => message.error(`Can't delete — ${(e as Error).message}`),
      },
    );
  const goToLatestSession = () => {
    if (latestSession) {
      setSelected(latestSession.id);
      setQueryParams({ session: latestSession.id });
    }
  };
  const handleClearHistory = () =>
    clearHistoryMut.mutate(
      { sessionID },
      {
        onSuccess: () =>
          message.success("Session history cleared — mocks are editable"),
        onError: (e) =>
          message.error(`Can't clear history — ${(e as Error).message}`),
      },
    );

  const isEmpty = mocks.length === 0;
  let filteredMocks = mocks;
  let body = null;
  if (error) {
    body = <Alert message={error.message} type="error" showIcon />;
  } else if (isEmpty) {
    body = <Empty description="No mocks found." />;
  } else {
    const needle = search.trim().toLowerCase();
    filteredMocks = mocks.filter((mock) => {
      if (mock_id && mock.state.id !== mock_id) {
        return false;
      }
      return !needle || mockHaystack(mock).includes(needle);
    });
    const paginatedMocks = filteredMocks.slice(
      Math.max((page - 1) * pageSize, 0),
      Math.min(page * pageSize, filteredMocks.length),
    );
    const onChangePage = (p: number) => setPage(p);
    const onChangePagSize = (p: number, ps: number) => setPageAndSize(p, ps);
    const paginationEl = (
      <Pagination
        hideOnSinglePage={filteredMocks.length <= minPageSize}
        showSizeChanger
        pageSize={pageSize}
        current={page}
        onChange={onChangePage}
        onShowSizeChange={onChangePagSize}
        total={filteredMocks.length}
      />
    );
    // Top toolbar: search on the left, pagination (and the loading spinner) on the right.
    const topBar = (
      <Row justify="space-between" align="middle" className="container toolbar">
        <Input
          allowClear
          className="list-search"
          placeholder="Filter mocks by method, path, id…"
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
        <div className="pagination">
          {paginationEl}
          <Spin spinning={loading} />
        </div>
      </Row>
    );
    const bottomBar = (
      <Row justify="end" align="middle" className="container">
        {paginationEl}
      </Row>
    );
    const lockMock = (mockID: string) => lockMocksMut.mutate([mockID]);
    const unlockMock = (mockID: string) => unlockMocksMut.mutate([mockID]);
    body = (
      <>
        {!mock_id && topBar}
        {filteredMocks.length === 0 && (
          <Empty description="No mocks match the filter." />
        )}
        {paginatedMocks.map((mock) => (
          <MockComponent
            key={`mock-${mock.state.id}`}
            mock={mock}
            canPoll={canPoll}
            loading={loading}
            lockMock={lockMock}
            unlockMock={unlockMock}
            editable={editable}
            readOnlyHint={readOnlyHint}
            deleting={deleteMockMut.isPending}
            onEdit={handleEditMock}
            onDelete={handleDeleteMock}
          />
        ))}
        {filteredMocks.length > minPageSize && bottomBar}
      </>
    );
  }

  const handleAddNewMock = () => {
    setEditMockId(null);
    setNewMockValue("");
  };
  const handleCloseNewMock = () => {
    setNewMockValue(null);
    setEditMockId(null);
  };
  return (
    <div className="mocks" ref={ref}>
      <PageHeader
        title={mock_id ? "Mock" : "Mocks"}
        extra={
          !mock_id &&
          canPoll && (
            <div className="action buttons">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                disabled={newMockValue !== null}
                onClick={handleAddNewMock}
                className="add-mocks-button"
              >
                Add Mocks
              </Button>
              <Button
                loading={loading}
                onClick={togglePolling}
                danger={polling}
                icon={polling ? <PauseCircleFilled /> : <PlayCircleFilled />}
              >
                Autorefresh
              </Button>
            </div>
          )
        }
      >
        {mock_id ? (
          <p>
            This is the definition of the mock with ID{" "}
            <strong>{mock_id}</strong>.
          </p>
        ) : (
          <p>This is the list of declared mocks ordered by priority.</p>
        )}
        {!mock_id &&
          !canPoll &&
          latestSession &&
          latestSession.id !== sessionID && (
            <Alert
              type="warning"
              showIcon
              className="edit-locked-notice"
              style={{ marginBottom: "1em" }}
              message={notLatestReason}
              action={
                <Button size="small" onClick={goToLatestSession}>
                  Switch to the latest session
                </Button>
              }
            />
          )}
        {!mock_id && canPoll && hasCalls && !isEmpty && (
          <Alert
            type="info"
            showIcon
            className="edit-locked-notice"
            style={{ marginBottom: "1em" }}
            message={hasCallsReason}
            action={
              <Popconfirm
                title="Clear the session history?"
                description="Mock call counters reset; the mocks themselves are kept."
                okText="Yes, clear"
                onConfirm={handleClearHistory}
              >
                <Button size="small" loading={clearHistoryMut.isPending}>
                  Clear history
                </Button>
              </Popconfirm>
            }
          />
        )}
        <Spin delay={300} spinning={loading && filteredMocks.length === 0}>
          {body}
        </Spin>
      </PageHeader>
      {newMockValue !== null && (
        <NewMock
          defaultValue={newMockValue}
          editId={editMockId ?? undefined}
          sessionId={sessionID}
          onClose={handleCloseNewMock}
        />
      )}
    </div>
  );
};

export default MocksComponent;
