import React from "react";
import { useSearchParams } from "react-router-dom";
import useLocalStorage from "use-local-storage";

interface IGlobalState {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;

  selectedSessionID: string | null;
  selectSession: (id: string) => void;

  isSessionsAscSorted: boolean;
  toggleSessionsSort: () => void;

  historySortField: string;
  setHistorySortField: (field: string) => void;
  historySortOrder: string;
  setHistorySortOrder: (order: string) => void;
  historyFilter: string;
  setHistoryFilter: (filter: string) => void;
}

export const GlobalStateContext = React.createContext<IGlobalState>(
  {} as IGlobalState
);

export const GlobalStateProvider = ({ children }: React.PropsWithChildren) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isSidebarOpen, setSideBarOpen] = React.useState(true);
  const toggleSidebar = () => {
    setSideBarOpen(!isSidebarOpen);
  };
  const [selectedSessionID, selectSession] = React.useState<string | null>(
    searchParams.get("session")
  );
  const [isSessionsAscSorted, setSessionsAscSort] = useLocalStorage(
    "smocker.sessions.sort.asc",
    true
  );
  const toggleSessionsSort = () => {
    setSessionsAscSort(!isSessionsAscSorted);
  };

  const [historySortField, setHistorySortField] = useLocalStorage(
    "smocker.history.sort.field",
    "response"
  );
  const [historySortOrder, setHistorySortOrder] = useLocalStorage(
    "smocker.history.sort.order",
    "desc"
  );
  const [historyFilter, setHistoryFilter] = useLocalStorage(
    "smocker.history.filter",
    "all"
  );

  React.useEffect(() => {
    if (selectedSessionID !== searchParams.get("session")) {
      setSearchParams({ session: selectedSessionID || "" });
    }
  }, [selectedSessionID]);

  return (
    <GlobalStateContext.Provider
      value={{
        isSidebarOpen,
        toggleSidebar,
        selectedSessionID,
        selectSession,
        isSessionsAscSorted,
        toggleSessionsSort,
        historySortField,
        setHistorySortField,
        historySortOrder,
        setHistorySortOrder,
        historyFilter,
        setHistoryFilter
      }}
    >
      {children}
    </GlobalStateContext.Provider>
  );
};
