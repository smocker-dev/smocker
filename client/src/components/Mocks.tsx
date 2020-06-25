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
  Drawer,
  Empty,
  Form,
  PageHeader,
  Pagination,
  Row,
  Spin,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import * as React from "react";
import { connect } from "react-redux";
import { Link, useParams } from "react-router-dom";
import { Dispatch } from "redux";
import { Actions, actions } from "~modules/actions";
import { AppState } from "~modules/reducers";
import {
  dateFormat,
  defaultMatcher,
  Error,
  Mock,
  MockDynamicResponse,
  MockRequest,
  MockResponse,
  Mocks,
  StringMatcher,
  StringMatcherMap,
} from "~modules/types";
import {
  bodyToString,
  formatHeaderValue,
  formatQueryParams,
  isStringMatcher,
  usePoll,
} from "~modules/utils";
import Code from "./Code";
import "./Mocks.scss";

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

const MockResponse = ({ mock }: { mock: Mock }) => {
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
      {response.body && (
        <Code value={(response.body as string).trim()} language="json" />
      )}
    </div>
  );
};

const MockDynamicResponse = ({ mock }: { mock: Mock }) => {
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

const MockProxy = ({ mock }: { mock: Mock }) => {
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

const MockRequest = ({ request }: { request: MockRequest }) => {
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

const Mock = ({
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
          <Link to={`/pages/mocks/${mock.state.id}`}>{mock.state.id}</Link>
        </div>
        <span className="date">
          {dayjs(mock.state.creation_date).format(dateFormat)}
        </span>
      </div>
      <div className="content">
        <MockRequest request={mock.request} />
        {mock.response && <MockResponse mock={mock} />}
        {mock.dynamic_response && <MockDynamicResponse mock={mock} />}
        {mock.proxy && <MockProxy mock={mock} />}
      </div>
    </div>
  );
};

const NewMock = ({
  display,
  defaultValue,
  onSave,
  onClose,
}: {
  display: boolean;
  defaultValue: string;
  onSave: (mocks: string) => unknown;
  onClose: () => unknown;
}) => {
  const [mock, changeMock] = React.useState(defaultValue);
  const handleSubmit = () => {
    onSave(mock);
  };
  return (
    <Drawer
      title="Add new mocks"
      placement="right"
      className="drawer"
      closable={false}
      onClose={onClose}
      visible={display}
      width="70vw"
      getContainer={false}
      footer={
        <div className="action buttons">
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} type="primary">
            Save
          </Button>
        </div>
      }
    >
      <Form className="form">
        <Code
          value={mock}
          language="yaml"
          onBeforeChange={changeMock}
          collapsible={false}
        />
      </Form>
    </Drawer>
  );
};

interface RouteProps {
  mock_id?: string;
}

interface Props {
  sessionID: string;
  loading: boolean;
  canPoll: boolean;
  mocks: Mocks;
  mockEditor: [boolean, string];
  error: Error | null;
  fetch: (sessionID: string) => unknown;
  addMocks: (mocks: string) => unknown;
  lockMock: (mockID: string) => unknown;
  unlockMock: (mockID: string) => unknown;
  setDisplayNewMock: (display: boolean, defaultValue: string) => unknown;
}

const Mocks = ({
  sessionID,
  loading,
  canPoll,
  mocks,
  mockEditor,
  error,
  fetch,
  addMocks,
  lockMock,
  unlockMock,
  setDisplayNewMock,
}: Props) => {
  const minPageSize = 10;

  React.useEffect(() => {
    document.title = "Mocks | Smocker";
  });
  const { mock_id } = useParams<RouteProps>();
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(minPageSize);
  const [polling, togglePolling] = usePoll(10000, fetch, sessionID);
  const ref = React.createRef<HTMLDivElement>();
  const displayNewMock = mockEditor[0];
  React.useLayoutEffect(() => {
    if (ref.current) {
      ref.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [page, pageSize]);
  const isEmpty = mocks.length === 0;
  let filteredMocks = mocks;
  let body = null;
  if (error) {
    body = <Alert message={error.message} type="error" />;
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
    const onChangePagSize = (p: number, ps: number) => {
      setPage(p);
      setPageSize(ps);
    };
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
    body = (
      <>
        {pagination}
        {paginatedMocks.map((mock) => (
          <Mock
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

  const handleAddNewMock = () => setDisplayNewMock(true, "");
  const handleCancelNewMock = () => setDisplayNewMock(false, "");
  const handleSaveNewMock = (newMocks: string) => {
    setDisplayNewMock(false, "");
    addMocks(newMocks);
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
                disabled={displayNewMock}
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
      {displayNewMock && (
        <NewMock
          display={displayNewMock}
          defaultValue={mockEditor[1]}
          onSave={handleSaveNewMock}
          onClose={handleCancelNewMock}
        />
      )}
    </div>
  );
};

export default connect(
  (state: AppState) => {
    const { sessions, mocks } = state;
    const canPoll =
      !sessions.selected ||
      sessions.selected === sessions.list[sessions.list.length - 1].id;
    return {
      sessionID: sessions.selected,
      loading: mocks.loading,
      mocks: mocks.list,
      mockEditor: mocks.editor,
      error: mocks.error,
      canPoll,
    };
  },
  (dispatch: Dispatch<Actions>) => ({
    fetch: (sessionID: string) =>
      dispatch(actions.fetchMocks.request(sessionID)),
    addMocks: (mocks: string) => dispatch(actions.addMocks.request({ mocks })),
    lockMock: (mockID: string) => dispatch(actions.lockMocks.request([mockID])),
    unlockMock: (mockID: string) =>
      dispatch(actions.unlockMocks.request([mockID])),
    setDisplayNewMock: (display: boolean, defaultValue: string) =>
      dispatch(actions.openMockEditor([display, defaultValue])),
  })
)(Mocks);
