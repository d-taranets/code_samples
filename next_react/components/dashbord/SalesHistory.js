import React, {useState, useEffect} from 'react'
import styled from 'styled-components'
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faEye, faQuestionCircle} from "@fortawesome/free-regular-svg-icons";
import {Table} from "react-bootstrap";
import FormButton from "../styled/FormButton";
import ContentPagination from "./ContentPagination";
import FormSelect from "../forms/components/FormSelect";
import {prepareFileFromBlob, useDebounce} from '../../lib/utils';
import Loader from "../Loader";
import {connect} from "react-redux";
import {mainGreen} from "../../constans/componentConstans";
import MarketplaceService from "../../services/MarketplaceService";
import ModalWindow from "../main/ModalWindow";
import PdfViewer from "../main/PdfViewer";
import {ADMIN_ROLE, CUSTOMER_ROLE} from "../../constans/appConstants";
import {faCloudDownloadAlt} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";

const SalesContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0 5%;
  box-sizing: border-box;
`;

const Title = styled.div`
  font-size: 22px;
  padding-bottom: 15px;
`;

const FilterSection = styled.div`
  display: flex;
  flex-direction: row;
  padding-bottom: 15px;
  justify-content: space-between;
`;

const SearchForm = styled.div`
  display: flex;
  align-items: center;
  border: 1px solid #e9eaec;
  border-radius: 5px;
  padding: 3px 3px 3px 10px;
  width: 230px;
  height: 35px;
  background-color:#fff;
  margin-right: 30px;
`;

const SearchInput = styled.input`
  border: 0;
  width: 190px;
  padding: 0 10px;
  &::placeholder {
      color: #b7b8ba;
  }
  &:focus {
    outline: none;
  }
`;

const PrintSummaryWrapper = styled.div`

`;

const PrintSummaryButton = styled(FormButton)`
  width: 120px;
  height: 32px;
  margin-right: 15px;
`;

const ContentSection = styled.div`
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-radius: 5px 5px 0 0;
`;

const SalesTableActions = styled.div`
  display: flex;
  padding: 15px;
`;
const SalesTableHeader = styled.div``;

const SalesTableContent = styled.div`
  font-size: 14px;
  width: 100%;

  tbody > tr > td {
    font-weight: normal;
  }
  
  thead > tr > th {
    padding: 7px .75rem;
    background-color: #f7f8fc;
    font-weight: normal;
    color: #adb1b7;
  }
  .actions-col {
      text-align: center;
  }
  
  .action-read_more {
    width: 3rem;
    color: #b7b8ba; 
    font-size: 28px;
    padding-right: 15px;
    transition: color .2s ease-out;
    &:hover {
      color: ${mainGreen};
      cursor: pointer;
    }
    &.disabled:hover {
      color: #b7b8ba;
    }
  }  
`;

const ThContentWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const ActionButtons = styled.div`
  display: flex;
  justify-content: center;
`;

const PaginationContainer = styled.div`
  padding: 5px 25px;
`;

const SortContainer = styled.div`
  display: inline-flex;
  flex-direction: column;
  padding-left: 6px;
  margin-top: -1px;
`;

const Sort = styled.div`
  width: 5px;
  height: 5px;
  border: 1px solid #adb1b7;
  border-right-color: transparent;
  border-bottom-color: transparent;
  &:hover {
    cursor: pointer;
    border-top-color: #212529;
    border-left-color: #212529;
    transition: border-top-color .2s ease-out, border-left-color .2s ease-out;
  }
`;

const SortAsc = styled(Sort)`
  transform: rotate(45deg);
`;

const SortDesc = styled(Sort)`
  transform: rotate(-135deg);
`;

const OpacityLayer = styled.div`
  display: flex;
  position: absolute;
  z-index: 10;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  justify-content: center;
  align-items: center;
  background: #f2f3f5;
  opacity: .5;
  cursor: wait;
`;

const SalesHistory = (props) => {
  const [loading, setLoading] = useState(true);
  const [sales, updateSales] = useState([]);
  const [filterOptions, setFilterOptions] = useState([]);
  const [pagination, updatePagination] = useState({});
  const [search, setSearch] = useState('');
  const [queryParams, setQueryParams] = useState({});
  const [month, setMonth] = useState({value: ''});
  const [showModal, setShowModal] = useState(false);
  const [orderInfo, setOrderInfo] = useState(null);

  const debouncedSearchTerm = useDebounce(search, 800);

  const fetchSales = async () => {
    setLoading(true);
    const response = await MarketplaceService.fetchSalesHistory({}, {params: queryParams});
    if (response.success) {
      updateSales(response.sales);
      updatePagination(response.pagination);
      setFilterOptions(response.monthHistory);
    }
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      await fetchSales();
    })();
  }, [queryParams]);

  useEffect(
    () => {
      setQueryParams({...queryParams, search: debouncedSearchTerm, page: 1});
    },
    [debouncedSearchTerm]
  );

  const handleFilterChanges = (event) => {
    const value = event.target.value;
    filterOptions.forEach(option => {
      if (option.value === value) {
        setMonth(option);
      }
    });
  };

  const handlePrintSummaryClick = async () => {
    const response = await MarketplaceService.printSummary(month.label);
    if (response.success) {
      const file = prepareFileFromBlob(response.data, `Sales summary for ${month.label}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      const link = document.createElement('a');
      link.href = URL.createObjectURL(file);
      link.download = `Sales summary for ${month.label}.xlsx`;
      link.click();
    }
  };

  const handleSearchChanges = (event) => {
    setSearch(event.target.value);
  };

  const handlePageChanges = (number) => {
    setQueryParams({...queryParams, page: number});
  };

  const handleSort = (field, direction) => {
    setQueryParams({...queryParams, order_field: field, order_direction: direction});
  };

  const handleReceiptRequest = (orderInfo) => {
    setOrderInfo(orderInfo);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setOrderInfo(null);
  };

  const renderSaleItems = () => {
    if ((loading && !sales.length) || (!loading && !sales.length)) {
      return (
        <tr>
          <td colSpan={7} style={{textAlign: 'center'}}>
            <Loader loading={loading} message='No sales history found.'/>
          </td>
        </tr>
      )
    }
    return sales.map(sale => {
      return (
        <tr key={sale.id}>
          <td>{sale.order_id}</td>
          <td>{sale.order_date}</td>
          <td>{props.role === ADMIN_ROLE ? sale.seller_email : sale.customer_email}</td>
          <td>{sale.payout} SEK</td>
          <td className={'actions-col'}>
            <ActionButtons>
              <FontAwesomeIcon
                icon={faEye}
                className={'action-read_more'}
                onClick={() => {handleReceiptRequest({type: 'commission', saleId: sale.id, orderId: sale.order_id, orderDate: sale.order_date})}}
              />
            </ActionButtons>
          </td>
          <td className={'actions-col'}>
            <ActionButtons>
              <FontAwesomeIcon
                icon={faEye}
                className={'action-read_more'}
                onClick={() => {handleReceiptRequest({type: 'receipt', orderId: sale.order_id, orderDate: sale.order_date})}}
              />
            </ActionButtons>
          </td>
          <td className={'actions-col'}>
            <Link href={`/dashboard/orders/delivery?order_id=${sale.order_id}&order_date=${sale.order_date}`}>
              <ActionButtons>
                <FontAwesomeIcon
                  icon={faCloudDownloadAlt}
                  className={'action-read_more'}
                />
              </ActionButtons>
            </Link>
          </td>
        </tr>
      )
    });
  };

  const renderSortContainer = (field) => {
    return (
      <SortContainer>
        <SortAsc onClick={() => {handleSort(field, 'asc')}}/>
        <SortDesc onClick={() => {handleSort(field, 'desc')}}/>
      </SortContainer>
    )
  };

  return (
    <SalesContainer>
      <Title>Sales</Title>
      <FilterSection>
        <SearchForm>
          <FontAwesomeIcon icon={faQuestionCircle} style={{color: '#b7b8ba'}}/>
          <SearchInput
            type='text'
            value={search}
            onChange={handleSearchChanges}
            placeholder='search...'
          />
        </SearchForm>
        <PrintSummaryWrapper>
          <PrintSummaryButton disabled={!month.value} onClick={handlePrintSummaryClick}>Print Summary</PrintSummaryButton>
          <FormSelect
            name='filter'
            value={month.value}
            options={filterOptions}
            usePlaceholder={'Month'}
            handleChanges={handleFilterChanges}
          />
        </PrintSummaryWrapper>
      </FilterSection>
      <ContentSection>
        <SalesTableActions>
          Actions
        </SalesTableActions>
        <SalesTableHeader />
        <SalesTableContent className="position-relative">
          {
            loading && !!sales.length ? (
              <OpacityLayer>
                <Loader loading={true} />
              </OpacityLayer>
            ) : null
          }
          <Table striped hover responsive size="md">
            <thead>
            <tr>
              <th><ThContentWrapper>ORDER ID {renderSortContainer('id')}</ThContentWrapper></th>
              <th><ThContentWrapper>DATE {renderSortContainer('date')}</ThContentWrapper></th>
              <th><ThContentWrapper>EMAIL {renderSortContainer('email')}</ThContentWrapper></th>
              <th><ThContentWrapper>PAYOUT</ThContentWrapper></th>
              <th><ThContentWrapper>COMMISSION RECEIPT</ThContentWrapper></th>
              <th><ThContentWrapper>CUSTOMER RECEIPT</ThContentWrapper></th>
              <th><ThContentWrapper>DOWNLOAD</ThContentWrapper></th>
            </tr>
            </thead>
            <tbody style={{ position: 'relative' }}>
            {renderSaleItems()}
            </tbody>
          </Table>
          <PaginationContainer>
            <ContentPagination pagination={pagination} handleChanges={handlePageChanges}/>
          </PaginationContainer>
        </SalesTableContent>
      </ContentSection>
      {showModal && (<ModalWindow
        closeModal={closeModal}
        content={(<PdfViewer params={orderInfo}/>)}
        color={props.role === CUSTOMER_ROLE ? '#8e949a' : 'inherit'}
        width={'40%'}
      />)
      }
    </SalesContainer>
  )
};

const mapStateToProps = (state) => ({
  role: state.users.user.role
});
const mapDispatchToProps = {};

export default connect(mapStateToProps, mapDispatchToProps)(SalesHistory)
