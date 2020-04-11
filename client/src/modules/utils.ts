import { Entry } from "./types";

export function entryToCurl(historyEntry: Entry) {
  const escape = (unsafe: string) => unsafe.replace(/'/g, "\\'");

  const command = ["curl"];

  const { request } = historyEntry;
  command.push(`-X${request.method}`);

  if (request.headers) {
    const a = Object.entries(request.headers).flatMap((entry) => {
      const [key, values] = entry;
      return values.map(
        (value) => `--header '${escape(key)}: ${escape(value)}'`
      );
    });
    command.push(...a);
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
  command.push(`'${escape(request.path)}${escape(queryString)}'`);

  if (request.body) {
    command.push(`--data '${escape(request.body)}'`);
  }

  return command.join(" ");
}
