import { combineEpics, Epic } from "redux-observable";
import { of } from "rxjs";
import { ajax } from "rxjs/ajax";
import { catchError, exhaustMap, filter, map, mergeMap } from "rxjs/operators";
import { isActionOf } from "typesafe-actions";
import { trimedPath } from "~utils";
import { Actions, actions } from "./actions";
import {
  decode,
  HistoryCodec,
  MocksCodec,
  SessionCodec,
  SessionsCodec
} from "./types";

const {
  fetchSessions,
  newSession,
  updateSession,
  uploadSessions,
  fetchHistory,
  fetchMocks,
  addMocks,
  reset
} = actions;

const extractError = (error: any) => ({
  message:
    (error.xhr && error.xhr.response && error.xhr.response.message) ||
    error.message
});

const fetchSessionsEpic: Epic<Actions> = action$ =>
  action$.pipe(
    filter(isActionOf(fetchSessions.request)),
    exhaustMap(() =>
      ajax.get(trimedPath + "/sessions/summary").pipe(
        mergeMap(({ response }) => {
          return decode(SessionsCodec)(response).pipe(
            map(resp => fetchSessions.success(resp))
          );
        }),
        catchError(error => {
          return of(fetchSessions.failure(extractError(error)));
        })
      )
    )
  );

const newSessionEpic: Epic<Actions> = action$ =>
  action$.pipe(
    filter(isActionOf(newSession.request)),
    exhaustMap(() => {
      return ajax.post(trimedPath + "/sessions").pipe(
        mergeMap(({ response }) => {
          return decode(SessionCodec)(response).pipe(
            map(resp => newSession.success(resp))
          );
        }),
        catchError(error => {
          return of(newSession.failure(extractError(error)));
        })
      );
    })
  );

const updateSessionEpic: Epic<Actions> = action$ =>
  action$.pipe(
    filter(isActionOf(updateSession.request)),
    exhaustMap(action => {
      return ajax
        .put(trimedPath + "/sessions", action.payload, {
          "Content-Type": "application/json"
        })
        .pipe(
          mergeMap(({ response }) => {
            return decode(SessionCodec)(response).pipe(
              map(resp => updateSession.success(resp))
            );
          }),
          catchError(error => {
            return of(updateSession.failure(extractError(error)));
          })
        );
    })
  );

const uploadSessionsEpic: Epic<Actions> = action$ =>
  action$.pipe(
    filter(isActionOf(uploadSessions.request)),
    exhaustMap(action => {
      return ajax
        .post(trimedPath + "/sessions/import", action.payload, {
          "Content-Type": "application/json"
        })
        .pipe(
          mergeMap(({ response }) => {
            return decode(SessionsCodec)(response).pipe(
              map(resp => uploadSessions.success(resp))
            );
          }),
          catchError(error => {
            return of(uploadSessions.failure(extractError(error)));
          })
        );
    })
  );

const fetchHistoryEpic: Epic<Actions> = action$ =>
  action$.pipe(
    filter(isActionOf(fetchHistory.request)),
    exhaustMap(action => {
      const query = action.payload ? `?session=${action.payload}` : "";
      return ajax.get(trimedPath + "/history" + query).pipe(
        mergeMap(({ response }) => {
          return decode(HistoryCodec)(response).pipe(
            map(resp => fetchHistory.success(resp))
          );
        }),
        catchError(error => {
          return of(fetchHistory.failure(extractError(error)));
        })
      );
    })
  );

const fetchMocksEpic: Epic<Actions> = action$ =>
  action$.pipe(
    filter(isActionOf([fetchMocks.request, addMocks.success])),
    exhaustMap(action => {
      const query = action.payload ? `?session=${action.payload}` : "";
      return ajax.get(trimedPath + "/mocks" + query).pipe(
        mergeMap(({ response }) => {
          return decode(MocksCodec)(response).pipe(
            map(resp => fetchMocks.success(resp))
          );
        }),
        catchError(error => {
          return of(fetchMocks.failure(extractError(error)));
        })
      );
    })
  );

const addMocksEpic: Epic<Actions> = action$ =>
  action$.pipe(
    filter(isActionOf(addMocks.request)),
    exhaustMap(action => {
      const query = action.payload.sessionID
        ? `?session=${action.payload.sessionID}`
        : "";
      return ajax
        .post(trimedPath + "/mocks" + query, action.payload.mocks, {
          "Content-Type": "application/x-yaml"
        })
        .pipe(
          map(() => addMocks.success()),
          catchError(error => {
            return of(addMocks.failure(extractError(error)));
          })
        );
    })
  );

const resetEpic: Epic<Actions> = action$ =>
  action$.pipe(
    filter(isActionOf(reset.request)),
    exhaustMap(() =>
      ajax.post(trimedPath + "/reset").pipe(
        map(() => reset.success()),
        catchError(error => {
          return of(reset.failure(extractError(error)));
        })
      )
    )
  );

export default combineEpics(
  fetchSessionsEpic,
  newSessionEpic,
  updateSessionEpic,
  uploadSessionsEpic,
  fetchHistoryEpic,
  fetchMocksEpic,
  addMocksEpic,
  resetEpic
);
