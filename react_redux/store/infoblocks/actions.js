import * as types from "./types";
import { baseURL } from "../../configs/config";


export const fetchEditorInfoblocks = (id) => ({
    type: types.FETCH_EDITOR_INFOBLOCKS,
    payload: {
        request: {
            url: `${baseURL}v1/editor/infoblocks/${id}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access')}`
            }
        }
    }
});

export const fetchTermsWithBlocks = () => ({
    type: types.FETCH_TERMS_WITH_BLOCKS,
    payload: {
        request: {
            url: `${baseURL}v1/admin/terms/get_with_infoblocks`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access')}`
            }
        }
    }
});

export const fetchInfoblocksTypes = () => ({
    type: types.FETCH_INFOBLOCKS_TYPES,
    payload: {
        request: {
            url: `${baseURL}v1/admin/infoblocks/types`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access')}`
            }
        }
    }
});

export const fetchDocumentInfoblocks = (id, lang = 'en') => {
    const headers = {};
    if (localStorage.getItem('access') !== undefined && localStorage.getItem('access') !== null) {
        headers.Authorization = `Bearer ${localStorage.getItem('access')}`
    }

    return {
        type: types.FETCH_DOCUMENT_INFOBLOCKS,
        payload: {
            request: {
                url: `${baseURL}v1/infoblocks/${id}?lang=${lang}`,
                method: 'GET',
                headers
            }
        }
    }
};

export const includeInfoblocks = (data) => ({
    type: types.INCLUDE_INFOBLOCKS,
    payload: {
        request: {
            url: `${baseURL}v1/infoblocks/include`,
            method: 'POST',
            data,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access')}`
            }
        }
    }
});

export const excludeInfoblocks = (data) => ({
    type: types.INCLUDE_INFOBLOCKS,
    payload: {
        request: {
            url: `${baseURL}v1/infoblocks/exclude`,
            method: 'POST',
            data,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access')}`
            }
        }
    }
});

export const selectInfoblock = (id) => ({type: types.SELECT_INFOBLOCK, payload: {id}});
export const addInfoblock = (id, data) => ({type: types.ADD_INFOBLOCK, payload: {id, data}});
export const insertInfoblock = (id, data) => ({type: types.INSERT_INFOBLOCK, payload: {id, data}});
export const duplicateInfoblock = (id) => ({type: types.DUPLICATE_INFOBLOCK, payload: {id}});
export const removeInfoblock = (id) => ({type: types.REMOVE_INFOBLOCK, payload: {id}});
export const showHideInfoblock = (id) => ({type: types.SHOW_HIDE_INFOBLOCK, payload: {id}});
export const editInfoblock = (id) => ({type: types.OPEN_EDIT_INFOBLOCK, payload: {id}});
export const saveInfoblock = (id, data) => ({type: types.SAVE_INFOBLOCK, payload: {id, data}});
export const lockUnlockInfoblock = (id) => ({type: types.LOCK_UNLOCK_INFOBLOCK, payload: {id}});
export const openCloseInfoblock = (id) => ({type: types.OPEN_CLOSE_INFOBLOCK, payload: {id}});
export const selectAllInfoblocks = (isChecked) => ({type: types.SELECT_ALL_INFOBLOCKS, payload: {isChecked}});
export const bulkDeleteInfoblocks = () => ({type: types.BULK_DELETE_INFOBLOCKS, payload: {}});
export const bulkLockInfoblocks = () => ({type: types.BULK_LOCK_INFOBLOCKS, payload: {}});
export const syncInfoblocks = (data) => ({type: types.SYNC_INFOBLOCKS, payload: {data}});

