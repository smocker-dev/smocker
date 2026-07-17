import { debounce, omit, pickBy, trimEnd } from "es-toolkit";
import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  return Object.entries(multimap).reduce<Record<string, string | string[]>>(
    (newMultimap, [key, values]) => {
      if (values.length === 0) {
        return newMultimap;
      }
      if (values.length === 1) {
        newMultimap[key] = values[0];
        return newMultimap;
      }
      newMultimap[key] = [...values];
      return newMultimap;
    },
    {}
  );
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
    request.headers = simplifyMultimap(historyEntry.request.headers) as Multimap;
    // remove useless headers
    request.headers = omit(request.headers, headersToClean);
  }
  if (historyEntry.request.query_params) {
    request.query_params = simplifyMultimap(
      historyEntry.request.query_params
    ) as Multimap;
  }
  request = omit(request as Record<string, unknown>, [
    "body_string",
    "date",
    "origin",
  ]) as EntryRequest;
  request = pickBy(request, (value) => Boolean(value)) as EntryRequest; // remove nulls
  if (typeof request.body === "object" && request.body !== null) {
    request.body = bodyMatcherToPaths(request.body);
  }
  return request;
};

// Convert a body matcher to a list of paths compatible with objx:
//  - keys are dot separated
//  - array indices are accessed with []
// Example: foo.bar[0].baz represents a key of the following object:
//   {"foo": {"bar": [{"baz": "Hello"}]}}
export const bodyMatcherToPaths = (
  bodyMatcher: unknown | Record<string, unknown>,
  currentPath = "",
  result: Record<string, unknown> = {}
): Record<string, unknown> => {
  if (Array.isArray(bodyMatcher)) {
    bodyMatcher.forEach((item, index) => {
      bodyMatcherToPaths(item, `${currentPath}[${index}]`, result);
    });
    return result;
  } else if (typeof bodyMatcher === "object" && bodyMatcher !== null) {
    Object.entries(bodyMatcher).forEach(([key, value]) => {
      bodyMatcherToPaths(
        value,
        currentPath ? `${currentPath}.${key}` : `${key}`,
        result
      );
    });
    return result;
  } else {
    result[currentPath] = bodyMatcher;
    return result;
  }
};

export const cleanupResponse = (historyEntry: Entry): EntryResponse => {
  let response: EntryResponse = { ...historyEntry.response };
  if (historyEntry.response.headers) {
    response.headers = simplifyMultimap(
      historyEntry.response.headers
    ) as Multimap;
    // remove useless headers
    response.headers = omit(response.headers, headersToClean);
  }
  response = omit(response as Record<string, unknown>, [
    "date",
  ]) as EntryResponse;
  response = pickBy(response, (value) => Boolean(value)) as EntryResponse; // remove nulls
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
        (params[key] as (StringMatcher | string)[]).forEach((v) => {
          const matcher = typeof v === "object" ? v.matcher : undefined;
          const rawValue = typeof v === "object" ? v.value : v;
          const encodedValue = encodeURIComponent(rawValue);
          const param =
            matcher && matcher !== defaultMatcher
              ? `${key}=>(${matcher} "${encodedValue}")`
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

// window.basePath is injected by the Go index.html template at runtime; guard against it being
// undefined (e.g. in tests) — es-toolkit's trimEnd throws on undefined, unlike lodash's.
export const trimedPath = trimEnd(window.basePath ?? "", "/");

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const update = debounce(() => setDebounced(value), delay);
    update();
    return () => update.cancel();
  }, [value, delay]);

  return debounced;
}

export const useQueryParams = (): [
  URLSearchParams,
  (params: Record<string, string>, replace?: boolean) => void
] => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const setQueryParams = React.useCallback(
    (params: Record<string, string>, replace = false) => {
      const newQueryParams = new URLSearchParams(window.location.search);
      Object.entries(params).forEach(([key, value]) => {
        newQueryParams.set(key, value);
      });
      // Preserve the current react-router location state (e.g. the mock prefilled into the
      // editor via "Create a new mock from entry"): a query-only navigation must not discard it.
      navigate(
        { search: newQueryParams.toString() },
        { replace, state: window.history.state?.usr ?? null }
      );
    },
    [navigate]
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
