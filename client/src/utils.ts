import trimEnd from "lodash/trimEnd";
import * as React from "react";
import {
  BodyMatcher,
  defaultMatcher,
  Multimap,
  MultimapMatcher,
  StringMatcher,
  StringMatcherSlice,
} from "~modules/types";

export const isStringMatcher = (body?: BodyMatcher): boolean => {
  if (!body) {
    return false;
  }
  if ((body as StringMatcher).matcher) {
    return true;
  }
  return false;
};

export const bodyToString = (body?: BodyMatcher): string => {
  if (!body) {
    return "";
  }
  if ((body as StringMatcher).matcher) {
    return (body as StringMatcher).value.trim();
  }
  return "";
};

export const formatQueryParams = (
  params?: MultimapMatcher | Multimap
): string => {
  if (!params) {
    return "";
  }
  const res =
    "?" +
    Object.keys(params)
      .reduce((acc: string[], key) => {
        params[key].forEach((v: StringMatcher | string) => {
          const value = v["value"] || v;
          const encodedValue = encodeURIComponent(value);
          const param =
            v["matcher"] && v["matcher"] !== defaultMatcher
              ? `${key}=>(${v["matcher"]} "${encodedValue}")`
              : `${key}=${encodedValue}`;
          acc.push(param);
        });
        return acc;
      }, [])
      .join("&");
  return res;
};

export const formatHeaderValue = (headerValue?: StringMatcherSlice): string => {
  if (!headerValue) {
    return "";
  }
  const res = headerValue
    .reduce((acc: string[], v) => {
      const param =
        v.matcher !== defaultMatcher
          ? `${v.matcher}: "${v.value}"`
          : `${v.value}`;
      acc.push(param);
      return acc;
    }, [])
    .join(", ");
  return res;
};

export const trimedPath = trimEnd(window.basePath, "/");

export type PollFunc<X, Y> = (params: X) => Y;

export function usePoll<K, V>(
  delay: number,
  pollFunc: PollFunc<K, V>,
  pollParams: K
): [boolean, () => void, (poll: boolean) => void] {
  const savedPollFunc = React.useRef<PollFunc<K, V>>();
  const [init, setInit] = React.useState(false);
  const [polling, setPolling] = React.useState(false);

  // Remember the latest function.
  React.useEffect(() => {
    savedPollFunc.current = pollFunc;
  }, [pollFunc]);

  // Set up the interval.
  React.useEffect(() => {
    function poll() {
      if (savedPollFunc.current) {
        savedPollFunc.current(pollParams);
      }
    }
    if (!init || polling) {
      poll();
    }
    if (polling && Boolean(delay)) {
      const id = setInterval(poll, delay);
      return () => clearInterval(id);
    }
  }, [delay, polling, init, pollParams]);

  const togglePollingCb = React.useCallback(() => {
    setPolling(!polling);
    setInit(true);
  }, [polling]);

  const setPollingCb = React.useCallback((poll: boolean) => {
    setPolling(poll);
    setInit(true);
  }, []);

  return [polling, togglePollingCb, setPollingCb];
}
