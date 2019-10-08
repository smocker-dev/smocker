import * as React from 'react';
import useAxios from 'axios-hooks'
import classNames from 'classnames';
import './Mocks.scss'
import { formQueryParams, Multimap, trimedPath } from '~utils';

interface Mock {
  request: Request;
  response?: Response;
  dynamic_response?: DynamicResponse;
  context: Context;
  state: State;
}

interface Request {
  path: string;
  method: string;
  body?: string;
  query_params?: Multimap;
  headers?: Multimap;
}

interface Response {
  status: number;
  body?: any;
  headers?: Multimap;
}

interface DynamicResponse {
  engine: string;
  script: string;
}

interface Context {
  times?: number;
}

interface State {
  times_count: number;
}

const MockResponse = (response: Response) => (
  <div className='response'>
    <span className={classNames('status', { 'info': response.status !== 666 }, { 'failure': response.status === 666 })}>
      {response.status}
    </span>
    {response.headers && (
      <table>
        <tbody>
          {Object.entries(response.headers).map(([key, values]) => (
            <tr key={key} >
              <td>{key}</td>
              <td>{values.join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
    <pre className='body'>
      <code className='json'>
        {response.body ? JSON.stringify(response.body, undefined, "  ") : ""}
      </code>
    </pre>
  </div>
);

const MockDynamicResponse = (response: DynamicResponse) => (
  <div className='response'>
    <span className='engine info'>Engine: </span>
    <span>{response.engine}</span>
    <pre className='script'>
      <code className='json'>
        {response.script}
      </code>
    </pre>
  </div>
);

const Mock = ({ value }: { value: Mock }) => (
  <div className='mock'>
    <div className='request'>
      <span className='method'>{value.request.method}</span>
      <span className='path'>{value.request.path + formQueryParams(value.request.query_params)}</span>
      {value.request.headers && (
        <table>
          <tbody>
            {Object.entries(value.request.headers).map(([key, values]) => (
              <tr key={key} >
                <td>{key}</td>
                <td>{values.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
    {value.response && MockResponse(value.response)}
    {value.dynamic_response && MockDynamicResponse(value.dynamic_response)}
  </div>
)

const MockList = () => {
  const [{ data, loading, error }] = useAxios<Mock[]>(
    trimedPath + '/mocks'
  )
  if (loading) return null;
  if (error) return <div>{error}</div>;
  if (!Boolean(data.length)) return <div className='empty'><h3>No mocks found</h3></div>
  return (
    <div className="list">
      {data.map((mock, index) => (
        <Mock key={`mock-${index}`} value={mock} />
      ))}
    </div>
  )
}

export const Mocks = () => {

  return (
    <div className='mocks'>
      <React.Suspense fallback={(
        <div className='dimmer'>
          <div className="loader" />
        </div>
      )}>
        <MockList />
      </React.Suspense>
    </div>
  )
}
