import React, { Component } from "react";
import { connect } from "react-redux";
import SpinnerDownload from "./SpinnerDownload";

class LoadingOverlay extends Component {
	state = {
		isOn: false,
		start: 0,
	};

	time = 0;
	timer = null;

	startTimer() {
		this.setState({ isOn: true, start: Date.now() - this.time });
		this.timer = setInterval(() => {
			this.time = Date.now() - this.state.start;
			this.checkVisible();
		}, 100);
	}

	stopTimer() {
		this.time = 0;
		this.setState({ isOn: false });
		clearInterval(this.timer);
	}

	checkVisible = () => {
		const {
			delay,
			isFetchingAuth,
			isFetchingTerms,
			isFetchingCommon,
			isFetchingConsole,
			isFetchingDashboard,
			isFetchingReviewersDashboard,
		} = this.props;
		const { isOn } = this.state;

		const isFetching =
			isFetchingAuth ||
			isFetchingTerms ||
			isFetchingConsole ||
			isFetchingCommon ||
			isFetchingDashboard ||
			isFetchingReviewersDashboard;

		if (!isFetching && this.time > delay) {
			this.stopTimer();
		}

		if (isFetching && !isOn) {
			this.startTimer();
		}
	};

	componentDidUpdate() {
		this.checkVisible();
	}

	componentWillUnmount() {
		clearInterval(this.timer);
	}

	render() {
		return (
			<>
				{this.state.isOn && (
					<div className='spinner-main-wrapper global-loading'>
						<SpinnerDownload />
					</div>
				)}
			</>
		);
	}
}

export default connect((state) => ({
	isFetchingTerms: state.terms.isFetching,
	isFetchingAuth: state.auth.isFetching,
	isFetchingCommon: state.common.isFetching,
	isFetchingConsole: state.managementConsole.isFetching,
	isFetchingDashboard: state.dashboard.isFetching,
	isFetchingReviewersDashboard: state.reviewersDashboard.isFetching,
}))(LoadingOverlay);