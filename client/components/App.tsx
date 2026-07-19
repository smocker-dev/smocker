import { GithubFilled, ReadOutlined } from "@ant-design/icons";
import { App as AntdApp, Layout, Tooltip } from "antd";
import "antd/dist/reset.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { SessionProvider } from "../modules/session";
import "./App.scss";
import History from "./History";
import Mocks from "./Mocks";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Visualize from "./Visualize";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SessionProvider>
      <BrowserRouter basename={window.basePath}>
        {/* component={false} so the message/notification context adds no wrapper element that
            would break the height:100% layout chain. */}
        <AntdApp component={false}>
          <Layout className="layout">
            <Navbar />
            <Layout className="layout">
              <Sidebar />
              <Layout className="scrollable layout">
                <Layout.Content className="not-scrollable">
                  <Routes>
                    <Route path="/pages/history" element={<History />} />
                    <Route path="/pages/mocks" element={<Mocks />} />
                    <Route path="/pages/mocks/:mock_id" element={<Mocks />} />
                    <Route path="/pages/visualize" element={<Visualize />} />
                    <Route
                      path="*"
                      element={<Navigate to="/pages/history" replace />}
                    />
                  </Routes>
                </Layout.Content>
                <Layout.Footer style={{ textAlign: "center" }}>
                  Smocker version {window.version} &ndash; MIT Licensed
                  <br />
                  <Tooltip title="Smocker on GitHub">
                    <a
                      href="https://github.com/smocker-dev/smocker"
                      aria-label="Smocker on GitHub"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <GithubFilled />
                    </a>
                  </Tooltip>
                  &nbsp;
                  <Tooltip title="Smocker documentation">
                    <a
                      href="https://smocker.dev"
                      aria-label="Smocker documentation"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ReadOutlined />
                    </a>
                  </Tooltip>
                </Layout.Footer>
              </Layout>
            </Layout>
          </Layout>
        </AntdApp>
      </BrowserRouter>
    </SessionProvider>
  </QueryClientProvider>
);

export default App;
