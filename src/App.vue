<template>
  <div class="container" ref="root">
    <template v-if="products.length > 0">
      Sorting by:
      <button
        v-for="{ field, name } in columns()"
        :key="field"
        @click="filters.sortBy = field"
        :class="{ 'btn-active': filters.sortBy === field }"
        type="button"
        :value="field"
      >
        {{ name }}
      </button>
      <button @click="deleteChecked">Delete {{ checked.length }}</button>
      <select @change="filters.limit = parseInt($event.target.value)">
        <option value="10">10 Per Page</option>
        <option value="20">30 Per Page</option>
        <option value="50">50 Per Page</option>
        <option value="100">100 Per Page</option>
      </select>
      <button @click="prevPage">&lt;</button
      >{{ filters.page * filters.limit - filters.limit }}-{{
        products.length * filters.page
      }}
      of {{ totalProductsCount }}<button @click="nextPage">&gt;</button>
      <button type="button" @click="selectAllColumns">Select all</button>
      <select multiple @change="selectColumn">
        <option
          v-for="{ name, field } in columns()"
          :key="field"
          :value="field"
          :selected="filters.columns.includes(field)"
        >
          {{ name }}
        </option>
      </select>
      <select @change="filters.sortType = $event.target.value">
        <option value="asc">asc</option>
        <option value="desc">desc</option>
      </select>
    </template>
    <button type="button" @click="getProductsFromServer(true)">
      Reload from server
    </button>
    <button type="button" @click="generateProducts()">
      Generate products
    </button>
    <div v-if="fetchError">
      Error: {{ fetchError }}
      <button type="button" @click="getProductsFromServer(true)">Retry</button>
    </div>
    <table v-if="!fetchError && products.length > 0">
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
      <tr v-for="product in products" :key="product.id">
        <td>
          <input
            type="checkbox"
            @change="checkProduct($event, product.id)"
            :checked="checked.includes(product.id)"
          />
        </td>
        <td v-for="{ field } in filteredColumns">{{ product[field] }}</td>
        <td>
          <a href="javascript:;" @click="deleteProduct(product.id)">Delete</a>
        </td>
      </tr>
    </table>
  </div>
</template>

<script>
import { ref, watch, computed, reactive } from "vue";
import { useStore } from "./store";

export default {
  setup() {
    const checkAllElement = ref(null);
    const fetchError = ref("");
    const store = useStore();
    const totalProducts = ref([]);
    const currentProducts = computed(() => {
      console.time("slice products profile");
      const start = (filters.page - 1) * filters.limit;
      const end = filters.limit + start;
      totalProducts.value = store.getters.getProducts(filters);
      const data = totalProducts.value.slice(start, end);
      console.timeEnd("slice products profile");
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
      filters.columns.forEach((value) => {
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
      limit: 10,
      page: 1,
      columns: Object.keys(columns),
      sortBy: Object.keys(columns)[0],
      sortType: "asc",
    });
    const getProducts = (filters) => {};

    watch(filters, getProducts, { deep: true });
    watch(
      () => filters.page,
      () => {
        checkAllElement.value.checked = false;
      },
      { deep: true }
    );

    getProductsFromServer();

    function getProductsFromServer(force = false) {
      fetchError.value = "";
      store
        .dispatch("getProducts", force)
        .then(() => {
          getProducts(filters);
        })
        .catch((e) => {
          fetchError.value = e.error;
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
      getProductsFromServer,
      fetchError,
      checkAllElement,
      totalProductsCount,
      products: currentProducts,
      filters,
      checked,
      selectColumn(e) {
        e.preventDefault();
        const results = Array.from(e.target.selectedOptions).map(
          (option) => option.value
        );
        filters.columns = results;
      },
      selectAllColumns() {
        filters.columns = Object.keys(columns);
      },
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
        if (filters.page === 1) {
          return;
        }
        filters.page--;
      },
      nextPage() {
        if (filters.limit * filters.page >= totalProducts) {
          return;
        }
        filters.page++;
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
    };
  },
};
</script>

<style scoped>
.container {
  width: 80%;
  margin: 0 auto;
  display: block;
}

.btn-active {
  background: red;
}
</style>
