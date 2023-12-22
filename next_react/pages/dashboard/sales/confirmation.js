import React from 'react'
import { connect } from 'react-redux';
import {provideAuthenticationInfo} from '../../../store/actions/auth'
import DashboardContainer from "../../../components/containers/DashboardContainer";
import DashboardSidebarContainer from "../../../components/containers/DashboardSidebarContainer";
import DashboardContentContainer from "../../../components/containers/DashboardContentContainer";
import Sidebar from "../../../components/dashboard/Sidebar";
import PageNavigation from "../../../components/dashboard/PageNavigation";
import checkAuth from "../../../hocs/checkAuth";


class ConfirmationPage extends React.Component {
  static async getInitialProps({query}) {
    const {order_id: orderId} = query;
    return  {
      orderId,
    };
  }

  render() {
    const user = this.props.userInfoResponse.data.user;
    return (
        <DashboardContainer>
          <DashboardSidebarContainer>
            <Sidebar user={user} active='sales'/>
          </DashboardSidebarContainer>
          <DashboardContentContainer>
            <PageNavigation user={user}/>
            Confirmation page for order {this.props.orderId}
          </DashboardContentContainer>
        </DashboardContainer>
    )
  }
}

const mapStateToProps = (state) => ({});
const mapDispatchToProps = {provideAuthenticationInfo};

export default checkAuth(connect(mapStateToProps, mapDispatchToProps)(ConfirmationPage))
