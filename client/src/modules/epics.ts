import { combineEpics, Epic } from "redux-observable";
import { of } from "rxjs";
import { ajax } from "rxjs/ajax";
import { catchError, exhaustMap, filter, map, mergeMap } from "rxjs/operators";
import { isActionOf } from "typesafe-actions";
import { trimedPath } from "~utils";
import { Actions, actions } from "./actions";
import { decode, HistoryCodec, MocksCodec } from "./types";

const { fetchHistory, fetchMocks, addMocks, reset } = actions;

const fetchHistoryEpic: Epic<Actions> = action$ =>
  action$.pipe(
    filter(isActionOf(fetchHistory.request)),
    exhaustMap(() =>
      ajax.get(trimedPath + "/history").pipe(
        mergeMap(({ response }) => {
          return decode(HistoryCodec)(response).pipe(
            map(resp => fetchHistory.success(resp))
          );
        }),
        catchError(error => {
          return of(
            fetchHistory.failure({
              message: error.xhr ? error.xhr.response : error.message
            })
          );
        })
      )
    )
  );

const fetchMocksEpic: Epic<Actions> = action$ =>
  action$.pipe(
    filter(isActionOf([fetchMocks.request, addMocks.success])),
    exhaustMap(() =>
      ajax.get(trimedPath + "/mocks").pipe(
        mergeMap(({ response }) => {
          return decode(MocksCodec)(response).pipe(
            map(resp => fetchMocks.success(resp))
          );
        }),
        catchError(error => {
          return of(
            fetchMocks.failure({
              message: error.xhr ? error.xhr.response : error.message
            })
          );
        })
      )
    )
  );

const addMocksEpic: Epic<Actions> = action$ =>
  action$.pipe(
    filter(isActionOf(addMocks.request)),
    exhaustMap(action =>
      ajax
        .post(trimedPath + "/mocks", action.payload, {
          "Content-Type": "application/x-yaml"
        })
        .pipe(
          map(() => addMocks.success()),
          catchError(error => {
            return of(
              addMocks.failure({
                message: error.xhr ? error.xhr.response : error.message
              })
            );
          })
        )
    )
  );

const resetEpic: Epic<Actions> = action$ =>
  action$.pipe(
    filter(isActionOf(reset.request)),
    exhaustMap(() =>
      ajax.post(trimedPath + "/reset").pipe(
        map(() => reset.success()),
        catchError(error => {
          return of(
            reset.failure({
              message: error.xhr ? error.xhr.response : error.message
            })
          );
        })
      )
    )
  );

export default combineEpics(
  fetchHistoryEpic,
  fetchMocksEpic,
  addMocksEpic,
  resetEpic
);
