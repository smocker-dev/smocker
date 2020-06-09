import { combineReducers } from "redux";
import { getType, StateType } from "typesafe-actions";
import { Actions, actions } from "./actions";
import { Error, GraphHistory, History, Mocks, Sessions } from "./types";

const loadingSessions = (state = false, action: Actions) => {
  const {
    fetchSessions,
    newSession,
    updateSession,
    uploadSessions,
    reset,
  } = actions;
  switch (action.type) {
    case getType(fetchSessions.request):
    case getType(newSession.request):
    case getType(updateSession.request):
    case getType(uploadSessions.request):
    case getType(reset.request): {
      return true;
    }
    case getType(fetchSessions.success):
    case getType(fetchSessions.failure):
    case getType(newSession.success):
    case getType(newSession.failure):
    case getType(updateSession.success):
    case getType(updateSession.failure):
    case getType(uploadSessions.success):
    case getType(uploadSessions.failure):
    case getType(reset.success):
    case getType(reset.failure): {
      return false;
    }
    default:
      return state;
  }
};

const sessionList = (state: Sessions = [], action: Actions) => {
  const {
    fetchSessions,
    newSession,
    updateSession,
    uploadSessions,
    reset,
  } = actions;
  switch (action.type) {
    case getType(reset.success): {
      return [];
    }
    case getType(fetchSessions.success):
    case getType(uploadSessions.success): {
      return [...action.payload];
    }
    case getType(newSession.success): {
      return [...state, action.payload];
    }
    case getType(updateSession.success): {
      return state.map((session) =>
        session.id === action.payload.id ? action.payload : session
      );
    }
    default:
      return state;
  }
};

const sessionError = (state: Error | null = null, action: Actions) => {
  const {
    fetchSessions,
    newSession,
    updateSession,
    uploadSessions,
    reset,
  } = actions;
  switch (action.type) {
    case getType(fetchSessions.failure):
    case getType(newSession.failure):
    case getType(updateSession.failure):
    case getType(uploadSessions.failure):
    case getType(reset.failure): {
      return action.payload;
    }
    case getType(fetchSessions.success):
    case getType(newSession.success):
    case getType(updateSession.success):
    case getType(uploadSessions.success):
    case getType(reset.success): {
      return null;
    }
    default:
      return state;
  }
};

const selectedSession = (state = "", action: Actions) => {
  const {
    fetchSessions,
    newSession,
    selectSession,
    updateSession,
    uploadSessions,
    reset,
  } = actions;
  switch (action.type) {
    case getType(selectSession): {
      return action.payload;
    }
    case getType(reset.success): {
      return "";
    }
    case getType(newSession.success):
    case getType(updateSession.success): {
      return action.payload.id;
    }
    case getType(fetchSessions.success):
    case getType(uploadSessions.success): {
      if (!state) {
        return "";
      }
      return action.payload.filter((session) => session.id === state).length ===
        0
        ? ""
        : state;
    }
    default:
      return state;
  }
};

const sessions = combineReducers({
  loading: loadingSessions,
  list: sessionList,
  error: sessionError,
  selected: selectedSession,
});

const loadingHistory = (state = false, action: Actions) => {
  const { fetchHistory, summarizeHistory, reset } = actions;
  switch (action.type) {
    case getType(fetchHistory.request):
    case getType(summarizeHistory.request):
    case getType(reset.request): {
      return true;
    }
    case getType(fetchHistory.success):
    case getType(fetchHistory.failure):
    case getType(summarizeHistory.success):
    case getType(summarizeHistory.failure):
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

const historyGraph = (state: GraphHistory = [], action: Actions) => {
  const { summarizeHistory, reset } = actions;
  switch (action.type) {
    case getType(summarizeHistory.success): {
      return action.payload;
    }
    case getType(summarizeHistory.failure):
    case getType(reset.success): {
      return [];
    }
    default:
      return state;
  }
};

const history = combineReducers({
  loading: loadingHistory,
  list: entryList,
  error: entryError,
  graph: historyGraph,
});

const loadingMocks = (state = false, action: Actions) => {
  const { fetchMocks, addMocks, lockMocks, unlockMocks, reset } = actions;
  switch (action.type) {
    case getType(fetchMocks.request):
    case getType(addMocks.request):
    case getType(lockMocks.request):
    case getType(unlockMocks.request):
    case getType(reset.request): {
      return true;
    }
    case getType(fetchMocks.success):
    case getType(fetchMocks.failure):
    case getType(addMocks.success):
    case getType(addMocks.failure):
    case getType(lockMocks.success):
    case getType(lockMocks.failure):
    case getType(unlockMocks.success):
    case getType(unlockMocks.failure):
    case getType(reset.success):
    case getType(reset.failure): {
      return false;
    }
    default:
      return state;
  }
};

const mockList = (state: Mocks = [], action: Actions) => {
  const { fetchMocks, lockMocks, unlockMocks, reset } = actions;
  switch (action.type) {
    case getType(reset.success): {
      return [];
    }
    case getType(lockMocks.success):
    case getType(unlockMocks.success):
    case getType(fetchMocks.success): {
      return action.payload;
    }
    default:
      return state;
  }
};

const mockEditor = (
  state: [boolean, string] = [false, ""],
  action: Actions
) => {
  const { openMockEditor } = actions;
  switch (action.type) {
    case getType(openMockEditor):
      return [action.payload[0], action.payload[1]];
    default:
      return state;
  }
};

const mocksError = (state: Error | null = null, action: Actions) => {
  const { fetchMocks, addMocks, lockMocks, unlockMocks, reset } = actions;
  switch (action.type) {
    case getType(fetchMocks.failure):
    case getType(addMocks.failure):
    case getType(lockMocks.failure):
    case getType(unlockMocks.failure):
    case getType(reset.failure): {
      return action.payload;
    }
    case getType(fetchMocks.success):
    case getType(addMocks.success):
    case getType(lockMocks.success):
    case getType(unlockMocks.success):
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
  editor: mockEditor,
  error: mocksError,
});

const reducers = combineReducers({
  sessions,
  history,
  mocks,
});

export type AppState = StateType<typeof reducers>;
export default reducers;
