import { hot } from "react-hot-loader";
import * as React from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect
} from "react-router-dom";
import Navbar from "./Navbar";
import History from "./History";
import "./App.scss";
import Mocks from "./Mocks";
import { createEpicMiddleware } from "redux-observable";
import { createStore, applyMiddleware } from "redux";
import rootReducer from "~modules/reducers";
import rootEpic from "~modules/epics";
import { Actions } from "~modules/actions";
import { Provider } from "react-redux";

import { composeWithDevTools } from "redux-devtools-extension";

const epicMiddleware = createEpicMiddleware<Actions>();

const store = createStore(
  rootReducer,
  composeWithDevTools(applyMiddleware(epicMiddleware))
);

epicMiddleware.run(rootEpic);

const App = () => (
  <Provider store={store}>
    <Router>
      <Navbar />
      <Switch>
        <Route exact path="/pages/history" component={History} />
        <Route exact path="/pages/mocks" component={Mocks} />
        <Redirect to="/pages/history" />
      </Switch>
    </Router>
  </Provider>
);
export default hot(module)(App);
