import {
  BodyMatcherType,
  defaultMatcher,
  EntryRequestType,
  MultimapMatcherType,
  MultimapType,
  StringMatcherType
} from "./types";

export const entryToCurl = (request: EntryRequestType): string => {
  const escapeQuote = (unsafe: string) => unsafe.replace(/'/g, "\\'");

  const command = ["curl"];
  let host = "";

  command.push(`-X${request.method}`);

  if (request.headers) {
    command.push(
      ...Object.entries(request.headers).flatMap(entry => {
        const [key, values] = entry;

        if (key.toLowerCase() === "host") {
          if (values.length > 0) {
            host = values[0];
          }

          // Don't add Host to the headers
          return [];
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
        return values.map(value => `${key}=${value}`);
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
  if ((body as StringMatcherType).matcher) {
    return true;
  }
  return false;
};

export const bodyToString = (body?: BodyMatcherType): string => {
  if (!body) {
    return "";
  }
  if ((body as StringMatcherType).matcher) {
    return (body as StringMatcherType).value.trim();
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
        params[key].forEach((v: StringMatcherType | string) => {
          const value = typeof v === "string" ? v : v.value;
          const encodedValue = encodeURIComponent(value);
          const param =
            typeof v === "string" || v.matcher == defaultMatcher
              ? `${key}=${encodedValue}`
              : `${key}=>(${v.matcher} "${encodedValue}")`;
          acc.push(param);
        });
        return acc;
      }, [])
      .join("&")
  );
};
