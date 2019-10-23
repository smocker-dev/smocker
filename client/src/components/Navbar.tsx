import * as React from "react";
import { NavLink } from "react-router-dom";
import "./Navbar.scss";
import Logo from "~assets/logo.png";
import { connect } from "react-redux";
import { AppState } from "~modules/reducers";
import { Dispatch } from "redux";
import { Actions, actions } from "~modules/actions";

interface Props {
  loading: boolean;
  reset: () => void;
}

const Navbar = ({ loading, reset }: Props) => {
  return (
    <nav className="navbar">
      <div className="menu">
        <div className="start">
          <NavLink exact to="/" className="brand item">
            <img height={32} src={Logo} />
            Smocker
          </NavLink>
          <NavLink exact to="/pages/history" className="item">
            History
          </NavLink>
          <NavLink exact to="/pages/mocks" className="item">
            Mocks
          </NavLink>
        </div>
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
  );
};

export default connect(
  (state: AppState) => ({
    loading: state.history.loading || state.mocks.loading
  }),
  (dispatch: Dispatch<Actions>) => ({
    reset: () => dispatch(actions.reset.request())
  })
)(Navbar);
