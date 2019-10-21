import * as React from "react";
import { Multimap, StringMatcher, MultimapMatcher } from "~utils";

export interface Entry {
  request: EntryRequest;
  response: EntryResponse;
}

export interface EntryRequest {
  path: string;
  method: string;
  body?: any;
  query_params?: Multimap;
  headers?: Multimap;
  date: string;
}

export interface EntryResponse {
  status: number;
  body?: any;
  headers?: Multimap;
  date: string;
}

export interface Mock {
  request: MockRequest;
  response?: MockResponse;
  dynamic_response?: MockDynamicResponse;
  context: MockContext;
  state: MockState;
}

export interface MockRequest {
  path: string | StringMatcher;
  method: string | StringMatcher;
  body?: string | StringMatcher;
  query_params?: Multimap | MultimapMatcher;
  headers?: Multimap | MultimapMatcher;
}

export interface MockResponse {
  status: number;
  body?: any;
  headers?: Multimap;
}

export interface MockDynamicResponse {
  engine: string;
  script: string;
}

export interface MockContext {
  times?: number;
}

export interface MockState {
  times_count: number;
}

const Context = React.createContext({
  history: [] as Entry[],
  setHistory: (history: Entry[]) => {
    return;
  },
  mocks: [] as Mock[],
  setMocks: (mocks: Mock[]) => {
    return;
  }
});

export default Context;
