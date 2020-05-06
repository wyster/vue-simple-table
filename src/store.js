import { createStore } from "vuex";
import { getProducts, deleteProducts } from "./request";

const store = createStore({
  state() {
    return {
      products: [],
    };
  },
  mutations: {
    setProducts(state, data) {
      state.products = data;
    },
  },
  actions: {
    async getProducts({ state, commit }, force = false) {
      console.debug("getProducts action, force:", force ? 1 : 0);

      if (state.products.length === 0 || force) {
        let products = await getProducts();
        commit("setProducts", products);
        return Promise.resolve(products);
      }

      return Promise.resolve(state.products);
    },
    async deleteProducts({ state, commit }, ids) {
      console.debug("deleteProducts action", ids);
      return deleteProducts(ids).then(() => {
        ids.forEach((id) => {
          const index = state.products.findIndex((p) => {
            return p.id === id;
          });
          state.products.splice(index, 1);
        });
      });
    },
    async generateProducts({ state, commit }, iterations = 1) {
      console.time("generate products");
      let products = [];
      let tmp = copy(state.products);
      for (let i = 0; i < iterations; i++) {
        tmp = tmp.map((item) => {
          item.id = item.id + tmp.length;
          return item;
        });
        products = state.products.concat(tmp);
      }
      commit("setProducts", products);
      console.timeEnd("generate products");
    },
  },
  getters: {
    getProducts: (state) => ({ limit, sortBy, sortType }) => {
      console.debug("getProducts getter", { limit, sortBy, sortType });
      if (state.products.length === 0) {
        return state.products;
      }
      console.time("filter products profile");
      const fieldType = typeof state.products[0][sortBy];
      if (fieldType === "string") {
        state.products.sort((a, b) => {
          return a[sortBy].localeCompare(b[sortBy]);
        });
        if (sortType === "desc") {
          state.products.reverse();
        }
      }
      if (fieldType === "number") {
        state.products.sort((a, b) => {
          if (a[sortBy] > b[sortBy]) {
            return sortType === "asc" ? 1 : -1;
          }
          if (a[sortBy] < b[sortBy]) {
            return sortType === "asc" ? -1 : 1;
          }
          return 0;
        });
      }
      console.timeEnd("filter products profile");
      return state.products;
    },
  },
});

export function useStore() {
  return store;
}

function copy(o) {
  var output, v, key;
  output = Array.isArray(o) ? [] : {};
  for (key in o) {
    v = o[key];
    output[key] = typeof v === "object" ? copy(v) : v;
  }
  return output;
}
