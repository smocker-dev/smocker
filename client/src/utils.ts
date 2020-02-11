import { trimEnd } from "lodash-es";
import * as React from "react";
import { Multimap, MultimapMatcher, StringMatcher } from "~modules/types";

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

export type PollFunc = (params: any) => any;

export function usePoll(
  delay: number,
  pollFunc: PollFunc,
  pollParams?: any
): [boolean, () => void] {
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

  const togglePolling = React.useCallback(() => {
    setPolling(!polling);
    setInit(true);
  }, [polling]);
  return [polling, togglePolling];
}
