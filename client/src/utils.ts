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
  const matcher = (s as StringMatcher).matcher;
  if (matcher) {
    return matcher;
  }
  return undefined;
};

export const toString = (s: StringMatcher | string): string => {
  if ((s as StringMatcher).matcher) {
    return (s as StringMatcher).value.trim();
  }
  return (s as string).trim();
};

export const toMultimap = (multimap: MultimapMatcher | Multimap) => {
  return (multimap.values || multimap) as Multimap;
};

export const formQueryParams = (params?: MultimapMatcher | Multimap) => {
  if (!params) {
    return "";
  }

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

export type RefetchFunc = (
  config?: AxiosRequestConfig,
  options?: RefetchOptions
) => void;

export interface Poll {
  polling: boolean;
  togglePolling: () => void;
  refetch: RefetchFunc;
}

export function usePollAPI<T = any>(
  config: AxiosRequestConfig | string,
  delay?: number
): [ResponseValues<T>, Poll] {
  const [response, refetch] = useAxios<T>(config, { manual: true });
  const savedRefetch = React.useRef<RefetchFunc>();
  const [init, setInit] = React.useState(false);
  const [polling, setPolling] = React.useState(false);

  // Remember the latest function.
  React.useEffect(() => {
    savedRefetch.current = refetch;
  }, [refetch]);

  // Set up the interval.
  React.useEffect(() => {
    function fetch() {
      if (savedRefetch.current) {
        savedRefetch.current();
      }
    }
    if (!init || polling) {
      fetch();
    }
    if (polling && Boolean(delay)) {
      const id = setInterval(fetch, delay);
      return () => clearInterval(id);
    }
  }, [delay, polling, init]);

  const togglePolling = React.useCallback(() => {
    setPolling(!polling);
    setInit(true);
  }, [polling]);
  return [response, { polling, togglePolling, refetch }];
}
