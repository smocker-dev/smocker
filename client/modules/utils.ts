import { omit, pickBy } from "lodash";
import {
  asMatcher,
  asMatcherSlice,
  BodyMatcherType,
  defaultMatcher,
  EntryRequestType,
  EntryResponseType,
  EntryType,
  MockType,
  MultimapMatcherType,
  MultimapType,
  StringMatcherSliceType,
  StringMatcherType,
  trimMock,
  trimMultimap
} from "./types";

export const unaryMatchers = ["ShouldBeEmpty", "ShouldNotBeEmpty"];

export const positiveMatchers = [
  "ShouldEqual",
  "ShouldMatch",
  "ShouldContainSubstring",
  "ShouldBeEmpty",
  "ShouldStartWith",
  "ShouldEndWith"
];

export const negativeMatchers = [
  "ShouldNotEqual",
  "ShouldNotMatch",
  "ShouldNotBeEmpty",
  "ShouldNotContainSubstring",
  "ShouldNotStartWith",
  "ShouldNotEndWith"
];

export const allMatchers = [...positiveMatchers, ...negativeMatchers];

export const defaultMock: MockType = {
  request: {
    method: { matcher: defaultMatcher, value: "GET" },
    path: { matcher: defaultMatcher, value: "" }
  },
  response: {
    status: 200
  }
};

export const sortNumber = (a: number, b: number) => {
  return a - b;
};

export const sortByDate = (isAsc: boolean) => (
  a: { date: string },
  b: { date: string }
) => {
  const aDate = new Date(a.date).getTime();
  const bDate = new Date(b.date).getTime();
  return isAsc ? aDate - bDate : bDate - aDate;
};

export const requestToCurl = (request: EntryRequestType): string => {
  const escapeQuote = (unsafe: string) => unsafe.replace(/'/g, "\\'");

  const command = ["curl"];
  let host = "";

  command.push(`-X${request.method}`);

  if (request.headers) {
    command.push(
      ...Object.entries(request.headers).flatMap(header => {
        const [key, values] = header;

        if (key.toLowerCase() === "host") {
          if (values.length > 0) {
            host = values[0];
          }

          // Don't add Host to the headers
          return [];
        }

        if (typeof values === "string") {
          return [`--header '${escapeQuote(key)}: ${escapeQuote(values)}'`];
        }

        return values.map(
          value => `--header '${escapeQuote(key)}: ${escapeQuote(value)}'`
        );
      })
    );
  }

  let queryString = "";
  if (request.query_params && Object.keys(request.query_params).length > 0) {
    queryString = "?";
    queryString += Object.entries(request.query_params)
      .flatMap(entry => {
        const [key, values] = entry;
        return typeof values === "string"
          ? [`${key}=${values}`]
          : values.map(value => `${key}=${value}`);
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

export const formatQueryParams = (
  params?: MultimapMatcherType | MultimapType
): string => {
  if (!params) {
    return "";
  }
  return (
    "?" +
    Object.keys(params)
      .reduce((acc: string[], key) => {
        const tmp = params[key];
        const values = typeof tmp === "string" ? [tmp] : tmp;
        asMatcherSlice(values).forEach(v => {
          const matcher = asMatcher(v);
          const encodedValue = encodeURIComponent(matcher.value);
          const param =
            matcher.matcher == defaultMatcher
              ? `${key}=${encodedValue}`
              : `${key}=>(${matcher.matcher} "${encodedValue}")`;
          acc.push(param);
        });
        return acc;
      }, [])
      .join("&")
  );
};

export const formatHeaderValue = (
  headerValue?: StringMatcherType | StringMatcherSliceType
): string => {
  if (!headerValue) {
    return "";
  }
  const values = asMatcherSlice(headerValue);
  return values
    .reduce((acc: string[], v) => {
      const matcher = asMatcher(v);
      const param =
        matcher.matcher !== defaultMatcher
          ? `${matcher.matcher}: "${matcher.value}"`
          : `${matcher.value}`;
      acc.push(param);
      return acc;
    }, [])
    .join(", ");
};

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
  "User-Agent"
];

// Convert a body matcher to a list of paths compatible with objx:
//  - keys are dot separated
//  - array indices are accessed with []
// Example: foo.bar[0].baz represents a key of the following object:
//   {"foo": {"bar": [{"baz": "Hello"}]}}
export const bodyToBodyMatcherPaths = (
  bodyMatcher: unknown | Record<string, unknown>,
  currentPath = "",
  result: Record<string, unknown> = {}
): Record<string, unknown> => {
  if (Array.isArray(bodyMatcher)) {
    bodyMatcher.forEach((item, index) => {
      bodyToBodyMatcherPaths(item, `${currentPath}[${index}]`, result);
    });
    return result;
  } else if (typeof bodyMatcher === "object" && bodyMatcher !== null) {
    Object.entries(bodyMatcher).forEach(([key, value]) => {
      bodyToBodyMatcherPaths(
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

const cleanupRequest = (
  entryRequest: EntryRequestType
): Partial<EntryRequestType> => {
  let request: Partial<EntryRequestType> = { ...entryRequest };
  request.query_params = trimMultimap(request.query_params);
  request.headers = trimMultimap(omit(request.headers, headersToClean));
  request = omit(request, "body_string");
  request = omit(request, "date");
  request = omit(request, "origin");
  request = pickBy(request); // remove nulls
  if (typeof request.body === "object" && request.body !== null) {
    request.body = bodyToBodyMatcherPaths(request.body);
  }
  return request;
};

const cleanupResponse = (
  entryResponse: EntryResponseType
): Partial<EntryResponseType> => {
  let response: Partial<EntryResponseType> = { ...entryResponse };
  response.headers = trimMultimap(omit(response.headers, headersToClean));
  response = omit(response, "date");
  response = pickBy(response); // remove nulls
  return response;
};

export const mockFromEntry = (entry: EntryType): MockType => {
  const request = cleanupRequest(entry.request);
  const mock: MockType = {
    request: {
      method: request.method || "GET",
      path: request.path || "",
      headers: request.headers,
      query_params: request.query_params,
      body: request.body as BodyMatcherType
    },
    response: {
      // Sane default response
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: ""
    }
  };
  if (entry.response.status < 600) {
    const response = cleanupResponse(entry.response);
    mock.response = {
      status: response.status || 200,
      headers: response.headers,
      body: JSON.stringify(response.body, undefined, "  ")
    };
  }
  return trimMock(mock);
};
