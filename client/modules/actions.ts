import { ActionType, createAction, createAsyncAction } from "typesafe-actions";
import {
  GraphHistory,
  History,
  Mocks,
  Session,
  Sessions,
  SmockerError,
} from "./types";

const fetchSessions = createAsyncAction(
  "@APP/SESSIONS/FETCH",
  "@APP/SESSIONS/FETCH/SUCCESS",
  "@APP/SESSIONS/FETCH/FAILURE"
)<void, Sessions, SmockerError>();

const newSession = createAsyncAction(
  "@APP/SESSIONS/NEW",
  "@APP/SESSIONS/NEW/SUCCESS",
  "@APP/SESSIONS/NEW/FAILURE"
)<void, Session, SmockerError>();

const updateSession = createAsyncAction(
  "@APP/SESSIONS/UPDATE",
  "@APP/SESSIONS/UPDATE/SUCCESS",
  "@APP/SESSIONS/UPDATE/FAILURE"
)<Session, Session, SmockerError>();

const uploadSessions = createAsyncAction(
  "@APP/SESSIONS/UPLOAD",
  "@APP/SESSIONS/UPLOAD/SUCCESS",
  "@APP/SESSIONS/UPLOAD/FAILURE"
)<Sessions, Sessions, SmockerError>();

const selectSession = createAction("@APP/SESSIONS/SELECT")<string>();

const openMockEditor = createAction("@APP/MOCKEDITOR/OPEN")<
  [boolean, string]
>();

const fetchHistory = createAsyncAction(
  "@APP/HISTORY/FETCH",
  "@APP/HISTORY/FETCH/SUCCESS",
  "@APP/HISTORY/FETCH/FAILURE"
)<string, History, SmockerError>();

const summarizeHistory = createAsyncAction(
  "@APP/HISTORY/SUMMARIZE",
  "@APP/HISTORY/SUMMARIZE/SUCCESS",
  "@APP/HISTORY/SUMMARIZE/FAILURE"
)<
  { sessionID: string; src: string; dest: string },
  GraphHistory,
  SmockerError
>();

const fetchMocks = createAsyncAction(
  "@APP/MOCKS/FETCH",
  "@APP/MOCKS/FETCH/SUCCESS",
  "@APP/MOCKS/FETCH/FAILURE"
)<string, Mocks, SmockerError>();

export interface NewMocks {
  mocks: string;
}

const addMocks = createAsyncAction(
  "@APP/MOCKS/ADD",
  "@APP/MOCKS/ADD/SUCCESS",
  "@APP/MOCKS/ADD/FAILURE"
)<NewMocks, void, SmockerError>();

const lockMocks = createAsyncAction(
  "@APP/MOCKS/LOCK",
  "@APP/MOCKS/LOCK/SUCCESS",
  "@APP/MOCKS/LOCK/FAILURE"
)<string[], Mocks, SmockerError>();

const unlockMocks = createAsyncAction(
  "@APP/MOCKS/UNLOCK",
  "@APP/MOCKS/UNLOCK/SUCCESS",
  "@APP/MOCKS/UNLOCK/FAILURE"
)<string[], Mocks, SmockerError>();

const reset = createAsyncAction(
  "@APP/RESET",
  "@APP/RESET/SUCCESS",
  "@APP/RESET/FAILURE"
)<void, void, SmockerError>();

export const actions = {
  fetchSessions,
  newSession,
  updateSession,
  selectSession,
  openMockEditor,
  uploadSessions,
  fetchHistory,
  summarizeHistory,
  fetchMocks,
  addMocks,
  lockMocks,
  unlockMocks,
  reset,
};

export type Actions = ActionType<typeof actions>;
