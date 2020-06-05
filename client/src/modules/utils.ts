import omit from "lodash/omit";
import pickBy from "lodash/pickBy";
import trimEnd from "lodash/trimEnd";
import * as React from "react";
import {
  BodyMatcher,
  defaultMatcher,
  Entry,
  EntryRequest,
  Multimap,
  MultimapMatcher,
  StringMatcher,
  StringMatcherSlice,
} from "./types";

export const entryToCurl = (historyEntry: Entry): string => {
  const escape = (unsafe: string) => unsafe.replace(/'/g, "\\'");

  const command = ["curl"];
  let host = "";

  const { request } = historyEntry;
  command.push(`-X${request.method}`);

  if (request.headers) {
    command.push(
      ...Object.entries(request.headers).flatMap((entry) => {
        const [key, values] = entry;

        if (key.toLowerCase() === "host") {
          if (values.length > 0) {
            host = values[0];
          }

          // Don't add Host to the headers
          return [];
        }

        return values.map(
          (value) => `--header '${escape(key)}: ${escape(value)}'`
        );
      })
    );
  }

  let queryString = "";
  if (request.query_params && Object.keys(request.query_params).length > 0) {
    queryString = "?";
    queryString += Object.entries(request.query_params)
      .flatMap((entry) => {
        const [key, values] = entry;
        return values.map((value) => `${key}=${value}`);
      })
      .join("&");
  }
  command.push(
    `'${escape(host)}${escape(request.path)}${escape(queryString)}'`
  );

  if (request.body) {
    command.push(`--data '${escape(JSON.stringify(request.body))}'`);
  }

  return command.join(" ");
};

function simplifyMultimap(multimap: { [x: string]: string[] }) {
  return Object.entries(multimap).reduce((newMultimap, [key, values]) => {
    if (values.length === 0) {
      return newMultimap;
    }
    if (values.length === 1) {
      newMultimap[key] = values[0];
      return newMultimap;
    }
    newMultimap[key] = [...values];
    return newMultimap;
  }, {});
}

export const cleanupRequest = (historyEntry: Entry): EntryRequest => {
  let request: EntryRequest = { ...historyEntry.request };
  if (historyEntry.request.headers) {
    request.headers = simplifyMultimap(historyEntry.request.headers);
    // remove useless headers
    request.headers = omit(request.headers, [
      "Accept",
      "Accept-Encoding",
      "Accept-Language",
      "Connection",
      "Dnt",
      "Upgrade-Insecure-Requests",
      "User-Agent",
    ]);
  }
  if (historyEntry.request.query_params) {
    request.query_params = simplifyMultimap(historyEntry.request.query_params);
  }
  request = omit(request, "date") as EntryRequest;
  request = pickBy(request) as EntryRequest; // remove nulls
  return request;
};

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
