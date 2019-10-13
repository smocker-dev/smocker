import { AxiosRequestConfig } from "axios";
import useAxios, { RefetchOptions, ResponseValues } from "axios-hooks";
import { trimEnd } from "lodash-es";
import * as React from "react";

export interface Multimap {
  [key: string]: string[];
}

export interface StringMatcher {
  matcher: string;
  value: string;
}

export interface MultimapMatcher {
  matcher: string;
  values: Multimap;
}

export const extractMatcher = (
  s?: StringMatcher | string | MultimapMatcher | Multimap
): string | undefined => {
  if (!s) {
    return undefined;
  }
  const matcher = (<StringMatcher>s).matcher;
  if (matcher) {
    return matcher;
  }
  return undefined;
};

export const toString = (s: StringMatcher | string): string => {
  if ((<StringMatcher>s).matcher) {
    return (<StringMatcher>s).value.trim();
  }
  return (s as string).trim();
};

export const toMultimap = (multimap: MultimapMatcher | Multimap) => {
  return (multimap.values || multimap) as Multimap;
};

export const formQueryParams = (params?: MultimapMatcher | Multimap) => {
  if (!params) return "";

  const values = toMultimap(params);
  let res =
    "?" +
    Object.keys(values)
      .reduce((acc: string[], key) => {
        values[key].forEach(value => {
          acc.push(key + "=" + encodeURIComponent(value));
        });
        return acc;
      }, [])
      .join("&");
  if (extractMatcher(params)) {
    res = res + ` (${extractMatcher(params)})`;
  }
  return res;
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
