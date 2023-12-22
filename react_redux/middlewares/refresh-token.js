import { refreshToken } from "../store/auth/actions";

export const refreshTokenMiddleware = (store) => (next) => (action) => {
    let reducers = store.getState();

    if (localStorage.getItem('access')) {
        Object.keys(reducers).map((item) => {
            if (reducers[item].errorStatus === 401) {
                store.dispatch(refreshToken(localStorage.getItem('refresh')));
            }
        });
    }

    next(action);
};
