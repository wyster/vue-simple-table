import { createStore } from "vuex";
import { getProducts, deleteProducts } from "./request";
import { sort } from "./sort";
import sortWorker from "workerize-loader?inline!./sort";
import { generateNewProducts } from "./generator";
import generatorWorker from "workerize-loader?inline!./generator";

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
        console.time("delete products profile");
        ids.forEach((id) => {
          const index = state.products.findIndex((p) => {
            return p.id === id;
          });
          state.products.splice(index, 1);
        });
        console.timeEnd("delete products profile");
      });
    },
    generateProducts({ state, commit }) {
      console.time("generate products");
      commit("setProducts", generateNewProducts(copy(state.products)));
      console.timeEnd("generate products");
    },
    generateProductsInWorker({ state, commit }) {
      console.time("generate products with worker");
      generatorWorker()
        .generateNewProducts(copy(state.products))
        .then((data) => {
          commit("setProducts", data);
          console.timeEnd("generate products with worker");
        });
    },
  },
  getters: {
    getSortedProducts: (state) => ({ sortBy, sortType }) => {
      console.debug("getSortedProducts getter", { sortBy, sortType });
      console.time("filter products profile");
      const results = sort(copy(state.products), { sortBy, sortType });
      console.timeEnd("filter products profile");
      return Promise.resolve(results);
    },
    getSortedProductsFromWorker: (state) => ({ sortBy, sortType }) => {
      return new Promise((resolve) => {
        console.debug("getSortedProductsFromWorker getter", {
          sortBy,
          sortType,
        });
        console.time("filter products profile from worker");
        sortWorker()
          .sort(JSON.stringify(state.products), {
            sortBy,
            sortType,
          })
          .then((data) => {
            console.timeEnd("filter products profile from worker");
            resolve(data);
          });
      });
    },
  },
});

export function useStore() {
  return store;
}

function copy(o) {
  return JSON.parse(JSON.stringify(o));
}
