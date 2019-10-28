import { ActionType, createAsyncAction } from "typesafe-actions";
import { Error, History, Mocks } from "./types";

const fetchHistory = createAsyncAction(
  "@APP/HISTORY/FETCH",
  "@APP/HISTORY/FETCH/SUCCESS",
  "@APP/HISTORY/FETCH/FAILURE"
)<void, History, Error>();

const fetchMocks = createAsyncAction(
  "@APP/MOCKS/FETCH",
  "@APP/MOCKS/FETCH/SUCCESS",
  "@APP/MOCKS/FETCH/FAILURE"
)<void, Mocks, Error>();

const addMocks = createAsyncAction(
  "@APP/MOCKS/ADD",
  "@APP/MOCKS/ADD/SUCCESS",
  "@APP/MOCKS/ADD/FAILURE"
)<string, void, Error>();

const reset = createAsyncAction(
  "@APP/RESET",
  "@APP/RESET/SUCCESS",
  "@APP/RESET/FAILURE"
)<void, void, Error>();

export const actions = {
  fetchHistory,
  fetchMocks,
  addMocks,
  reset
};

export type Actions = ActionType<typeof actions>;
