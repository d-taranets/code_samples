import { success, error } from "redux-saga-requests";
import * as types from "./types";

const initialState = {
    infoblocks: [],
    selectedInfoblockId: false,
    termsWithBlocks: [],
    infoblocksTypes: []
};

const uidv4 = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
});

/* recursive methods */
const recursiveFunction = (blocks, callback) => blocks.map((item, index) => {
    if (item.children.length !== 0) {
        item.children = [...recursiveFunction(item.children, callback)]
    }

    return callback(blocks, item, index);
});


const infoblocksReducer = (state = initialState, action) => {
    switch (action.type) {

        /* methods for local syncronizing*/
        case types.ADD_INFOBLOCK: {
            action.payload.data.id = uidv4();
            return {
                ...state,
                infoblocks: action.payload.id !== false ? recursiveFunction(state.infoblocks,
                    (blocks, item, index) => {
                        if (item.id === action.payload.id) {
                            item.children.push(action.payload.data);
                        }
                        return item;
                    }) : state.infoblocks.concat([{...action.payload.data}])
            }
        }

        case types.INSERT_INFOBLOCK: {
            return {
                ...state,
                infoblocks: action.payload.id !== false ? recursiveFunction(state.infoblocks,
                    (blocks, item, index) => {
                        if (item.id === action.payload.id) {
                            item.children.push(action.payload.data);
                        }
                        return item;
                    }, true) : state.infoblocks.concat([{...action.payload.data}])
            }
        }

        case types.REMOVE_INFOBLOCK: {
            let blocks = recursiveFunction(state.infoblocks,
                (blocks, item, index) => {
                    const findIndex = item.children.findIndex(block => block.id === action.payload.id);
                    if (findIndex !== -1) {
                        item.children.splice(findIndex, 1);
                    }
                    return item;
                });

            const findIndex = blocks.findIndex(block => block.id === action.payload.id);
            if (findIndex !== -1) {
                blocks.splice(findIndex, 1);
            }

            return {
                ...state,
                infoblocks:blocks,
                selectedInfoblockId: state.selectedInfoblockId === action.payload.id ? false : state.selectedInfoblockId
            }
        }

        case types.DUPLICATE_INFOBLOCK: {
            let blocks = recursiveFunction(state.infoblocks,
                (blocks, item, index) => {
                    const find = item.children.find(block => block.id === action.payload.id);
                    if (find !== undefined) {
                        item.children.splice(item.children.findIndex(block => block.id === action.payload.id) + 1, 0, {...find, children: [], id: uidv4(), is_new: true})
                    }
                    return item;
                });

            const find = blocks.find(block => block.id === action.payload.id);
            if (find !== undefined) {
                const newBlock = {...find};
                newBlock.title = "Copy of " + newBlock.title;
                blocks.splice(blocks.findIndex(block => block.id === action.payload.id) + 1, 0, {...newBlock, children: [], id: uidv4(), is_new: true});
            }

            return {
                ...state,
                infoblocks: blocks
            }
        }

        case types.SHOW_HIDE_INFOBLOCK: {
            return {
                ...state,
                infoblocks: recursiveFunction(state.infoblocks,
                    (blocks, item, index) => {
                        if (item.id === action.payload.id) {
                            item.checked = !item.checked;
                        }
                        return item
                    })
            }
        }

        case types.OPEN_EDIT_INFOBLOCK: {
            return {
                ...state,
                infoblocks: recursiveFunction(state.infoblocks,
                    (blocks, item, index) => {
                        if (item.id === action.payload.id) {
                            item.isEdit = !item.isEdit;
                        }
                        return item;
                    })
            }
        }

        case types.SAVE_INFOBLOCK: {
            return {
                ...state,
                infoblocks: recursiveFunction(state.infoblocks,
                    (blocks, item, index) => {
                        if (item.id === action.payload.id) {
                            item.title = action.payload.data.title;
                            item.content = action.payload.data.content;
                            item.isEdit = false;
                        }
                        return item;
                    })
            }
        }

        case types.LOCK_UNLOCK_INFOBLOCK: {
            return {
                ...state,
                infoblocks: recursiveFunction(state.infoblocks,
                    (blocks, item, index) => {
                        if (item.id === action.payload.id) {
                            item.locked = !item.locked;
                        }
                        return item;
                    })
            }
        }

        case types.OPEN_CLOSE_INFOBLOCK: {
            return {
                ...state,
                infoblocks: recursiveFunction(state.infoblocks,
                    (blocks, item, index) => {
                        if (item.id === action.payload.id) {
                            item.expanded = !item.expanded;
                        }
                        return item;
                    })
            }
        }

        case types.SELECT_ALL_INFOBLOCKS: {
            return {
                ...state,
                infoblocks: recursiveFunction(state.infoblocks,
                    (blocks, item, index) => {
                        item.checked = true;
                        return item;
                    })
            }
        }

        case types.BULK_DELETE_INFOBLOCKS: {
            return {
                ...state,
                infoblocks: recursiveFunction(state.infoblocks,
                    (blocks, item, index) => {
                        item.children = item.children.filter((block) => block.checked !== true);
                        return item;
                    }).filter((block) => block.checked !== true),
                selectedInfoblockId: false
            }
        }

        case types.BULK_LOCK_INFOBLOCKS: {
            return {
                ...state,
                infoblocks: recursiveFunction(state.infoblocks,
                    (blocks, item, index) => {
                        if (item.checked) {
                            item.locked = !item.locked;
                        }
                        return item;
                    })
            }
        }

        case types.SYNC_INFOBLOCKS: {
            return {
                ...state,
                infoblocks: [...action.payload.data]
            }
        }

        case types.SELECT_INFOBLOCK: {
            return {
                ...state,
                selectedInfoblockId: state.selectedInfoblockId === action.payload.id ? false : action.payload.id
            }
        }

        /* server responses */
        case success(types.FETCH_DOCUMENT_INFOBLOCKS):
        case success(types.FETCH_EDITOR_INFOBLOCKS): {
            return {
                ...state,
                infoblocks: action.payload.data.data,
                selectedInfoblockId: false
            }
        }

        case success(types.FETCH_TERMS_WITH_BLOCKS): {
            return {
                ...state,
                termsWithBlocks: action.payload.data.data
            }
        }

        case success(types.FETCH_INFOBLOCKS_TYPES): {
            return {
                ...state,
                infoblocksTypes: action.payload.data.data
            }
        }

        case error(types.INCLUDE_INFOBLOCKS):
        case error(types.EXCLUDE_INFOBLOCKS):
        case error(types.FETCH_DOCUMENT_INFOBLOCKS):
        case error(types.FETCH_TERMS_WITH_BLOCKS):
        case error(types.FETCH_INFOBLOCKS_TYPES):
        case error(types.FETCH_EDITOR_INFOBLOCKS): {
            return {
                ...state,
                errMsg: action.payload.response.data,
                errorStatus: action.payload.response.status,
                selectedInfoblockId: false,
                infoblocks: []
            };
        }

        default:
            return state;
    }
};

export default infoblocksReducer;
