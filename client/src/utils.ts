import { trimEnd } from "lodash-es";

export interface Multimap {
  [key: string]: string[];
}

export const formQueryParams = (params?: Multimap) => {
  if (!params) return "";
  return Object.keys(params)
    .reduce((acc: string[], key) => {
      params[key].forEach(value => {
        acc.push(key + "=" + encodeURIComponent(value));
      });
      return acc;
    }, [])
    .join("&");
};

export const trimedPath = trimEnd(window.basePath, "/");
