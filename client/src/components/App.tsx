import { hot } from "react-hot-loader";
import * as React from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect
} from "react-router-dom";
import { Navbar } from "./Navbar";
import { History } from "./History";
import "./App.scss";
import { Mocks } from "./Mocks";
import Context, { Entry, Mock } from "./Context";

const App = () => {
  const [history, setHistory] = React.useState<Entry[]>([]);
  const [mocks, setMocks] = React.useState<Mock[]>([]);
  return (
    <Context.Provider value={{ history, setHistory, mocks, setMocks }}>
      <Router>
        <Navbar />
        <Switch>
          <Route exact path="/pages/history" component={History} />
          <Route exact path="/pages/mocks" component={Mocks} />
          <Redirect to="/pages/history" />
        </Switch>
      </Router>
    </Context.Provider>
  );
};

export default hot(module)(App);
