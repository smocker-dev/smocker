import * as React from "react";
import {
  formQueryParams,
  toMultimap,
  toString,
  extractMatcher,
  usePoll
} from "~utils";
import {
  Mock,
  MockResponse,
  MockDynamicResponse,
  MockRequest,
  Mocks,
  Error,
  dateFormat
} from "~modules/types";
import { connect } from "react-redux";
import { AppState } from "~modules/reducers";
import { Dispatch } from "redux";
import { Actions, actions } from "~modules/actions";
import { withRouter, RouteComponentProps } from "react-router";
import { Settings, DateTime } from "luxon";
import { Link } from "react-router-dom";
import {
  Drawer,
  Empty,
  Button,
  Icon,
  PageHeader,
  Pagination,
  Alert,
  Tag,
  Row,
  Spin,
  Form
} from "antd";
import "./Mocks.scss";
import Code from "./Code";

Settings.defaultLocale = "en-US";

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

const emptyResponse: any = {};

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
      {response.body && <Code value={response.body.trim()} language="json" />}
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
  const methodMatcher = extractMatcher(request.method);
  const method = toString(request.method);
  const pathMatcher = extractMatcher(request.path);
  const path = toString(request.path);
  const bodyMatcher = extractMatcher(request.body);
  const headersMatcher = extractMatcher(request.headers);
  return (
    <div className="request">
      <div className="details">
        <div className="group">
          <Tag color="blue">
            {methodMatcher && <strong>{methodMatcher + ": "}</strong>}
            {method}
          </Tag>
          <span className="path">
            {pathMatcher && <strong>{pathMatcher + ": "}</strong>}
            {path + formQueryParams(request.query_params)}
          </span>
        </div>
      </div>
      {request.headers && (
        <table>
          <tbody>
            {Object.entries(toMultimap(request.headers)).map(
              ([key, values]) => (
                <tr key={key}>
                  <td>{key}</td>
                  <td>
                    {headersMatcher && <strong>{headersMatcher + ": "}</strong>}
                    {values.join(", ")}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      )}
      {request.body && (
        <>
          <strong className="body-matcher">
            {bodyMatcher && bodyMatcher + ": "}
          </strong>
          <Code value={toString(request.body)} language="json" />
        </>
      )}
    </div>
  );
};

const Mock = ({ mock }: { mock: Mock }) => {
  return (
    <div className="mock">
      <div className="meta">
        <div>
          <span className="label">ID:</span>
          <Link to={`/pages/mocks/${mock.state.id}`}>{mock.state.id}</Link>
        </div>
        <span className="date">
          {DateTime.fromISO(mock.state.creation_date).toFormat(dateFormat)}
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
  onSave,
  onClose
}: {
  onSave: (mocks: string) => void;
  onClose: () => void;
}) => {
  const [mock, changeMock] = React.useState("");
  const handleSubmit = (event: React.MouseEvent) => {
    event.preventDefault();
    onSave(mock);
  };
  const handleCancel = (event: React.MouseEvent) => {
    event.preventDefault();
    onClose();
  };
  return (
    <>
      <Form className="form">
        <Code value={mock} language="yaml" onBeforeChange={changeMock} />
      </Form>
      <div className="action buttons">
        <Button onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleSubmit} type="primary">
          Save
        </Button>
      </div>
    </>
  );
};

interface OwnProps {
  mock_id?: string;
}

interface Props extends RouteComponentProps<OwnProps> {
  sessionID: string;
  loading: boolean;
  canPoll: boolean;
  mocks: Mocks;
  error: Error | null;
  fetch: (sessionID: string) => any;
  addMocks: (sessionID: string, mocks: string) => any;
}

const Mocks = ({
  sessionID,
  match,
  loading,
  canPoll,
  mocks,
  error,
  fetch,
  addMocks
}: Props) => {
  const minPageSize = 10;
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(minPageSize);
  const [polling, togglePolling] = usePoll(10000, fetch, sessionID);
  const [displayNewMock, setDisplayNewMock] = React.useState(false);
  const ref = React.createRef<any>();
  React.useLayoutEffect(() => {
    if (ref.current) {
      ref.current.scrollIntoView({
        behavior: "smooth",
        block: "start"
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
    filteredMocks = mocks.filter(mock => {
      const mock_id = match.params.mock_id;
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
      <Row
        type="flex"
        justify="space-between"
        align="middle"
        className="container"
      >
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
        {paginatedMocks.map(mock => (
          <Mock key={`mock-${mock.state.id}`} mock={mock} />
        ))}
        {filteredMocks.length > minPageSize && pagination}
      </>
    );
  }

  const handleAddNewMock = () => setDisplayNewMock(true);
  const handleCancelNewMock = () => setDisplayNewMock(false);
  const handleSaveNewMock = (id: string) => (newMocks: string) => {
    setDisplayNewMock(false);
    addMocks(id, newMocks);
  };
  return (
    <div className="mocks" ref={ref}>
      <PageHeader
        title={match.params.mock_id ? "Mock" : "Mocks"}
        extra={
          !match.params.mock_id &&
          canPoll && (
            <div className="action buttons">
              <Button
                type="primary"
                icon="plus"
                disabled={displayNewMock}
                onClick={handleAddNewMock}
                className="add-mocks-button"
              >
                Add Mocks
              </Button>
              <Button
                loading={loading && { delay: 300 }}
                onClick={togglePolling}
                type={polling ? "danger" : "default"}
              >
                <Icon
                  type={polling ? "pause-circle" : "play-circle"}
                  theme={"filled"}
                />
                Autorefresh
              </Button>
            </div>
          )
        }
      >
        {match.params.mock_id ? (
          <p>
            This is the definition of the mock with ID{" "}
            <strong>{match.params.mock_id}</strong>.
          </p>
        ) : (
          <p>This is the list of declared mocks ordered by priority.</p>
        )}
        <Spin delay={300} spinning={loading && filteredMocks.length === 0}>
          {body}
        </Spin>
      </PageHeader>
      {displayNewMock && (
        <Drawer
          title="Add new mocks"
          placement="right"
          className="drawer"
          closable={false}
          onClose={handleCancelNewMock}
          visible={displayNewMock}
          width="70vw"
          getContainer={false}
        >
          <NewMock
            onSave={handleSaveNewMock(sessionID)}
            onClose={handleCancelNewMock}
          />
        </Drawer>
      )}
    </div>
  );
};

export default withRouter(
  connect(
    (state: AppState) => {
      const { sessions, mocks } = state;
      const canPoll =
        !sessions.selected ||
        sessions.selected === sessions.list[sessions.list.length - 1].id;
      return {
        sessionID: sessions.selected,
        loading: mocks.loading,
        mocks: mocks.list,
        error: mocks.error,
        canPoll
      };
    },
    (dispatch: Dispatch<Actions>) => ({
      fetch: (sessionID: string) =>
        dispatch(actions.fetchMocks.request(sessionID)),
      addMocks: (sessionID: string, mocks: string) =>
        dispatch(actions.addMocks.request({ sessionID, mocks }))
    })
  )(Mocks)
);
