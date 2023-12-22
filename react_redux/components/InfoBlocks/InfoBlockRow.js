import React, {Component} from "react";
import {Link} from "react-router-dom";
import moment from "moment";
import StyledCheckbox from "../../../helpers/StyledCheckbox";
import {withRouter} from "react-router";
import ActionsWrapper from "../../../helpers/ActionsWrapper";

class InfoBlockRow extends Component {
    state = {
        showDeleteAction: false
    };

    setDeleteAction = (showDeleteAction) => {
        this.setState({
            showDeleteAction
        })
    };

    deleteTerm = (e, item) => {
        e.preventDefault();
        e.stopPropagation();

        this.setDeleteAction(false);
        this.props.props.deleteAction(item);
    };

    editTerm = (item) => {
        this.props.history.push(`/management-console/infoblocks/${item.id}`);
    };

    render() {
        const {showDeleteAction} = this.state;
        const {props: {columns, toggleSelect}, item} = this.props;

        return (
            <tr className={item.status === 'Draft' ? 'drafted-item' : undefined}>
                <td className={columns[0].className + '-td'}>
                    <StyledCheckbox checked={item.checked} changeSelect={() => toggleSelect(item.id)}/>
                </td>
                <td className={columns[1].className + '-td'}>
                    <Link to={'/management-console/infoblocks/' + item.id}
                          dangerouslySetInnerHTML={{__html: item.code !== '' ? item.code : ''}} />
                </td>
                <td className={columns[2].className + '-td'}>{item.title}</td>
                <td className={columns[3].className + '-td'}>{item.type}</td>
                <td className={columns[4].className + '-td'}><div dangerouslySetInnerHTML={{__html: item.content.substring(0, 50)}} /></td>
                <td className={columns[5].className + '-td'}>
                    {item.host_template && item.host_template.length !== 0 && item.host_template.map((template, index) => (
                        <span key={index}>
                            <Link to={'/management-console/templates/' + template.id}>{template.title}</Link>&nbsp;
                        </span>
                    ))}
                </td>
                <td className={columns[6].className + '-td'}>{item.status}{item.is_orphaned ? ' Orphaned' : ''}</td>
                <td className={columns[7].className + '-td'}>{item.created && moment(item.created).format('LL')}</td>
                <td className={columns[8].className + '-td'}>{item.modified && moment(item.modified).format('LL')}</td>
                <td className={columns[9].className + '-td'}>{item.modified_by}</td>
                <td className={columns[10].className + '-td console-delete-action-td'}>
                    <ActionsWrapper show={showDeleteAction}
                                    onClickOutside={() => this.setDeleteAction(false)}
                                    onClosedClick={() => this.setDeleteAction(true)}>
                        <div className={"delete-item-action"}>
                            <div onClick={(e) => this.deleteTerm(e, item)}>Delete</div>
                            <div onClick={(e) => this.editTerm(item)}>Edit</div>
                        </div>
                    </ActionsWrapper>
                </td>
            </tr>
        )
    }
}

export default withRouter(InfoBlockRow);