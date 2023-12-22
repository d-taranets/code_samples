import React from 'react';
import {getAuthenticatedInfo} from "../lib/auth";
import {impersonateModeOn, provideAuthenticationInfo} from "../store/actions/auth";
import {connect} from 'react-redux'
import UserService from "../services/UserService";
import {storeUserInformation} from "../store/actions/users";
import {applyProtectionRules} from "../lib/guards";
import {getCookie, removeCookie} from "../lib/session";
import cookieKeys from "../constans/cookieKeys";

export default Child => {
   class Higher extends React.Component {
    static async getInitialProps(ctx) {
      const {token, expiresIn, refreshed} = await getAuthenticatedInfo(ctx);
      const { user, hasAdvancedInfo, advancedInfo } = ctx.store.getState().users;
      const impersonatedUserId = getCookie(cookieKeys.impersonatedUserId, ctx.req);
      const leaveImpersonating = getCookie(cookieKeys.leaveImpersonating, ctx.req);

      let userInfoResponse = {};
      if (user.id && (!impersonatedUserId || user.id === parseInt(impersonatedUserId)) && !leaveImpersonating) {
        userInfoResponse = {
          success: true,
          data: {
            user,
            hasAdvancedInfo,
            advancedInfo
          }
        }
      } else if (token) {
        userInfoResponse = await UserService.getProfile(token);
        if (leaveImpersonating) {
          removeCookie(cookieKeys.leaveImpersonating);
        }
      }
      const childProps = await Child.getInitialProps(ctx);
      const userRole = userInfoResponse.success ? userInfoResponse.data.user.role : null;

      applyProtectionRules(ctx, token, userRole);

      return {...childProps, token, expiresIn, refreshed, isServer: ctx.isServer, userInfoResponse, impersonatedUserId, leaveImpersonating}
    }

    componentDidMount() {
      const {token, userId, userInfoResponse, impersonatedUserId, leaveImpersonating} = this.props;
      if (token) {
        this.props.provideAuthenticationInfo(this.props);
        if (!userId) {
          if (userInfoResponse.success) {
            this.props.storeUserInformation(userInfoResponse.data);
          }
        }
      }
      if ((impersonatedUserId || leaveImpersonating) && userInfoResponse.success) {
        this.props.storeUserInformation(userInfoResponse.data);
        if (impersonatedUserId) {
          this.props.impersonateModeOn();
        }
      }
    }

    render() {
      return <Child {...this.props} />;
    }
  }
  const mapStateToProps = (state) => ({
    userId: state.users.user.id
  });
  const mapDispatchToProps = {
    provideAuthenticationInfo,
    storeUserInformation,
    impersonateModeOn
  };

  return connect(mapStateToProps, mapDispatchToProps)(Higher)
}
