import React from "react";
import Notification from "./Notification";


const LocalNotification = (props) => {
    return (
        <div style={{top: props.top}}
            className={`invisible-second-layer ${props.show ? '' : 'invisible-layer-move-back'}`}>
            <Notification {...props}/>
        </div>
    )
};

export default LocalNotification;
