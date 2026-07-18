import {
  LockFilled,
  PauseCircleFilled,
  PlayCircleFilled,
  PlusOutlined,
  UnlockFilled,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Empty,
  Pagination,
  Row,
  Spin,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import * as React from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
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
              request.body as StringMatcherMap
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
}: {
  mock: Mock;
  canPoll: boolean;
  loading: boolean;
  lockMock: (mockID: string) => unknown;
  unlockMock: (mockID: string) => unknown;
}) => {
  const onLockMock = () => lockMock(mock.state.id);
  const onUnlockMock = () => unlockMock(mock.state.id);
  // Keep the current query string (notably ?session) so navigating to a single mock stays in
  // the same session and the browser back button returns to the full list.
  const { search } = useLocation();
  return (
    <div className="mock">
      <div className="meta">
        <div>
          {mock.state.locked ? (
            <Button
              danger
              type="link"
              icon={<LockFilled />}
              loading={loading}
              title="Locked, click to unlock"
              disabled={!canPoll}
              onClick={onUnlockMock}
            />
          ) : (
            <Button
              type="link"
              icon={<UnlockFilled />}
              loading={loading}
              title="Unlocked, click to lock"
              disabled={!canPoll}
              onClick={onLockMock}
            />
          )}
          <span className="label">ID:</span>
          <Link to={{ pathname: `/pages/mocks/${mock.state.id}`, search }}>
            {mock.state.id}
          </Link>
        </div>
        <span className="date">
          {dayjs(mock.state.creation_date).format(dateFormat)}
        </span>
      </div>
      <div className="content">
        <MockRequestComponent request={mock.request} />
        {mock.response && <MockResponseComponent mock={mock} />}
        {mock.dynamic_response && <MockDynamicResponseComponent mock={mock} />}
        {mock.proxy && <MockProxyComponent mock={mock} />}
      </div>
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
  const { selected: sessionID } = useSession();
  const { data: sessions = [] } = useSessionsSummary();
  const canPoll =
    !sessionID ||
    (sessions.length > 0 && sessionID === sessions[sessions.length - 1].id);

  // Pagination — kept in the URL query (?page, ?page-size) so a given page is shareable.
  const [queryParams, setQueryParams] = useQueryParams();
  const page = Math.max(1, Number(queryParams.get("page")) || 1);
  const pageSize = Number(queryParams.get("page-size")) || minPageSize;
  const setPage = (p: number) => setQueryParams({ page: String(p) });
  const setPageAndSize = (p: number, ps: number) =>
    setQueryParams({ page: String(p), "page-size": String(ps) });
  const [polling, setPolling] = React.useState(false);

  const mocksQuery = useMocks(sessionID, {
    refetchInterval: polling ? 10000 : false,
  });
  const mocks = mocksQuery.data ?? [];
  const loading = mocksQuery.isFetching;
  const error = mocksQuery.error;

  const lockMocksMut = useLockMocks();
  const unlockMocksMut = useUnlockMocks();

  const initialNewMock = (location.state as { newMock?: string } | null)
    ?.newMock;
  // Value of the mock creation drawer, or null when it is closed.
  const [newMockValue, setNewMockValue] = React.useState<string | null>(
    initialNewMock ?? null
  );

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
  const isEmpty = mocks.length === 0;
  let filteredMocks = mocks;
  let body = null;
  if (error) {
    body = <Alert message={error.message} type="error" showIcon />;
  } else if (isEmpty) {
    body = <Empty description="No mocks found." />;
  } else {
    filteredMocks = mocks.filter((mock) => {
      return !mock_id || mock.state.id === mock_id;
    });
    const paginatedMocks = filteredMocks.slice(
      Math.max((page - 1) * pageSize, 0),
      Math.min(page * pageSize, mocks.length)
    );
    const onChangePage = (p: number) => setPage(p);
    const onChangePagSize = (p: number, ps: number) => setPageAndSize(p, ps);
    const pagination = (
      <Row justify="space-between" align="middle" className="container">
        <div>
          <Pagination
            hideOnSinglePage={filteredMocks.length <= minPageSize}
            showSizeChanger
            pageSize={pageSize}
            current={page}
            onChange={onChangePage}
            onShowSizeChange={onChangePagSize}
            total={filteredMocks.length}
          />
        </div>
        <Spin
          spinning={loading}
          className={filteredMocks.length <= minPageSize ? "absolute" : ""}
        />
      </Row>
    );
    const lockMock = (mockID: string) => lockMocksMut.mutate([mockID]);
    const unlockMock = (mockID: string) => unlockMocksMut.mutate([mockID]);
    body = (
      <>
        {pagination}
        {paginatedMocks.map((mock) => (
          <MockComponent
            key={`mock-${mock.state.id}`}
            mock={mock}
            canPoll={canPoll}
            loading={loading}
            lockMock={lockMock}
            unlockMock={unlockMock}
          />
        ))}
        {filteredMocks.length > minPageSize && pagination}
      </>
    );
  }

  const handleAddNewMock = () => setNewMockValue("");
  const handleCloseNewMock = () => setNewMockValue(null);
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
        <Spin delay={300} spinning={loading && filteredMocks.length === 0}>
          {body}
        </Spin>
      </PageHeader>
      {newMockValue !== null && (
        <NewMock defaultValue={newMockValue} onClose={handleCloseNewMock} />
      )}
    </div>
  );
};

export default MocksComponent;
