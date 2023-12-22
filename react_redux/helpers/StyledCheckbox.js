import React from "react";

const StyledCheckbox = (props) => (
    <label className="styled-checkbox" style={props.styles != undefined ? props.styles : {}}>
        <input
            type={"checkbox"}
            checked={props.checked}
            onChange={props.changeSelect}
        />
        <span className="checkmark"></span>
    </label>
);

export default StyledCheckbox;