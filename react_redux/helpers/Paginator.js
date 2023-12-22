import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import ReactPaginate from 'react-paginate';
import { faAngleLeft, faAngleRight } from '@fortawesome/free-solid-svg-icons'


const Paginator = (props) => (
    <ReactPaginate
        pageCount={props.pageCount ? props.pageCount : 1}
        initialPage={props.initialPage ? props.initialPage : 0}
        forcePage={props.forcePage ? props.forcePage : 0}
        pageRangeDisplayed={props.pageRangeDisplayed ? props.pageRangeDisplayed : 5}
        marginPagesDisplayed={props.marginPagesDisplayed ? props.marginPagesDisplayed : 1}
        onPageChange={(data) => props.pageChanged(data)}
        containerClassName={props.className}
        previousLabel={<FontAwesomeIcon icon={faAngleLeft} className={'paginator-prev'} />}
        nextLabel={<FontAwesomeIcon icon={faAngleRight} className={'paginator-next'} />}
    />
);

export default Paginator;