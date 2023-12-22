import React, {Component} from "react";


class Notification extends Component {

    state = {
        shown: this.props.show,
        message: this.props.text,
        wasShownOnce: false
    };

    timeout = null;

    componentDidUpdate(prevProps, prevState, snapshot) {
        if (prevProps.show !== this.props.show) {
            clearTimeout(this.timeout);
        }
        if (!prevProps.show && this.props.show) {
            this.show();
        }
        if (prevProps.show && !this.props.show) {
            this.hide();
        }
    }

    show() {
        this.setState({
            shown: true,
            message: this.props.text,
            wasShownOnce: true
        });
        this.timeout = setTimeout(() => {
            this.hide();
            this.props.onClose();
        }, 1450);
    }

    hide() {
        this.setState({
            shown: false
        })
    }

    render() {
        const {onClose} = this.props;
        const {shown, message, wasShownOnce} = this.state;
        return (
            <>
                {wasShownOnce &&
                    <div className={`term-notification ${!shown ? 'notification-wrapper-move_back' : 'notification-wrapper' }`}
                         onClick={() => onClose()}>
                        {message}
                    </div>}
            </>
        )
    }
}

export default Notification;
