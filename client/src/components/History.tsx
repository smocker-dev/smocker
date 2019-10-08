import * as React from 'react';
import useAxios from 'axios-hooks'
import classNames from 'classnames';
import './History.scss'
import { Multimap, formQueryParams, trimedPath } from '~utils';

interface Entry {
  request: Request;
  response: Response;
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

const Entry = ({ value }: { value: Entry }) => (
  <div className='entry'>
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
    <div className='response'>
      <span className={classNames('status', { 'info': value.response.status !== 666 }, { 'failure': value.response.status === 666 })}>
        {value.response.status}
      </span>
      {value.response.headers && (
        <table>
          <tbody>
            {Object.entries(value.response.headers).map(([key, values]) => (
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
          {value.response.body ? JSON.stringify(value.response.body, undefined, "  ") : ""}
        </code>
      </pre>
    </div>
  </div>
)

const EntryList = () => {
  const [{ data, loading, error }] = useAxios<Entry[]>(
    trimedPath + '/history'
  )
  if (loading) return null;
  if (error) return <div>{error}</div>;
  if (!Boolean(data.length)) return <div className='empty'><h3>No entry found</h3></div>
  return (
    <div className="list">
      {data.map((entry, index) => (
        <Entry key={`entry-${index}`} value={entry} />
      ))}
    </div>
  )
}

export const History = () => {

  return (
    <div className='history'>
      <React.Suspense fallback={(
        <div className='dimmer'>
          <div className="loader" />
        </div>
      )}>
        <EntryList />
      </React.Suspense>
    </div>
  )
}
