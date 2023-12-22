import React, {useEffect, useRef} from "react";


const ActionsWrapper = ({ show, mode, className, children, onClosedClick, onClickOutside}) => {

    const ref = useRef();
    
    useOnClickOutside(ref, show ? onClickOutside : () => {});
    
    return (
        <div 
            ref={ref}
            className={className + ' ' + (mode === "vertical" ? "action-dots-vertical" : "action-dots-horizontal")}
            onClick={() => onClosedClick()}
        >
            <span className="console-action-dot"></span>
            <span className="console-action-dot"></span>
            <span className="console-action-dot"></span>
            {show && children}
        </div>
    )
};

function useOnClickOutside(ref, handler) {
    useEffect(
        () => {
            const listener = event => {
                if (!ref.current || ref.current.contains(event.target)) {
                    return;
                }
                handler(event);
            };

            document.addEventListener('mousedown', listener);
            document.addEventListener('touchstart', listener);

            return () => {
                document.removeEventListener('mousedown', listener);
                document.removeEventListener('touchstart', listener);
            };
        },
        [ref, handler]
    );
}

export default ActionsWrapper;