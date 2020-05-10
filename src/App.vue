<template>
  <div class="container">
    Devtools:
    <button
      class="btn btn_bordered"
      type="button"
      @click="getProductsFromServer(true)"
    >
      Reload from server
    </button>
      <button
        class="btn btn_bordered"
        type="button"
        @click="generateProducts()"
      >
        Generate products
      </button>
      <button
        class="btn btn_bordered"
        type="button"
        @click="generateProductsInWorker()"
      >
        Generate products in Web Worker
      </button>
      <label>
        Use Web Worker:
        <input
          type="radio"
          name="sortType"
          value="0"
          checked
          @click="$event.target.checked ? (sortType = 0) : null"
      /></label>
      <label>
        Use current thread:
        <input
          type="radio"
          name="sortType"
          value="1"
          @click="$event.target.checked ? (sortType = 1) : null"
        />
      </label>
      <br />
      Sorting by:
      <button
        v-for="{ field, name } in columns()"
        :key="field"
        @click="filters.sortBy = field"
        :class="['btn', { btn_active: filters.sortBy === field }]"
        type="button"
        :value="field"
      >
        {{ name }}
      </button>
      <select class="select" @change="filters.sortType = $event.target.value">
        <option value="asc">asc</option>
        <option value="desc">desc</option>
      </select>
      <input class="field" placeholder="Search" @input="filters.search = $event.target.value">
      <button
        v-if="checked.length > 0"
        class="btn btn_green"
        @click="deleteChecked"
      >
        Delete {{ checked.length }}
      </button>
      <select
        class="select"
        @change="tableParams.limit = parseInt($event.target.value)"
      >
        <option value="10">10 Per Page</option>
        <option value="20">30 Per Page</option>
        <option value="50">50 Per Page</option>
        <option value="100">100 Per Page</option>
      </select>
      <button class="btn btn_bordered" @click="prevPage">&lt;</button>
      {{ tableParams.page * tableParams.limit - tableParams.limit }}-
      {{ products.length * tableParams.page }}
      of {{ totalProductsCount }}
      <button class="btn btn_bordered" @click="nextPage">&gt;</button>
      <Select
        :values="columns()"
        :selected="tableParams.columns"
        :disabled="[filters.sortBy]"
        @selected="tableParams.columns = $event"
      />
    <div v-if="fetchError">
      Error: {{ fetchError }}
      <button
        type="button"
        @click="getProductsFromServer(true)"
        class="btn btn_bordered"
      >
        Retry
      </button>
    </div>
    <div v-if="!fetchError && products.length === 0 && loading === ''">
      Products not found
    </div>
    <div v-if="loading !== ''">
      Loading{{loading}}
    </div>
    <table v-if="!fetchError && products.length > 0 && loading === ''">
      <tr>
        <th>
          <input
            name="checkAll"
            ref="checkAllElement"
            type="checkbox"
            @change="toggleChecked"
          />
        </th>
        <th v-for="{ name, field } in filteredColumns" :key="field">
          {{ name }}
        </th>
        <th></th>
      </tr>
      <tr v-for="product in products" :key="product.id" class="product">
        <td>
          <input
            type="checkbox"
            @change="checkProduct($event, product.id)"
            :checked="checked.includes(product.id)"
          />
        </td>
        <td v-for="{ field } in filteredColumns" @click="edit(product, field)">
          {{ product[field] }}
        </td>
        <td>
          <a href="javascript:;" @click="deleteProduct(product.id)">
            Delete #{{ product.id }}
          </a>
        </td>
      </tr>
    </table>
  </div>
</template>

<script>
import { ref, watch, computed, reactive, nextTick } from "vue";
import { useStore } from "./store";
import clone from "clone";
import Select from "./Select.vue";

export default {
  components: {
    Select,
  },
  setup() {
    const sortType = ref(0);
    const loading = ref('');
    const checkAllElement = ref(null);
    const fetchError = ref("");
    const store = useStore();
    const totalProducts = ref([]);
    let loadingInterval;
    const currentProducts = computed(() => {
      console.time("slice products profile");
      const start = (tableParams.page - 1) * tableParams.limit;
      const end = tableParams.limit + start;
      const data = totalProducts.value.slice(start, end);
      console.timeEnd("slice products profile");
      loading.value = '';
      return data;
    });
    const totalProductsCount = computed(() => {
      return totalProducts.value.length;
    });
    const filteredColumns = computed(() => {
      const results = [];
      results.push({
        name: columns[filters.sortBy],
        field: filters.sortBy,
      });
      tableParams.columns.forEach((value) => {
        if (value === filters.sortBy) {
          return;
        }
        const name = columns[value];
        results.push({ name, field: value });
      });
      return results;
    });
    const checked = ref([]);
    const columns = {
      product: "Product",
      calories: "Calories",
      fat: "Fat",
      carbs: "Carbs",
      protein: "Protein",
      iron: "Iron",
    };
    const filters = reactive({
      sortBy: Object.keys(columns)[0],
      sortType: "asc",
      search: ""
    });
    const tableParams = reactive({
      limit: 10,
      page: 1,
      columns: Object.keys(columns),
    });

    function waitRerender() {
      return new Promise((resolve) => {
        nextTick(() => {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(resolve);
          });
        });
      });
    }

    async function getProducts() {
      loading.value = '.';
      loadingInterval = setInterval(() => {
        console.debug('called interval');
        if (loading.value === '') {
          return;
        }
        loading.value += '.';
      }, 500);
      await waitRerender();
      let promise;
      if (sortType.value === 0) {
        promise = store.getters.getSortedProductsFromWorker(filters);
      }
      if (sortType.value === 1) {
        promise = store.getters.getSortedProducts(filters);
      }
      promise.then((data) => {
        totalProducts.value = data;
      });
    }

    watch(() => filters, getProducts, { deep: true });
    watch(
      () => tableParams.page,
      () => {
        checkAllElement.value.checked = false;
      },
      { deep: true }
    );
    watch(() => store.state.products, getProducts, { deep: true });
    watch(loading, value => {
      if (value === '') {
        clearInterval(loadingInterval);
      }
    });

    getProductsFromServer();

    function getProductsFromServer(force = false) {
      fetchError.value = "";
      store.dispatch("getProducts", force).catch((e) => {
        fetchError.value = e.error;
        getProducts();
        console.error(e);
      });
    }

    function deleteProducts(ids) {
      return store
        .dispatch("deleteProducts", ids)
        .then(() => {
          checked.value.length = 0;
        })
        .catch((e) => {
          alert(e.error);
          console.error(e);
          throw e;
        });
    }

    return {
      sortType,
      tableParams,
      getProductsFromServer,
      fetchError,
      checkAllElement,
      totalProductsCount,
      products: currentProducts,
      filters,
      checked,
      loading,
      columns() {
        const results = [];
        Object.entries(columns).forEach((values) => {
          const [field, name] = values;
          results.push({ name, field });
        });
        return results;
      },
      filteredColumns,
      prevPage() {
        if (tableParams.page === 1) {
          return;
        }
        tableParams.page--;
      },
      nextPage() {
        if (tableParams.limit * tableParams.page >= totalProducts) {
          return;
        }
        tableParams.page++;
      },
      checkProduct(e, id) {
        if (e.target.checked) {
          checked.value.push(id);
        }
        if (!e.target.checked) {
          let index = checked.value.indexOf(id);
          checked.value.splice(index, 1);
        }
      },
      deleteChecked() {
        if (checked.value.length === 0) {
          alert("Pick products!");
          return;
        }

        if (
          !confirm(
            `Are you sure you want to delete ${checked.value.length} items?`
          )
        ) {
          return;
        }

        deleteProducts(checked.value).then(() => {
          checked.value.length = 0;
          checkAllElement.value.checked = false;
          alert("Products deleted successfully!");
        });
      },
      deleteProduct(id) {
        if (!confirm("Are you sure you want to delete item?")) {
          return;
        }

        deleteProducts([id]).then(() => {
          alert("Products deleted successfully!");
        });
      },
      toggleChecked(e) {
        if (e.target.checked) {
          const ids = currentProducts.value.map((p) => p.id);
          checked.value = checked.value.concat(ids);
        } else {
          checked.value.length = 0;
        }
      },
      generateProducts() {
        store.dispatch("generateProducts");
      },
      generateProductsInWorker() {
        store.dispatch("generateProductsInWorker");
      },
      edit(product, field) {
        product = clone(product);
        let isNumber = false;
        if (typeof product[field] === "number") {
          isNumber = true;
          product[field] = product[field].toString();
        }
        product[field] = product[field].split("").reverse().join("");
        if (isNumber) {
          product[field] = parseInt(product[field]);
        }
        store
          .dispatch("updateProduct", product)
          .then(() => {
            checked.value.length = 0;
          })
          .catch((e) => {
            alert(e.error);
            console.error(e);
            throw e;
          });
      },
    };
  },
};
</script>

<style scoped>
@import "./style.css";
.container {
  width: 80%;
  margin: 0 auto;
  display: block;
  user-select: none;
}

.btn-active {
  font-weight: bold;
}

.product {
  cursor: pointer;
}

body {
  font-family: Source Sans Pro;
  font-style: normal;
  font-weight: 600;
  font-size: 14px;
}

table {
  width: 100%;
}

table td {
  line-height: 24px;
}
table th {
  line-height: 24px;
  text-align: left;
  color: #282136;
}
</style>
