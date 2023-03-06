import axios from "axios";
import trimEnd from "lodash/trimEnd";
import React from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useSearchParams } from "react-router-dom";
import { GlobalStateContext } from "./state";
import {
  ErrorType,
  GraphHistoryCodec,
  GraphHistoryType,
  HistoryCodec,
  HistoryType,
  MocksCodec,
  MocksType,
  SessionCodec,
  SessionsCodec,
  SessionsType,
  SessionType
} from "./types";

export const trimedPath = trimEnd(window.basePath, "/");

const getSessions = async () => {
  const { data } = await axios.get(`${trimedPath}/sessions/summary`);
  return SessionsCodec.parse(data);
};

export const useSessions = () => {
  const [refetchInterval] = React.useState(10000);
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectSession } = React.useContext(GlobalStateContext);
  return useQuery<SessionsType, ErrorType>(["sessions"], getSessions, {
    refetchInterval,
    onSuccess: data => {
      const sessionID = searchParams.get("session");
      if (!data.filter(session => session.id === sessionID).length) {
        searchParams.delete("session");
        setSearchParams(searchParams);
        selectSession("");
      }
    }
  });
};

const addSession = async () => {
  const { data } = await axios.post(`${trimedPath}/sessions`);
  return SessionCodec.parse(data);
};

export const useAddSession = () => {
  const queryClient = useQueryClient();
  return useMutation<SessionType, ErrorType>(addSession, {
    onSuccess: () => {
      queryClient.invalidateQueries(["sessions"]);
    }
  });
};

const uploadSessions = async (sessions: SessionsType) => {
  const { data } = await axios.post(`${trimedPath}/sessions/import`, sessions);
  return SessionsCodec.parse(data);
};

export const useUploadSessions = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  return useMutation<SessionsType, ErrorType, SessionsType>(uploadSessions, {
    onSuccess: () => {
      queryClient.invalidateQueries(["sessions"]);
      searchParams.delete("session");
      setSearchParams(searchParams);
    }
  });
};

const resetSessions = async () => {
  await axios.post(`${trimedPath}/reset`);
  return;
};

export const useResetSessions = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  return useMutation<void, ErrorType>(resetSessions, {
    onSuccess: () => {
      queryClient.invalidateQueries(["sessions"]);
      searchParams.delete("session");
      setSearchParams(searchParams);
    }
  });
};

const updateSession = async (session: SessionType) => {
  const { data } = await axios.put(`${trimedPath}/sessions`, session);
  return SessionCodec.parse(data);
};

export const useUpdateSession = () => {
  const queryClient = useQueryClient();
  return useMutation<SessionType, ErrorType, SessionType>(updateSession, {
    onSuccess: () => {
      queryClient.invalidateQueries(["sessions"]);
    }
  });
};

const getHistory = async (sessionID: string) => {
  const { data } = await axios.get(
    `${trimedPath}/history?session=${sessionID}`
  );
  return HistoryCodec.parse(data);
};

export const useHistory = (sessionID: string) => {
  const [refetchInterval] = React.useState(10000);
  return useQuery<HistoryType, ErrorType>(
    ["history", sessionID],
    () => getHistory(sessionID),
    {
      refetchInterval
    }
  );
};

const summarizeHistory = async (
  sessionID: string,
  src: string,
  dest: string
) => {
  const { data } = await axios.get(
    `${trimedPath}/history/summary?session=${sessionID}&src=${src}&dest=${dest}`
  );
  return GraphHistoryCodec.parse(data);
};

export const useSummarizeHistory = (
  sessionID: string,
  src: string,
  dest: string
) => {
  return useQuery<GraphHistoryType, ErrorType>(["summary", sessionID], () =>
    summarizeHistory(sessionID, src, dest)
  );
};

const getMocks = async (sessionID: string) => {
  const { data } = await axios.get(`${trimedPath}/mocks?session=${sessionID}`);
  return MocksCodec.parse(data);
};

export const useMocks = (sessionID: string) => {
  const [refetchInterval] = React.useState(10000);
  return useQuery<MocksType, ErrorType>(
    ["mocks", sessionID],
    () => getMocks(sessionID),
    {
      refetchInterval
    }
  );
};

const lockMock = async (mockID: string) => {
  const { data } = await axios.post(`${trimedPath}/mocks/lock`, [mockID]);
  return MocksCodec.parse(data);
};

export const useLockMock = () => {
  const queryClient = useQueryClient();
  return useMutation<MocksType, ErrorType, string>(lockMock, {
    onSuccess: () => {
      queryClient.invalidateQueries(["mocks"]);
    }
  });
};

const unlockMock = async (mockID: string) => {
  const { data } = await axios.post(`${trimedPath}/mocks/unlock`, [mockID]);
  return MocksCodec.parse(data);
};

export const useUnlockMock = () => {
  const queryClient = useQueryClient();
  return useMutation<MocksType, ErrorType, string>(unlockMock, {
    onSuccess: () => {
      queryClient.invalidateQueries(["mocks"]);
    }
  });
};

const addMocks = async (mocks: MocksType) => {
  const { data } = await axios.post(`${trimedPath}/mocks`, mocks);
  return data;
};

export const useAddMocks = () => {
  const queryClient = useQueryClient();
  return useMutation<{ message: string }, ErrorType, MocksType>(addMocks, {
    onSuccess: () => {
      queryClient.invalidateQueries(["mocks"]);
    }
  });
};
