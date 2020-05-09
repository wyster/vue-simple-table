<template>
  <div class="select-container">
    <button class="btn btn_bordered" @click="toggle">
      {{ selected.length }} columns selected
    </button>
    <div class="dropdown" v-if="isOpened">
      <label class="dropdown__item" v-if="selected.length < values.length">
        <input type="checkbox" @change="selectAll" />
        Select all
      </label>
      <label class="dropdown__item" v-for="{ field, name } in values">
        <input
          type="checkbox"
          :value="field"
          @change="change"
          :checked="selected.indexOf(field) >= 0"
          :disabled="disabled.indexOf(field) >= 0"
        />
        {{ name }}
      </label>
    </div>
  </div>
</template>

<script>
import { ref, reactive, watch, toRaw } from "vue";

export default {
  props: {
    values: {
      type: Array,
      required: true,
    },
    selected: Array,
    disabled: Array,
  },
  setup(props) {
    const isOpened = ref(false);
    const selected = reactive(props.selected || []);
    const values = reactive(props.values);
    const disabled = reactive(props.disabled || []);

    return {
      isOpened,
      selected,
      disabled,
      values,
      change(e) {
        let index = selected.indexOf(e.target.value);
        if (e.target.checked && index === -1) {
          selected.push(e.target.value);
        }
        if (!e.target.checked) {
          selected.splice(index, 1);
        }
      },
      toggle() {
        isOpened.value = !isOpened.value;
      },
      selectAll() {
        selected.length = 0;
        selected.splice(0, 0, ...values.map((item) => item.field));
      },
    };
  },
};
</script>

<style scoped>
@import "./style.css";
.select-container {
  position: relative;
  display: inline-block;
}
.dropdown {
  position: absolute;
  background: #ffffff;
  box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.16);
  border-radius: 4px;
  left: 0;
  top: 30px;
  z-index: 100;
  padding: 10px 15px;
}

.dropdown__item {
  display: block;
}
</style>
