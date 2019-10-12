import { AxiosRequestConfig } from "axios";
import useAxios, { RefetchOptions, ResponseValues } from "axios-hooks";
import { trimEnd } from "lodash-es";
import * as React from "react";

export interface Multimap {
  [key: string]: string[];
}

export const formQueryParams = (params?: Multimap) => {
  if (!params) return "";
  return Object.keys(params)
    .reduce((acc: string[], key) => {
      params[key].forEach(value => {
        acc.push(key + "=" + encodeURIComponent(value));
      });
      return acc;
    }, [])
    .join("&");
};

export const trimedPath = trimEnd(window.basePath, "/");

type RefetchFunc = (
  config?: AxiosRequestConfig,
  options?: RefetchOptions
) => void;

export function usePollAPI<T = any>(
  config: AxiosRequestConfig | string,
  delay?: number
): [ResponseValues<T>, Boolean?, (() => void)?] {
  const [response, refetch] = useAxios<T>(config, { manual: true });
  const savedRefetch = React.useRef<RefetchFunc>();
  const [init, setInit] = React.useState(false);
  const [poll, setPoll] = React.useState(false);

  // Remember the latest function.
  React.useEffect(() => {
    savedRefetch.current = refetch;
  }, [refetch]);

  // Set up the interval.
  React.useEffect(() => {
    function fetch() {
      savedRefetch.current && savedRefetch.current();
    }
    (!init || poll) && fetch();
    if (poll && Boolean(delay)) {
      let id = setInterval(fetch, delay);
      return () => clearInterval(id);
    }
  }, [delay, poll, init]);

  const togglePoll = React.useCallback(() => {
    setPoll(!poll);
    setInit(true);
  }, [poll]);
  return [response, poll, togglePoll];
}
