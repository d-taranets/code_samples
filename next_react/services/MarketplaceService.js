import API from 'axios';
import formatErrorMessage from "../transformers/errors/formatErrorMessage";
import {getAxiosConfig} from "../lib/auth";
import {ordersResponseTransformer} from "../transformers/ordersResponseTransformer";
import {cartItemsResponseTransformer} from "../transformers/cartItemsResponseTransformer";
import {prepareUrlParams} from "../lib/utils";
import {salesHistoryResponseTransformer} from "../transformers/salesHistoryResponseTransformer";

const transformCartItemsResponse = ({ data }) => {
  return {
    success: true,
    products: cartItemsResponseTransformer(data.data),
  }
};

const transformOrdersResponse = ({ data }) => {
  return {
    success: true,
    orders: ordersResponseTransformer(data.data),
    pagination: data.meta.pagination
  }
};

const transformSalesHistoryResponse = ({ data }) => {
  return {
    success: true,
    sales: salesHistoryResponseTransformer(data.data),
    monthHistory: data.meta.month_history,
    pagination: data.meta.pagination
  }
};

const transformResponseWithMessage = ({data}) => {
  return {
    success: true,
    message: data.message
  }
};

const transformManualPayoutsResponse = ({data}) => {
  return {
    success: true,
    payouts: data.data,
    pagination: data.meta.pagination
  }
};

const MarketplaceService = {
  async fetchOrders(ctx, options) {
    const config = await getAxiosConfig({});
    const requestUrl = prepareUrlParams(`/orders`, options);
    return API.get(requestUrl, config)
      .then(transformOrdersResponse)
      .catch(formatErrorMessage)
  },

  async getReceiptPdf(order_id) {
    const config = await getAxiosConfig({});
    config.responseType = "blob";
    return API.get(`/receipt-pdf/${order_id}`, config)
      .then(response => {
        return {success: true, data: response.data};
      })
      .catch(formatErrorMessage)
  },

  async getCommissionReceiptPdf(sale_id) {
    const config = await getAxiosConfig({});
    config.responseType = "blob";
    return API.get(`sales/commission-pdf/${sale_id}`, config)
      .then(response => {
        return {success: true, data: response.data};
      })
      .catch(formatErrorMessage)
  },


  async fetchSalesHistory(ctx, options) {
    const config = await getAxiosConfig({});
    const requestUrl = prepareUrlParams(`/sales`, options);
    return API.get(requestUrl, config)
      .then(transformSalesHistoryResponse)
      .catch(formatErrorMessage)
  },

  async printSummary(month) {
    const config = await getAxiosConfig({});
    config.responseType = "blob";
    return API.get(`/sales/export?month=${month}`, config)
      .then(response => {
        return {success: true, data: response.data};
      })
      .catch(formatErrorMessage)
  },

  async fetchCartItems(ctx) {
    const config = await getAxiosConfig({});
    return API.get('/cart-items', config)
      .then(transformCartItemsResponse)
      .catch(formatErrorMessage)
  },

  async addItemToCart(item) {
    const config = await getAxiosConfig({});
    const params = {
      item_id: item.id
    };
    return API.post('/cart-items/add', params, config)
      .then(transformResponseWithMessage)
      .catch(formatErrorMessage)
  },

  async updateItemInCart(item, size) {
    const config = await getAxiosConfig({});
    const params = {
      item_id: item.id,
      size
    };
    return API.patch('/cart-items/update', params, config)
      .then(transformResponseWithMessage)
      .catch(formatErrorMessage)
  },

  async removeItemFromCart(itemId) {
    const config = await getAxiosConfig({});
    return API.delete(`/cart-items/remove/${itemId}`, config)
      .then(transformResponseWithMessage)
      .catch(formatErrorMessage)
  },

  async getManualPayouts(ctx, options) {
    const config = await getAxiosConfig({ctx});
    const requestUrl = prepareUrlParams(`/sales/manual-payouts`, options);
    return API.get(requestUrl, config)
      .then(transformManualPayoutsResponse)
      .catch(formatErrorMessage)
  },

  async setSuccess(payout_id) {
    const config = await getAxiosConfig({});
    return API.patch(`/sales/manual-payouts/${payout_id}/set-success`, {}, config)
      .then((response) => ({success: true, status: 'success'}))
      .catch(formatErrorMessage)
  },

  async setPending(payout_id) {
    const config = await getAxiosConfig({});
    return API.patch(`/sales/manual-payouts/${payout_id}/set-pending`, {}, config)
      .then((response) => ({success: true, status: 'pending'}))
      .catch(formatErrorMessage)
  },
};
export default MarketplaceService
