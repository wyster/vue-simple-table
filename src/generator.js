import clone from "clone";

export function generateNewProducts(products) {
  let i = 0;
  let newProducts = products;
  while (i < 10) {
    i++;
    newProducts = newProducts.concat(
      newProducts.slice(0, 1000).map((item) => {
        item = clone(item);
        item.id = item.id + newProducts.length;
        return item;
      })
    );
  }
  return newProducts;
}
