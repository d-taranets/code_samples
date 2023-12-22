import React, {Component} from "react";
import {connect} from "react-redux";
import {faTrashAlt} from "@fortawesome/free-solid-svg-icons/index";
import {managementConsolePaging} from "../../../configs/config";
import CustomFilterTable from "../../../helpers/CustomFilterTable";
import Paginator from "../../../helpers/Paginator";
import InfoBlockRow from "./InfoBlockRow";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {Link} from "react-router-dom";
import {
    bulkDeleteInfoblocks, bulkEditInfoblocks, deleteAdminInfoblock,
    getAdminInfoblocks
} from "../../../store/console/actions";

class InfoBlocks extends Component {

    state = {
        errors: [],
        searchParams: {
            q: '',
            q_type: '',
            order_by: '',
            order_asc: 'asc',
            page: 1,
            per_page: managementConsolePaging
        },
        selected: []
    };

    _tableColumns = [
        {style: {width: '3%'}, className: 'console-select', checkboxesTitle: true},
        {style: {width: '15%'}, title: 'Code', titleSlug: 'code', className: 'console-infoblock-code', input: {type: 'text', name: 'code'}},
        {style: {width: '9%'}, title: 'Title', titleSlug: 'title', className: 'console-infoblock-title', input: {type: 'text', name: 'title'}},
        {style: {width: '16%'}, title: 'Type', titleSlug: 'type', className: 'console-infoblock-type', input: {type: 'text', name: 'type'}},
        {style: {width: '11%'}, title: 'Content', titleSlug: 'content', className: 'console-infoblock-content', input: {type: 'text', name: 'content'}},
        {style: {width: '11%'}, title: 'Host Template', titleSlug: 'host', className: 'console-infoblock-host', input: {type: 'text', name: 'host'}},
        {style: {width: '11%'}, title: 'Status', titleSlug: 'status', className: 'console-infoblock-status', input: {type: 'text', name: 'status'}},
        {style: {width: '12.5%'}, title: 'Date Created', titleSlug: 'created', className: 'console-infoblock-created', input: {type: 'date', name: 'created'}},
        {style: {width: '12.5%'}, title: 'Date Modified', titleSlug: 'modified', className: 'console-infoblock-modified', input: {type: 'date', name: 'modified'}},
        {style: {width: '12.5%'}, title: 'Modified By', titleSlug: 'modified_by', className: 'console-infoblock-modified_by', input: {type: 'text', name: 'modified_by'}},
        {style: {width: '3%'}, title: '', className: 'console-infoblock-actions'}
    ];

    async componentDidMount() {
        await this.props.getAdminInfoblocks(this.state.searchParams)
    }

    lockUnlockSelectedInfoBlocks = async (lock) => {
        await this.props.bulkEditInfoblocks({
            infoblocks: [...this.state.selected],
            lock
        });
    };

    deleteSelectedInfoBlocks = async () => {
        await this.props.bulkDeleteInfoblocks({infoblocks: [...this.state.selected]});
        this.setState({selected: []})
        await this.props.getAdminInfoblocks(this.state.searchParams)
    };

    _paginatorChangedPage = async (data) => {
        const {searchParams} = this.state;

        searchParams.page = data.selected + 1;
        this.setState({searchParams});

        await this.props.getAdminInfoblocks(searchParams);
    };

    onArrowClick = (order_by, isAsc) => {
        this.setState(({searchParams}) => ({
            searchParams: {
                ...searchParams,
                order_by,
                order_asc: isAsc ? 'asc' : 'desc'
            }
        }), () => {this.props.getAdminInfoblocks(this.state.searchParams)})
    };

    onColumnFiltersChanges = (filters) => {
        this.setState(({searchParams}) => ({
            searchParams: {
                ...searchParams,
                q_type: filters.type,
                q: filters.value

            }
        }), () => {this.props.getAdminInfoblocks(this.state.searchParams)})
    };

    deleteAction = async (item) => {
        await this.props.deleteAdminInfoblock(item.id)
        await this.props.getAdminInfoblocks(this.state.searchParams)
    };

    render() {
        const {infoblocks} = this.props;

        const _tableFooterColumns = [{
            colspan: this._tableColumns.length,
            component: <Paginator
                pageCount={this.props.totalInfoblocks / this.state.searchParams.per_page}
                pageChanged={this._paginatorChangedPage}
                forcePage={this.state.searchParams.page - 1}
                className={"console-paginator"}
            />
        }];

        return (
            <div className="console-container-full console-terms-container">
                <div className="console-header row no-gutters">
                    <div className="console-header-lp" />
                    <div className="console-header-actions-line">
                        <div className="console-header-selected">
                            <span className="selected-rows">{this.state.selected.length} Selected</span>
                            <span className="delete-selected" onClick={() => this.lockUnlockSelectedInfoBlocks(true)}>
                                <FontAwesomeIcon icon={faTrashAlt} className={'lock-link'} /> lock
                            </span>
                            <span className="delete-selected" onClick={() => this.lockUnlockSelectedInfoBlocks(false)}>
                                <FontAwesomeIcon icon={faTrashAlt} className={'unlock-link'} /> unlock
                            </span>
                            <span className="delete-selected" onClick={this.deleteSelectedInfoBlocks}>
                                <FontAwesomeIcon icon={faTrashAlt} className={'delete-link'} /> delete
                            </span>
                        </div>
                        <div>
                            <button className="console-button">
                                <Link to={'/management-console/infoblocks/add'}>Add Info Block</Link>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="console-body">
                    <CustomFilterTable
                        className={"console-table"}
                        columns={this._tableColumns}
                        footer={_tableFooterColumns}
                        items={infoblocks}
                        onArrowClick={this.onArrowClick}
                        onFiltersChange={this.onColumnFiltersChanges}
                        deleteAction={this.deleteAction}
                        onChangeSelect={(selected) => this.setState({selected})}
                    >
                        <InfoBlockRow/>
                    </CustomFilterTable>
                </div>
            </div>
        )
    }
}


const mapStateToProps = (state) => ({
    infoblocks: state.managementConsole.infoblocks,
    totalInfoblocks: state.managementConsole.totalInfoblocks
});

const mapDispatchToProps = (dispatch) => ({
    getAdminInfoblocks: (data) => dispatch(getAdminInfoblocks(data)),
    deleteAdminInfoblock: (id) => dispatch(deleteAdminInfoblock(id)),
    bulkEditInfoblocks: (data) => dispatch(bulkEditInfoblocks(data)),
    bulkDeleteInfoblocks: (data) => dispatch(bulkDeleteInfoblocks(data))
});

export default connect(mapStateToProps, mapDispatchToProps)(InfoBlocks);
