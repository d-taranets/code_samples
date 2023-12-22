import React, {Component} from "react";
import {Link, withRouter} from "react-router-dom";
import {connect} from "react-redux";
import {
    createAdminInfoblock, editAdminSingleInfoblock, getAdminInfoblocksTypes,
    getAdminSingleInfoblock
} from "../../../store/console/actions";
import Select from 'react-select';
import {fullTextareaConfig} from "../../../configs/froalaConfigs";
import FroalaEditor from 'react-froala-wysiwyg';

class Infoblock extends Component {

    state = {
        id: false,
        type: false,
        title: '',
        content: '',
        isEdit: false
    };

    async componentDidMount() {
        const {match: {params}} = this.props;

        await this.props.getAdminInfoblocksTypes();

        if (params.infoblockId !== undefined) {
            const response = await this.props.getAdminSingleInfoblock(params.infoblockId);
            const type = this.props.availableInfoBlockTypes.find((item) => item.name === response.payload.data.data.type);
            this.setState({isEdit: true, ...response.payload.data.data, type: type !== undefined ? {value: type.id, label: type.name} : false})
        }
    }

    changeValue = (value, field) => {
        this.setState({
            [field]: value
        });
    };

    changeType = (selected, name) => {
        this.setState({
            type: selected
        })
    };

    saveInfoBlock = async (status) => {
        const {match: {params: {infoblockId}}, createAdminInfoblock, editAdminSingleInfoblock} = this.props;
        const {title, content} = this.state;
        const data = {status, title, content};
        data.type = this.state.type !== false && this.state.type !== undefined ? this.state.type.value : false;

        await (infoblockId === undefined ? createAdminInfoblock(data) : editAdminSingleInfoblock(infoblockId, data))
        this.props.history.push('/management-console/infoblocks')
    };

    render() {
        const {title, content, type, isEdit} = this.state;
        const {availableInfoBlockTypes} = this.props;

        return (
            <React.Fragment>
                <div className="container-fluid">
                    <div className="row console-title">
                        <div className="col-xl-6 offset-xl-3 console-title-cell">
                            <div className="console-container col-xl-12">
                                <Link to={'/management-console/infoblocks'} className="back-to-console">
                                    Back to Console
                                </Link>
                                <div>{isEdit ? 'Edit' : 'Add'} Info Block</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="container container-add-set">
                    <div className="row">
                        <div className="col-xl-12">
                            <form className="add-set-form">
                                <div className="row">

                                    <div className="col-xl-12 col-set-form-lp">
                                        <div className="form-group">
                                            <label>Title<span className="input-required">*</span></label>
                                            <input type={"title"}
                                                   value={title}
                                                   onChange={(e) => this.changeValue(e.target.value, 'title')}
                                                   name={"name"}/>
                                        </div>
                                        <div className="form-group">
                                            <label>Content</label>
                                            <FroalaEditor
                                                tag='div'
                                                config={{...fullTextareaConfig, editorClass: 'infoblock-content-editor', height: 250}}
                                                model={content ? content : ''}
                                                onModelChange={(...data) => this.changeValue(data[0], 'content')}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Type</label>
                                            <Select
                                                className="custom-param-data-select"
                                                onChange={this.changeType}
                                                value={type !== false ? type : false}
                                                options={availableInfoBlockTypes.map((item) => ({
                                                    value: item.id,
                                                    label: item.title
                                                }))}
                                                name={'type'}
                                                classNamePrefix="react-select"
                                            />
                                        </div>

                                        <button type="button"
                                                onClick={() => this.saveInfoBlock('publish')}
                                                className="console-button publish-set-button"
                                                disabled={!title}>
                                            Publish
                                        </button>

                                        <button type="button"
                                                onClick={() => this.saveInfoBlock('draft')}
                                                className="console-button publish-set-button"
                                                disabled={!title}>
                                            Draft
                                        </button>
                                    </div>

                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </React.Fragment>
        )
    }
}

const mapStateToProps = (state) => ({
    availableInfoBlockTypes: state.managementConsole.availableInfoBlockTypes,
    singleInfoblock: state.managementConsole.singleInfoblock
});

const mapDispatchToProps = (dispatch) => ({
    getAdminInfoblocksTypes: () => dispatch(getAdminInfoblocksTypes()),
    getAdminSingleInfoblock: (id) => dispatch(getAdminSingleInfoblock(id)),
    createAdminInfoblock: (data) => dispatch(createAdminInfoblock(data)),
    editAdminSingleInfoblock: (id, data) => dispatch(editAdminSingleInfoblock(id, data))
});

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(Infoblock));