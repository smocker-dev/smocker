import omit from "lodash/omit";
import pickBy from "lodash/pickBy";
import trimEnd from "lodash/trimEnd";
import * as React from "react";
import { useHistory } from "react-router-dom";
import {
  BodyMatcher,
  defaultMatcher,
  Entry,
  EntryRequest,
  EntryResponse,
  Multimap,
  MultimapMatcher,
  StringMatcher,
  StringMatcherSlice,
} from "./types";

export const entryToCurl = (historyEntry: Entry): string => {
  const escapeQuote = (unsafe: string) => unsafe.replace(/'/g, "\\'");

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
          (value) => `--header '${escapeQuote(key)}: ${escapeQuote(value)}'`
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
    `'${escapeQuote(host)}${escapeQuote(request.path)}${escapeQuote(
      queryString
    )}'`
  );

  if (request.body) {
    command.push(`--data '${escapeQuote(JSON.stringify(request.body))}'`);
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

const headersToClean = [
  "Accept",
  "Accept-Encoding",
  "Accept-Language",
  "Connection",
  "Content-Length",
  "Date",
  "Dnt",
  "If-None-Match",
  "Sec-Fetch-Dest",
  "Sec-Fetch-Mode",
  "Sec-Fetch-Site",
  "Te",
  "Upgrade-Insecure-Requests",
  "User-Agent",
];

export const cleanupRequest = (historyEntry: Entry): EntryRequest => {
  let request: EntryRequest = { ...historyEntry.request };
  if (historyEntry.request.headers) {
    request.headers = simplifyMultimap(historyEntry.request.headers);
    // remove useless headers
    request.headers = omit(request.headers, headersToClean);
  }
  if (historyEntry.request.query_params) {
    request.query_params = simplifyMultimap(historyEntry.request.query_params);
  }
  request = omit(request, "body_string") as EntryRequest;
  request = omit(request, "date") as EntryRequest;
  request = omit(request, "origin") as EntryRequest;
  request = pickBy(request) as EntryRequest; // remove nulls
  return request;
};

export const cleanupResponse = (historyEntry: Entry): EntryResponse => {
  let response: EntryResponse = { ...historyEntry.response };
  if (historyEntry.response.headers) {
    response.headers = simplifyMultimap(historyEntry.response.headers);
    // remove useless headers
    response.headers = omit(response.headers, headersToClean);
  }
  response = omit(response, "date") as EntryResponse;
  response = pickBy(response) as EntryResponse; // remove nulls
  return response;
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
  return (
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
      .join("&")
  );
};

export const formatHeaderValue = (headerValue?: StringMatcherSlice): string => {
  if (!headerValue) {
    return "";
  }
  return headerValue
    .reduce((acc: string[], v) => {
      const param =
        v.matcher !== defaultMatcher
          ? `${v.matcher}: "${v.value}"`
          : `${v.value}`;
      acc.push(param);
      return acc;
    }, [])
    .join(", ");
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
    return undefined;
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

export const useQueryParams = (): [
  URLSearchParams,
  (params: Record<string, string>, replace?: boolean) => void
] => {
  const history = useHistory();
  const queryParams = new URLSearchParams(history.location.search);
  const setQueryParams = React.useCallback(
    (params: Record<string, string>, replace = false) => {
      const newQueryParams = new URLSearchParams(history.location.search);
      Object.entries(params).forEach(([key, value]) => {
        newQueryParams.set(key, value);
      });
      if (replace) {
        history.replace({ search: newQueryParams.toString() });
      } else {
        history.push({ search: newQueryParams.toString() });
      }
    },
    []
  );

  return [queryParams, setQueryParams];
};

export const cleanQueryParams = <T extends { search: string }>(
  location: T
): T => {
  const queryParams = new URLSearchParams(location.search);
  const newQueryParams = new URLSearchParams();
  const sessionQueryParam = queryParams.get("session");
  if (sessionQueryParam) {
    newQueryParams.set("session", sessionQueryParam);
  }
  return { ...location, search: newQueryParams.toString() };
};
