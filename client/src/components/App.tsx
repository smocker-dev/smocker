import { GithubFilled, ReadOutlined } from "@ant-design/icons";
import { Layout } from "antd";
import * as React from "react";
import { hot } from "react-hot-loader";
import { Provider } from "react-redux";
import {
  BrowserRouter as Router,
  Redirect,
  Route,
  Switch,
} from "react-router-dom";
import { applyMiddleware, createStore } from "redux";
import { composeWithDevTools } from "redux-devtools-extension";
import { createEpicMiddleware } from "redux-observable";
import { Actions } from "~modules/actions";
import rootEpic from "~modules/epics";
import rootReducer from "~modules/reducers";
import { trimedPath } from "~modules/utils";
import "./App.scss";
import History from "./History";
import Mocks from "./Mocks";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Visualize from "./Visualize";

const epicMiddleware = createEpicMiddleware<Actions>();

const store = createStore(
  rootReducer,
  composeWithDevTools(applyMiddleware(epicMiddleware))
);

epicMiddleware.run(rootEpic);

const App = () => (
  <Provider store={store}>
    <Router>
      <Layout className="layout">
        <Navbar />
        <Layout className="layout">
          <Sidebar />
          <Layout className="scrollable layout">
            <Layout.Content className="not-scrollable">
              <Switch>
                <Route
                  exact
                  path={trimedPath + "/pages/history"}
                  component={History}
                />
                <Route
                  exact
                  path={trimedPath + "/pages/mocks"}
                  component={Mocks}
                />
                <Route
                  exact
                  path={trimedPath + "/pages/mocks/:mock_id"}
                  component={Mocks}
                />
                <Route
                  exact
                  path={trimedPath + "/pages/visualize"}
                  component={Visualize}
                />
                <Redirect to={trimedPath + "/pages/history"} />
              </Switch>
            </Layout.Content>
            <Layout.Footer style={{ textAlign: "center" }}>
              Smocker version {window.version} &ndash; MIT Licensed
              <br />
              <a
                href="https://github.com/Thiht/smocker"
                title="Smocker on GitHub"
                target="_blank"
                rel="noreferrer"
              >
                <GithubFilled />
              </a>
              &nbsp;
              <a
                href="https://smocker.dev"
                title="Smocker Documentation"
                target="_blank"
                rel="noreferrer"
              >
                <ReadOutlined />
              </a>
            </Layout.Footer>
          </Layout>
        </Layout>
      </Layout>
    </Router>
  </Provider>
);
export default hot(module)(App);
