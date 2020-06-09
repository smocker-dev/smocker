import { combineEpics, Epic } from "redux-observable";
import { of } from "rxjs";
import { ajax, AjaxError, AjaxResponse } from "rxjs/ajax";
import { catchError, exhaustMap, filter, map, mergeMap } from "rxjs/operators";
import { isActionOf } from "typesafe-actions";
import { trimedPath } from "~modules/utils";
import { Actions, actions } from "./actions";
import {
  decode,
  Error,
  GraphHistoryCodec,
  HistoryCodec,
  MocksCodec,
  SessionCodec,
  SessionsCodec,
} from "./types";

const {
  fetchSessions,
  newSession,
  updateSession,
  uploadSessions,
  fetchHistory,
  summarizeHistory,
  fetchMocks,
  addMocks,
  lockMocks,
  unlockMocks,
  reset,
} = actions;

const extractError = (error: AjaxResponse | AjaxError | Error) => {
  const ajaxError = error as AjaxResponse | AjaxError;
  return {
    message:
      (ajaxError.xhr &&
        ajaxError.xhr.response &&
        ajaxError.xhr.response.message) ||
      error["message"],
  };
};

const fetchSessionsEpic: Epic<Actions> = (action$) =>
  action$.pipe(
    filter(isActionOf([fetchSessions.request, reset.success])),
    exhaustMap(() =>
      ajax.get(trimedPath + "/sessions/summary").pipe(
        mergeMap(({ response }) =>
          decode(SessionsCodec)(response).pipe(
            map((resp) => fetchSessions.success(resp))
          )
        ),
        catchError((error) => of(fetchSessions.failure(extractError(error))))
      )
    )
  );

const newSessionEpic: Epic<Actions> = (action$) =>
  action$.pipe(
    filter(isActionOf(newSession.request)),
    exhaustMap(() =>
      ajax.post(trimedPath + "/sessions").pipe(
        mergeMap(({ response }) =>
          decode(SessionCodec)(response).pipe(
            map((resp) => newSession.success(resp))
          )
        ),
        catchError((error) => of(newSession.failure(extractError(error))))
      )
    )
  );

const updateSessionEpic: Epic<Actions> = (action$) =>
  action$.pipe(
    filter(isActionOf(updateSession.request)),
    exhaustMap((action) =>
      ajax
        .put(trimedPath + "/sessions", action.payload, {
          "Content-Type": "application/json",
        })
        .pipe(
          mergeMap(({ response }) =>
            decode(SessionCodec)(response).pipe(
              map((resp) => updateSession.success(resp))
            )
          ),
          catchError((error) => of(updateSession.failure(extractError(error))))
        )
    )
  );

const uploadSessionsEpic: Epic<Actions> = (action$) =>
  action$.pipe(
    filter(isActionOf(uploadSessions.request)),
    exhaustMap((action) =>
      ajax
        .post(trimedPath + "/sessions/import", action.payload, {
          "Content-Type": "application/json",
        })
        .pipe(
          mergeMap(({ response }) =>
            decode(SessionsCodec)(response).pipe(
              map((resp) => uploadSessions.success(resp))
            )
          ),
          catchError((error) => of(uploadSessions.failure(extractError(error))))
        )
    )
  );

const fetchHistoryEpic: Epic<Actions> = (action$) =>
  action$.pipe(
    filter(isActionOf(fetchHistory.request)),
    exhaustMap((action) => {
      const query = action.payload ? `?session=${action.payload}` : "";
      return ajax.get(trimedPath + "/history" + query).pipe(
        mergeMap(({ response }) =>
          decode(HistoryCodec)(response).pipe(
            map((resp) => fetchHistory.success(resp))
          )
        ),
        catchError((error) => of(fetchHistory.failure(extractError(error))))
      );
    })
  );

const summarizeHistoryEpic: Epic<Actions> = (action$) =>
  action$.pipe(
    filter(isActionOf(summarizeHistory.request)),
    exhaustMap((action) => {
      const query = `?session=${action.payload.sessionID}&src=${action.payload.src}&dest=${action.payload.dest}`;
      return ajax.get(trimedPath + "/history/summary" + query).pipe(
        mergeMap(({ response }) =>
          decode(GraphHistoryCodec)(response).pipe(
            map((resp) => summarizeHistory.success(resp))
          )
        ),
        catchError((error) => of(summarizeHistory.failure(extractError(error))))
      );
    })
  );

const fetchMocksEpic: Epic<Actions> = (action$) =>
  action$.pipe(
    filter(isActionOf([fetchMocks.request, addMocks.success])),
    exhaustMap((action) => {
      const query = action.payload ? `?session=${action.payload}` : "";
      return ajax.get(trimedPath + "/mocks" + query).pipe(
        mergeMap(({ response }) =>
          decode(MocksCodec)(response).pipe(
            map((resp) => fetchMocks.success(resp))
          )
        ),
        catchError((error) => of(fetchMocks.failure(extractError(error))))
      );
    })
  );

const addMocksEpic: Epic<Actions> = (action$) =>
  action$.pipe(
    filter(isActionOf(addMocks.request)),
    exhaustMap((action) =>
      ajax
        .post(trimedPath + "/mocks", action.payload.mocks, {
          "Content-Type": "application/x-yaml",
        })
        .pipe(
          map(() => addMocks.success()),
          catchError((error) => of(addMocks.failure(extractError(error))))
        )
    )
  );

const lockMocksEpic: Epic<Actions> = (action$) =>
  action$.pipe(
    filter(isActionOf(lockMocks.request)),
    exhaustMap((action) => {
      return ajax
        .post(trimedPath + "/mocks/lock", action.payload, {
          "Content-Type": "application/json",
        })
        .pipe(
          mergeMap(({ response }) => {
            return decode(MocksCodec)(response).pipe(
              map((resp) => lockMocks.success(resp))
            );
          }),
          catchError((error) => {
            return of(lockMocks.failure(extractError(error)));
          })
        );
    })
  );

const unlockMocksEpic: Epic<Actions> = (action$) =>
  action$.pipe(
    filter(isActionOf(unlockMocks.request)),
    exhaustMap((action) => {
      return ajax
        .post(trimedPath + "/mocks/unlock", action.payload, {
          "Content-Type": "application/json",
        })
        .pipe(
          mergeMap(({ response }) => {
            return decode(MocksCodec)(response).pipe(
              map((resp) => unlockMocks.success(resp))
            );
          }),
          catchError((error) => {
            return of(unlockMocks.failure(extractError(error)));
          })
        );
    })
  );

const resetEpic: Epic<Actions> = (action$) =>
  action$.pipe(
    filter(isActionOf(reset.request)),
    exhaustMap(() =>
      ajax.post(trimedPath + "/reset").pipe(
        map(() => reset.success()),
        catchError((error) => of(reset.failure(extractError(error))))
      )
    )
  );

export default combineEpics(
  fetchSessionsEpic,
  newSessionEpic,
  updateSessionEpic,
  uploadSessionsEpic,
  fetchHistoryEpic,
  summarizeHistoryEpic,
  fetchMocksEpic,
  addMocksEpic,
  lockMocksEpic,
  unlockMocksEpic,
  resetEpic
);
