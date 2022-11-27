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

  React.useEffect(() => {
    if (selectedSessionID !== searchParams.get("session")) {
      setSearchParams({ session: selectedSessionID || "" });
    }
  }, [selectedSessionID]);

  React.useEffect(() => {
    if (selectedSessionID !== searchParams.get("session")) {
      selectSession(searchParams.get("session"));
    }
  }, [searchParams.get("session")]);

  return (
    <GlobalStateContext.Provider
      value={{
        isSidebarOpen,
        toggleSidebar,
        selectedSessionID,
        selectSession,
        isSessionsAscSorted,
        toggleSessionsSort
      }}
    >
      {children}
    </GlobalStateContext.Provider>
  );
};
