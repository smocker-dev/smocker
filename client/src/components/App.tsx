import { hot } from "react-hot-loader";
import { composeWithDevTools } from "redux-devtools-extension";

import * as React from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect
} from "react-router-dom";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import History from "./History";
import Mocks from "./Mocks";
import { createEpicMiddleware } from "redux-observable";
import { createStore, applyMiddleware } from "redux";
import rootReducer from "~modules/reducers";
import rootEpic from "~modules/epics";
import { Actions } from "~modules/actions";
import { Provider } from "react-redux";
import { Layout } from "antd";
import "./App.scss";

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
                <Route exact path="/pages/history" component={History} />
                <Route exact path="/pages/mocks" component={Mocks} />
                <Route exact path="/pages/mocks/:mock_id" component={Mocks} />
                <Redirect to="/pages/history" />
              </Switch>
            </Layout.Content>
            <Layout.Footer style={{ textAlign: "center" }}>
              MIT Licensed
            </Layout.Footer>
          </Layout>
        </Layout>
      </Layout>
    </Router>
  </Provider>
);
export default hot(module)(App);
