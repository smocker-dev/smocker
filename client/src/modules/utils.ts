import { Entry } from "./types";

export function entryToCurl(historyEntry: Entry) {
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
}
