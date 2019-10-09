import { AxiosRequestConfig } from "axios";
import useAxios, { Options, RefetchOptions, ResponseValues } from "axios-hooks";
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
  options?: Options,
  delay?: number
): [ResponseValues<T>] {
  const [response, refetch] = useAxios<T>(config, options);
  const savedRefetch = React.useRef<RefetchFunc>();

  // Remember the latest function.
  React.useEffect(() => {
    savedRefetch.current = refetch;
  }, [refetch]);

  // Set up the interval.
  React.useEffect(() => {
    function tick() {
      savedRefetch.current && savedRefetch.current();
    }
    if (delay !== undefined) {
      let id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
  return [response];
}
