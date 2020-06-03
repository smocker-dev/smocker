import trimEnd from "lodash/trimEnd";
import * as React from "react";
import {
  BodyMatcher,
  Multimap,
  MultimapMatcher,
  StringMatcher,
  StringMatcherSlice,
} from "~modules/types";

export const extractMatcher = (s?: StringMatcher): string | undefined => {
  if (!s) {
    return undefined;
  }
  const matcher = s["matcher"];
  if (matcher) {
    return matcher;
  }
  return undefined;
};

export const isStringMatcher = (body: BodyMatcher): boolean => {
  if (typeof body === "string") {
    return true;
  }
  if ((body as StringMatcher)["matcher"]) {
    return true;
  }
  return false;
};

export const toString = (s: BodyMatcher): string => {
  if ((s as StringMatcher)["matcher"]) {
    return (s as StringMatcher)["value"].trim();
  }
  return (s as string).trim();
};

export const formatQueryParams = (params?: MultimapMatcher | Multimap) => {
  if (!params) {
    return "";
  }
  const res =
    "?" +
    Object.keys(params)
      .reduce((acc: string[], key) => {
        const values = !(params[key] instanceof Array)
          ? ([params[key]] as string[])
          : (params[key] as StringMatcherSlice);
        values.forEach((v) => {
          const value = v["value"] || v;
          const encodedValue = encodeURIComponent(value);
          const param = v["matcher"]
            ? `${key}=>(${v["matcher"]} ${encodedValue})`
            : `${key}=${encodedValue}`;
          acc.push(param);
        });
        return acc;
      }, [])
      .join("&");
  return res;
};

export const formatHeaderValue = (
  headerValue?: StringMatcher | StringMatcherSlice
) => {
  if (!headerValue) {
    return "";
  }
  const res = (!(headerValue instanceof Array)
    ? [headerValue]
    : (headerValue as StringMatcher[])
  )
    .reduce((acc: string[], v) => {
      const value = v["value"] || v;
      const param = v["matcher"] ? `${v["matcher"]}: ${value}` : `${value}`;
      acc.push(param);
      return acc;
    }, [])
    .join(", ");
  return res;
};

export const trimedPath = trimEnd(window.basePath, "/");

export type PollFunc = (params: any) => any;

export function usePoll(
  delay: number,
  pollFunc: PollFunc,
  pollParams?: any
): [boolean, () => void, (poll: boolean) => void] {
  const savedPollFunc = React.useRef<PollFunc>();
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
