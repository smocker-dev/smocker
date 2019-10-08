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

const App = () => {
  return (
    <Router>
      <Navbar />
      <Switch>
        <Route path="/pages/history" component={History} />
        <Route path="/pages/mocks" component={Mocks} />
        <Redirect to="/pages/history" />
      </Switch>
    </Router>
  );
};

export default hot(module)(App);
