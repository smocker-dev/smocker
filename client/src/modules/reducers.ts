import { combineReducers } from "redux";
import { getType, StateType } from "typesafe-actions";
import { Actions, actions } from "./actions";
import { Error, History, Mocks } from "./types";

const loadingHistory = (state = false, action: Actions) => {
  const { fetchHistory, reset } = actions;
  switch (action.type) {
    case getType(fetchHistory.request):
    case getType(reset.request): {
      return true;
    }
    case getType(fetchHistory.success):
    case getType(fetchHistory.failure):
    case getType(reset.success):
    case getType(reset.failure): {
      return false;
    }
    default:
      return state;
  }
};

const entryList = (state: History = [], action: Actions) => {
  const { fetchHistory, reset } = actions;
  switch (action.type) {
    case getType(reset.success): {
      return [];
    }
    case getType(fetchHistory.success): {
      return action.payload;
    }
    default:
      return state;
  }
};

const entryError = (state: Error | null = null, action: Actions) => {
  const { fetchHistory, reset } = actions;
  switch (action.type) {
    case getType(fetchHistory.failure):
    case getType(reset.failure): {
      return action.payload;
    }
    case getType(fetchHistory.success):
    case getType(reset.success): {
      return null;
    }
    default:
      return state;
  }
};

const history = combineReducers({
  loading: loadingHistory,
  list: entryList,
  error: entryError
});

const loadingMocks = (state = false, action: Actions) => {
  const { fetchMocks, addMocks, reset } = actions;
  switch (action.type) {
    case getType(fetchMocks.request):
    case getType(addMocks.request):
    case getType(reset.request): {
      return true;
    }
    case getType(fetchMocks.success):
    case getType(fetchMocks.failure):
    case getType(addMocks.success):
    case getType(addMocks.failure):
    case getType(reset.success):
    case getType(reset.failure): {
      return false;
    }
    default:
      return state;
  }
};

const mockList = (state: Mocks = [], action: Actions) => {
  const { fetchMocks, reset } = actions;
  switch (action.type) {
    case getType(reset.success): {
      return [];
    }
    case getType(fetchMocks.success): {
      return action.payload;
    }
    default:
      return state;
  }
};

const mocksError = (state: Error | null = null, action: Actions) => {
  const { fetchMocks, addMocks, reset } = actions;
  switch (action.type) {
    case getType(fetchMocks.failure):
    case getType(addMocks.failure):
    case getType(reset.failure): {
      return action.payload;
    }
    case getType(fetchMocks.success):
    case getType(addMocks.success):
    case getType(reset.success): {
      return null;
    }
    default:
      return state;
  }
};

const mocks = combineReducers({
  loading: loadingMocks,
  list: mockList,
  error: mocksError
});

const reducers = combineReducers({
  history,
  mocks
});

export type AppState = StateType<typeof reducers>;
export default reducers;
