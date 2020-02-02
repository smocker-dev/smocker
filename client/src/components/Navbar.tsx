import * as React from "react";
import {
  NavLink,
  Link,
  withRouter,
  RouteComponentProps
} from "react-router-dom";
import Logo from "~assets/logo.png";
import { connect } from "react-redux";
import { AppState } from "~modules/reducers";
import { Dispatch } from "redux";
import { Actions, actions } from "~modules/actions";
import { Icon, Menu, Layout } from "antd";
import "./Navbar.scss";

interface Props extends RouteComponentProps {
  loading: boolean;
  reset: () => void;
}

const Navbar = ({ location }: Props) => {
  return (
    <Layout.Header className="navbar">
      <div id="logo">
        <img height={32} src={Logo} alt="Smocker" />
      </div>
      <Menu
        defaultSelectedKeys={["/pages/history"]}
        selectedKeys={[location.pathname]}
        mode="horizontal"
        theme="dark"
      >
        <Menu.Item key="/pages/history">
          History
          <NavLink to="/pages/history" />
        </Menu.Item>
        <Menu.Item key="/pages/mocks">
          Mocks
          <NavLink to="/pages/mocks" />
        </Menu.Item>
      </Menu>
    </Layout.Header>
  );
  /*
    <nav className="navbar">
      <div className="menu">
        <div className="end">
          <button
            className={loading ? "loading" : ""}
            onClick={loading ? undefined : reset}
          >
            Reset
          </button>
        </div>
      </div>
    </nav>

  );*/
};

export default withRouter(
  connect(
    (state: AppState) => ({
      loading: state.history.loading || state.mocks.loading
    }),
    (dispatch: Dispatch<Actions>) => ({
      reset: () => dispatch(actions.reset.request())
    })
  )(Navbar)
);
