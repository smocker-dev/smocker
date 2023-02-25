import { useEffect, useState } from "react";
import {
  BodyMatcherType,
  defaultMatcher,
  EntryRequestType,
  MatcherType,
  MockContextType,
  MockProxyType,
  MockRequestType,
  MockResponseType,
  MockType,
  MultimapMatcherType,
  MultimapType,
  StringMatcherMapType,
  StringMatcherSliceType,
  StringMatcherType
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

export const isStringMatcher = (body?: BodyMatcherType): boolean => {
  if (!body) {
    return false;
  }
  if (typeof body === "string") {
    return true;
  }
  if (body["matcher"]) {
    return true;
  }
  return false;
};

export const asMatcher = (matcher: StringMatcherType): MatcherType => {
  if (typeof matcher === "string") {
    return { matcher: defaultMatcher, value: matcher };
  }
  return matcher;
};

export const asMatcherSlice = (
  matcher: StringMatcherType | StringMatcherSliceType
): StringMatcherSliceType => {
  if (!Array.isArray(matcher)) {
    return [matcher];
  }
  return matcher;
};

export const asStringArray = (value: string | string[]): string[] => {
  if (typeof value === "string") {
    return [value];
  }
  return value;
};

export const bodyToString = (body?: BodyMatcherType): string => {
  if (!body) {
    return "";
  }
  if (typeof body === "string") {
    return body;
  }
  if (body["matcher"]) {
    return (body["value"] as string).trim();
  }
  return "";
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

const trimMatcher = (matcher: StringMatcherType): StringMatcherType => {
  const m = asMatcher(matcher);
  if (m.matcher === defaultMatcher) {
    matcher = m.value;
  }
  return matcher;
};

const trimMatcherSlice = (
  matcher?: StringMatcherSliceType
): StringMatcherSliceType | undefined => {
  if (!matcher) {
    return matcher;
  }
  return matcher.map(m => trimMatcher(m));
};

const trimMatcherMap = (
  matcher?: StringMatcherMapType
): StringMatcherMapType | undefined => {
  if (!matcher) {
    return matcher;
  }
  if (!Object.keys(matcher).length) {
    return undefined;
  }
  const newMatcher: StringMatcherMapType = {};
  Object.entries(matcher).forEach(([key, value]) => {
    newMatcher[key] = trimMatcher(value);
  });
  return newMatcher;
};

const trimMatcherMultimap = (
  matcher?: MultimapMatcherType
): MultimapMatcherType | undefined => {
  if (!matcher) {
    return matcher;
  }

  const newMatcher: MultimapMatcherType = {};
  Object.entries(matcher).forEach(([key, value]) => {
    const slice = trimMatcherSlice(asMatcherSlice(value));
    if (slice?.length) {
      if (slice?.length === 1) {
        newMatcher[key] = slice[0];
      } else {
        newMatcher[key] = slice;
      }
    }
  });

  if (!Object.keys(newMatcher).length) {
    return undefined;
  }
  return newMatcher;
};

const trimMultimap = (multimap?: MultimapType): MultimapType | undefined => {
  if (!multimap) {
    return multimap;
  }

  const newMultimap: MultimapType = {};
  Object.entries(multimap).forEach(([key, value]) => {
    const slice = asStringArray(value);
    if (slice?.length) {
      if (slice?.length === 1) {
        newMultimap[key] = slice[0];
      } else {
        newMultimap[key] = slice;
      }
    }
  });

  if (!Object.keys(newMultimap).length) {
    return undefined;
  }
  return newMultimap;
};

const trimBodyMatcher = (
  matcher?: BodyMatcherType
): BodyMatcherType | undefined => {
  if (!matcher) {
    return matcher;
  }
  if (typeof matcher === "string" || "matcher" in matcher) {
    return trimMatcher(matcher as StringMatcherType);
  }
  return trimMatcherMap(matcher);
};

const trimRequest = (request: MockRequestType): MockRequestType => {
  request.method = trimMatcher(request.method);
  request.path = trimMatcher(request.path);
  request.query_params = trimMatcherMultimap(request.query_params);
  request.headers = trimMatcherMultimap(request.headers);
  request.body = trimBodyMatcher(request.body);
  return request;
};

const trimContext = (
  context?: MockContextType
): MockContextType | undefined => {
  if (!context || !context.times) {
    return undefined;
  }
  return context;
};

const trimStaticResponse = (
  response?: MockResponseType
): MockResponseType | undefined => {
  if (!response) {
    return undefined;
  }
  response.headers = trimMultimap(response.headers);
  return response;
};

const trimProxyResponse = (
  response?: MockProxyType
): MockProxyType | undefined => {
  if (!response) {
    return undefined;
  }
  response.headers = trimMultimap(response.headers);
  response.follow_redirect = Boolean(response.follow_redirect) || undefined;
  response.skip_verify_tls = Boolean(response.skip_verify_tls) || undefined;
  response.keep_host = Boolean(response.keep_host) || undefined;
  return response;
};

export const trimMock = (mock: MockType): MockType => {
  mock.request = trimRequest(mock.request);
  mock.context = trimContext(mock.context);
  mock.response = trimStaticResponse(mock.response);
  mock.proxy = trimProxyResponse(mock.proxy);
  return mock;
};

export const useDebounce = <T>(value: T, delay?: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay || 500);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
};
